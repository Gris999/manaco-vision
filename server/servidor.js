// @ts-check
/* Servidor de Manaco Vision: API REST + SQLite + login por rol + sincronización por acciones.
   Sin dependencias externas: node:http, node:sqlite (Node ≥ 22.5) y node:crypto.
   La lógica de negocio NO se reescribe aquí: se reutiliza js/acciones.js y js/dominio.js (las mismas reglas que el celular).

   Uso:  node server/servidor.js            (PUERTO=8787, BD=server/datos/manaco.db)
   Variables: PUERTO, BD, SECRETO_JWT, CORS_ORIGENES (coma), ZONA (America/La_Paz) */
"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");
const D = require("../js/dominio.js");
const A = require("../js/acciones.js");

const RAIZ = path.resolve(__dirname, "..");
const CONF = {
  puerto: Number(process.env.PUERTO || process.env.PORT || 8787),
  bd: process.env.BD || path.join(__dirname, "datos", "manaco.db"),
  cors: (process.env.CORS_ORIGENES || "*").split(",").map(s => s.trim()),
  zona: process.env.ZONA || "America/La_Paz",
  horasToken: 12,
};

/* ---------- Fecha local de la tienda (no la del servidor) ---------- */
const hoyLocal = () => new Intl.DateTimeFormat("en-CA", { timeZone: CONF.zona, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

/* ---------- Base de datos ---------- */
fs.mkdirSync(path.dirname(CONF.bd), { recursive: true });
const db = new DatabaseSync(CONF.bd);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS config   (clave TEXT PRIMARY KEY, valor TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS usuarios (usuario TEXT PRIMARY KEY, nombre TEXT NOT NULL, rol TEXT NOT NULL CHECK (rol IN ('vendedor','encargado','gerente')),
                                       tienda TEXT, sal TEXT NOT NULL, hash TEXT NOT NULL, activo INTEGER NOT NULL DEFAULT 1);
  CREATE TABLE IF NOT EXISTS acciones (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, tipo TEXT NOT NULL, usuario TEXT NOT NULL,
                                       rol TEXT NOT NULL, tienda TEXT, fecha TEXT NOT NULL, hora TEXT, datos TEXT NOT NULL, recibida TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS rechazos (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT, usuario TEXT, tipo TEXT, error TEXT, recibida TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS instantanea (n INTEGER PRIMARY KEY CHECK (n = 1), rev INTEGER NOT NULL, estado TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS ix_acciones_tienda ON acciones (tienda, fecha);
`);
const cfg = {
  leer: k => /** @type {any} */ (db.prepare("SELECT valor FROM config WHERE clave = ?").get(k))?.valor,
  fijar: (k, v) => db.prepare("INSERT INTO config (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor").run(k, v),
};
const SECRETO = process.env.SECRETO_JWT || cfg.leer("secreto") || (() => { const s = crypto.randomBytes(32).toString("hex"); cfg.fijar("secreto", s); return s; })();

/* ---------- Contraseñas (scrypt) ---------- */
const hashClave = (clave, sal) => crypto.scryptSync(clave, sal, 64).toString("hex");
function sembrarUsuarios() {
  const n = /** @type {any} */ (db.prepare("SELECT COUNT(*) AS n FROM usuarios").get()).n;
  if (n) return;
  const { usuarios } = JSON.parse(fs.readFileSync(path.join(__dirname, "usuarios.semilla.json"), "utf8"));
  const ins = db.prepare("INSERT INTO usuarios (usuario, nombre, rol, tienda, sal, hash) VALUES (?, ?, ?, ?, ?, ?)");
  for (const u of usuarios) { const sal = crypto.randomBytes(16).toString("hex"); ins.run(u.usuario, u.nombre, u.rol, u.tienda, sal, hashClave(u.clave, sal)); }
  console.log(`Usuarios de demostración creados: ${usuarios.length}`);
}

/* ---------- Token firmado (formato JWT HS256) ---------- */
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64url");
const firmar = s => crypto.createHmac("sha256", SECRETO).update(s).digest("base64url");
function emitirToken(u) {
  const cuerpo = b64({ alg: "HS256", typ: "JWT" }) + "." + b64({ sub: u.usuario, rol: u.rol, tienda: u.tienda, exp: Math.floor(Date.now() / 1000) + CONF.horasToken * 3600 });
  return cuerpo + "." + firmar(cuerpo);
}
function verificarToken(t) {
  const [h, p, f] = String(t || "").split(".");
  if (!h || !p || !f) return null;
  const esperada = Buffer.from(firmar(h + "." + p)), recibida = Buffer.from(f);
  if (esperada.length !== recibida.length || !crypto.timingSafeEqual(esperada, recibida)) return null;
  const datos = JSON.parse(Buffer.from(p, "base64url").toString());
  if (datos.exp < Date.now() / 1000) return null;
  const u = /** @type {any} */ (db.prepare("SELECT usuario, nombre, rol, tienda, activo FROM usuarios WHERE usuario = ?").get(datos.sub));
  return u?.activo ? u : null; // el rol y la tienda salen de la BD, no del token
}

/* ---------- Estado del negocio (instantánea + registro de acciones) ---------- */
const CAT = A.prepararCatalogo(JSON.parse(fs.readFileSync(path.join(RAIZ, "catalogo.json"), "utf8")));
const IDX = Object.fromEntries(CAT.map(c => [c.id, c]));
const CTX = { modelo: id => IDX[id], ids: CAT.map(c => c.id), tiendas: A.TIENDAS };
let S, REV;
function cargarEstado() {
  const fila = /** @type {any} */ (db.prepare("SELECT rev, estado FROM instantanea WHERE n = 1").get());
  if (fila) { S = JSON.parse(fila.estado); REV = fila.rev; return; }
  S = A.estadoInicial(CAT, A.TIENDAS, hoyLocal()); REV = 0; guardarEstado();
}
const guardarEstado = () => db.prepare("INSERT INTO instantanea (n, rev, estado) VALUES (1, ?, ?) ON CONFLICT(n) DO UPDATE SET rev = excluded.rev, estado = excluded.estado").run(REV, JSON.stringify(S));
let estadoJSON = null; // caché de la respuesta, se invalida con cada cambio

/** Aplica un lote de acciones de un usuario. El servidor impone rol, usuario y tienda desde la BD. */
function procesarLote(u, lote) {
  const aplicadas = [], rechazadas = [];
  const insAcc = db.prepare("INSERT INTO acciones (id, tipo, usuario, rol, tienda, fecha, hora, datos, recibida) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const insRech = db.prepare("INSERT INTO rechazos (id, usuario, tipo, error, recibida) VALUES (?, ?, ?, ?, ?)");
  const ahora = new Date().toISOString(), hoy = hoyLocal();
  for (const bruta of lote.slice(0, 200)) {
    const a = {
      id: String(bruta.id || "").slice(0, 64), tipo: String(bruta.tipo || ""), datos: bruta.datos ?? {},
      fecha: /^\d{4}-\d{2}-\d{2}$/.test(bruta.fecha) && bruta.fecha <= D.sumarDias(hoy, 1) ? bruta.fecha : hoy,
      hora: /^\d{2}:\d{2}$/.test(bruta.hora) ? bruta.hora : new Date().toTimeString().slice(0, 5),
      ts: Number(bruta.ts) || Date.now(),
      rol: u.rol, usuario: u.usuario,                                      // NUNCA lo que diga el cliente
      tienda: u.tienda ?? String(bruta.tienda || ""),                       // vendedor/encargado: siempre su tienda
    };
    if (!a.id) { rechazadas.push({ id: null, error: "Acción sin id" }); continue; }
    try {
      const copia = structuredClone(S);                                    // atomicidad: si falla, el estado no cambia
      const r = A.aplicar(copia, a, CTX);
      if (!r.repetida) {
        S = copia; REV++;
        insAcc.run(a.id, a.tipo, a.usuario, a.rol, a.tienda, a.fecha, a.hora, JSON.stringify(a.datos), ahora);
      }
      aplicadas.push(a.id);
    } catch (e) {
      rechazadas.push({ id: a.id, error: e.message });
      insRech.run(a.id, u.usuario, a.tipo, e.message, ahora);
    }
  }
  if (aplicadas.length) { guardarEstado(); estadoJSON = null; }
  return { aplicadas, rechazadas, rev: REV };
}

/* ---------- Límite de intentos de login (fuerza bruta) ---------- */
const intentos = new Map();
function permitirLogin(ip) {
  const ahora = Date.now(), v = (intentos.get(ip) || []).filter(t => ahora - t < 5 * 60e3);
  intentos.set(ip, v); return v.length < 10;
}

/* ---------- HTTP ---------- */
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".css": "text/css", ".png": "image/png",
  ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".bin": "application/octet-stream", ".webmanifest": "application/manifest+json", ".ico": "image/x-icon" };
const PRIVADO = /^\/(server|tests|docs|herramientas|node_modules|package(-lock)?\.json|tsconfig\.json|\.)/; // nunca se sirven

function cabecerasCors(req, res) {
  const o = req.headers.origin;
  if (o && (CONF.cors.includes("*") || CONF.cors.includes(o))) {
    res.setHeader("Access-Control-Allow-Origin", o); res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization"); res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  }
}
function json(res, codigo, obj) {
  const cuerpo = typeof obj === "string" ? obj : JSON.stringify(obj);
  res.writeHead(codigo, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  res.end(cuerpo);
}
function leerCuerpo(req, max = 2e6) {
  return new Promise((ok, mal) => {
    let n = 0; const partes = [];
    req.on("data", c => { n += c.length; if (n > max) { mal(Object.assign(new Error("Cuerpo demasiado grande"), { codigo: 413 })); req.destroy(); } else partes.push(c); });
    req.on("end", () => { try { ok(partes.length ? JSON.parse(Buffer.concat(partes).toString()) : {}); } catch { mal(Object.assign(new Error("JSON inválido"), { codigo: 400 })); } });
  });
}
const autenticar = req => verificarToken((req.headers.authorization || "").replace(/^Bearer\s+/i, ""));

const RUTAS = {
  "GET /api/salud": () => [200, { ok: true, rev: REV, version: "1.0.0", hoy: hoyLocal() }],
  "POST /api/login": async (req) => {
    const ip = req.socket.remoteAddress || "?";
    if (!permitirLogin(ip)) return [429, { error: "Demasiados intentos. Espera 5 minutos." }];
    const { usuario, clave } = await leerCuerpo(req, 4096);
    const u = /** @type {any} */ (db.prepare("SELECT * FROM usuarios WHERE usuario = ? AND activo = 1").get(String(usuario || "").toLowerCase()));
    const ok = u && crypto.timingSafeEqual(Buffer.from(u.hash, "hex"), Buffer.from(hashClave(String(clave || ""), u.sal), "hex"));
    intentos.get(ip)?.push(Date.now());
    if (!ok) return [401, { error: "Usuario o contraseña incorrectos" }];
    return [200, { token: emitirToken(u), usuario: { usuario: u.usuario, nombre: u.nombre, rol: u.rol, tienda: u.tienda } }];
  },
  "GET /api/yo": (req, u) => [200, { usuario: u }],
  "GET /api/estado": (req, u, url) => {
    if (Number(url.searchParams.get("rev")) === REV) return [200, { sinCambios: true, rev: REV }];
    estadoJSON ??= JSON.stringify({ rev: REV, estado: S });
    return [200, estadoJSON];
  },
  "POST /api/acciones": async (req, u) => {
    const { acciones } = await leerCuerpo(req);
    if (!Array.isArray(acciones)) return [400, { error: "Se esperaba { acciones: [...] }" }];
    return [200, procesarLote(u, acciones)];
  },
  "GET /api/acciones": (req, u, url) => { // auditoría: quién hizo qué (solo gerente)
    if (u.rol !== "gerente") return [403, { error: "Solo Gerencia" }];
    const lim = Math.min(500, Number(url.searchParams.get("limite")) || 100);
    return [200, { acciones: db.prepare("SELECT seq, tipo, usuario, rol, tienda, fecha, hora, datos, recibida FROM acciones ORDER BY seq DESC LIMIT ?").all(lim),
      rechazos: db.prepare("SELECT * FROM rechazos ORDER BY seq DESC LIMIT 50").all() }];
  },
  "POST /api/reiniciar": (req, u) => {
    if (u.rol !== "gerente") return [403, { error: "Solo Gerencia" }];
    db.exec("DELETE FROM acciones; DELETE FROM rechazos;");
    S = A.estadoInicial(CAT, A.TIENDAS, hoyLocal()); REV++; guardarEstado(); estadoJSON = null;
    return [200, { ok: true, rev: REV }];
  },
};
const PUBLICAS = new Set(["GET /api/salud", "POST /api/login"]);

function servirArchivo(req, res, url) {
  let ruta = decodeURIComponent(url.pathname);
  if (PRIVADO.test(ruta)) return json(res, 404, { error: "No encontrado" });
  if (ruta.endsWith("/")) ruta += "index.html";
  const abs = path.join(RAIZ, path.normalize(ruta));
  if (!abs.startsWith(RAIZ + path.sep)) return json(res, 403, { error: "Prohibido" }); // path traversal
  fs.stat(abs, (err, st) => {
    if (err || !st.isFile()) return json(res, 404, { error: "No encontrado" });
    res.writeHead(200, { "Content-Type": TIPOS[path.extname(abs)] || "application/octet-stream", "Content-Length": st.size, "X-Content-Type-Options": "nosniff",
      "Cache-Control": /\.(html|js|json)$/.test(abs) ? "no-cache" : "public, max-age=86400" });
    fs.createReadStream(abs).pipe(res);
  });
}

function crearServidor() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", "http://x");
    cabecerasCors(req, res);
    if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
    if (!url.pathname.startsWith("/api/")) return servirArchivo(req, res, url);
    const clave = `${req.method} ${url.pathname}`, fn = RUTAS[clave];
    if (!fn) return json(res, 404, { error: "Ruta no encontrada" });
    try {
      let u = null;
      if (!PUBLICAS.has(clave)) { u = autenticar(req); if (!u) return json(res, 401, { error: "Inicia sesión" }); }
      const [codigo, cuerpo] = await fn(req, u, url);
      json(res, codigo, cuerpo);
    } catch (e) {
      const codigo = e.codigo || 500; if (codigo === 500) console.error(e);
      json(res, codigo, { error: codigo === 500 ? "Error interno" : e.message });
    }
  });
}

sembrarUsuarios(); cargarEstado();
if (require.main === module) {
  crearServidor().listen(CONF.puerto, () => console.log(`Manaco Vision API en http://localhost:${CONF.puerto}  (BD: ${path.relative(RAIZ, CONF.bd)}, rev ${REV})`));
}
module.exports = { crearServidor, procesarLote, get estado() { return S; } };
