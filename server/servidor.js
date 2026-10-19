// @ts-check
/* Servidor de Manaco Vision: API REST + login por rol + sincronización por acciones.
   Persistencia intercambiable (server/almacen.js): PostgreSQL si hay DATABASE_URL, si no SQLite local.
   La lógica de negocio NO se reescribe aquí: se reutiliza js/acciones.js y js/dominio.js (las mismas reglas que el celular).

   Uso:  node server/servidor.js
   Variables: PUERTO|PORT (8787), DATABASE_URL (PostgreSQL), BD (archivo SQLite), SECRETO_JWT, CORS_ORIGENES (coma), ZONA */
"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const D = require("../js/dominio.js");
const A = require("../js/acciones.js");
const { abrirAlmacen, ConflictoRev } = require("./almacen.js");

const RAIZ = path.resolve(__dirname, "..");
const CONF = {
  puerto: Number(process.env.PUERTO || process.env.PORT || 8787),
  bdUrl: process.env.DATABASE_URL || "",
  bd: process.env.BD || path.join(__dirname, "datos", "manaco.db"),
  cors: (process.env.CORS_ORIGENES || "*").split(",").map(s => s.trim()),
  zona: process.env.ZONA || "America/La_Paz",
  horasToken: 12,
};

/* ---------- Fecha local de la tienda (no la del servidor) ---------- */
const hoyLocal = () => new Intl.DateTimeFormat("en-CA", { timeZone: CONF.zona, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

/** @type {any} */ let BD;          // repositorio (SQLite o PostgreSQL)
let SECRETO = "";

/* ---------- Contraseñas (scrypt) ---------- */
const hashClave = (clave, sal) => crypto.scryptSync(clave, sal, 64).toString("hex");
async function sembrarUsuarios() {
  if (await BD.contarUsuarios()) return;
  const { usuarios } = JSON.parse(fs.readFileSync(path.join(__dirname, "usuarios.semilla.json"), "utf8"));
  for (const u of usuarios) { const sal = crypto.randomBytes(16).toString("hex"); await BD.crearUsuario({ ...u, sal, hash: hashClave(u.clave, sal) }); }
  console.log(`Usuarios de demostración creados: ${usuarios.length}`);
}

/* ---------- Token firmado (formato JWT HS256) ---------- */
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64url");
const firmar = s => crypto.createHmac("sha256", SECRETO).update(s).digest("base64url");
function emitirToken(u) {
  const cuerpo = b64({ alg: "HS256", typ: "JWT" }) + "." + b64({ sub: u.usuario, rol: u.rol, tienda: u.tienda, exp: Math.floor(Date.now() / 1000) + CONF.horasToken * 3600 });
  return cuerpo + "." + firmar(cuerpo);
}
async function verificarToken(t) {
  const [h, p, f] = String(t || "").split(".");
  if (!h || !p || !f) return null;
  const esperada = Buffer.from(firmar(h + "." + p)), recibida = Buffer.from(f);
  if (esperada.length !== recibida.length || !crypto.timingSafeEqual(esperada, recibida)) return null;
  const datos = JSON.parse(Buffer.from(p, "base64url").toString());
  if (datos.exp < Date.now() / 1000) return null;
  const u = await BD.buscarUsuario(datos.sub);
  return u?.activo ? { usuario: u.usuario, nombre: u.nombre, rol: u.rol, tienda: u.tienda } : null; // rol y tienda salen de la BD, no del token
}

/* ---------- Estado del negocio (instantánea + registro de acciones) ---------- */
const CAT = A.prepararCatalogo(JSON.parse(fs.readFileSync(path.join(RAIZ, "catalogo.json"), "utf8")));
const IDX = Object.fromEntries(CAT.map(c => [c.id, c]));
const CTX = { modelo: id => IDX[id], ids: CAT.map(c => c.id), tiendas: A.TIENDAS };
let S, REV;
async function cargarEstado() {
  const f = await BD.leerInstantanea();
  if (f) { S = D.migrar(f.estado, CAT.map(c => c.id), A.TIENDAS, hoyLocal()); REV = f.rev; return; } // estados guardados por versiones anteriores
  S = A.estadoInicial(CAT, A.TIENDAS, hoyLocal()); REV = 0;
  await BD.confirmar([], [], REV, S, new Date().toISOString());
}
let estadoJSON = null; // caché de la respuesta, se invalida con cada cambio

/* Las acciones se procesan de a una (cola en serie): sin condiciones de carrera entre celulares. */
let turno = Promise.resolve();
const enSerie = fn => (turno = turno.then(fn, fn));

/** Si otra instancia del servidor escribió, recarga el estado desde la BD (varias instancias = una sola verdad). */
async function refrescarSiCambio() {
  const r = await BD.leerRev();
  if (r !== null && r !== REV) { await cargarEstado(); estadoJSON = null; }
}

/** Aplica un lote de acciones de un usuario. El servidor impone rol, usuario y tienda desde la BD. */
function procesarLote(u, lote) {
  return enSerie(async () => {
    for (let intento = 1; ; intento++) {
      try { await refrescarSiCambio(); return await aplicarLote(u, lote); }
      catch (e) { if (!(e instanceof ConflictoRev) || intento >= 5) throw e; } // otra instancia ganó: recargar y reintentar
    }
  });
}
async function aplicarLote(u, lote) {
  {
    const aplicadas = [], rechazadas = [], nuevas = [], rech = [];
    const hoy = hoyLocal();
    let E = S, R = REV;
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
        const copia = structuredClone(E);                                  // atomicidad por acción
        const r = A.aplicar(copia, a, CTX);
        if (!r.repetida) { E = copia; R++; nuevas.push(a); }
        aplicadas.push(a.id);
      } catch (e) {
        rechazadas.push({ id: a.id, error: e.message }); rech.push({ id: a.id, usuario: u.usuario, tipo: a.tipo, error: e.message });
      }
    }
    // Se confirma en la BD (una transacción) ANTES de publicar el estado en memoria
    await BD.confirmar(nuevas, rech, R, nuevas.length ? E : null, new Date().toISOString(), REV);
    if (nuevas.length) { S = E; REV = R; estadoJSON = null; }
    return { aplicadas, rechazadas, rev: REV };
  }
}

/** Valida los datos de un usuario; devuelve el objeto limpio o un mensaje de error. */
function validarUsuario(b, nuevo) {
  const usuario = String(b.usuario || "").toLowerCase().trim(), nombre = String(b.nombre || "").trim().slice(0, 60), rol = String(b.rol || "");
  if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) return "Usuario: 3 a 30 letras minúsculas, números, punto o guion";
  if (nombre.length < 3) return "Escribe el nombre";
  if (!["vendedor", "encargado", "gerente"].includes(rol)) return "Rol inválido";
  const tienda = rol === "gerente" ? null : String(b.tienda || "");
  if (rol !== "gerente" && !A.TIENDAS.includes(tienda)) return "Elige la tienda";
  if (nuevo && String(b.clave || "").length < 8) return "La contraseña debe tener al menos 8 caracteres";
  return { usuario, nombre, rol, tienda };
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
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, ngrok-skip-browser-warning"); res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
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
  "GET /api/salud": () => [200, { ok: true, rev: REV, version: "1.2.0", hoy: hoyLocal(), motor: BD.motor.split(" · ")[0] }],
  "POST /api/login": async (req) => {
    const ip = req.socket.remoteAddress || "?";
    if (!permitirLogin(ip)) return [429, { error: "Demasiados intentos. Espera 5 minutos." }];
    const { usuario, clave } = await leerCuerpo(req, 4096);
    const u = await BD.buscarUsuario(String(usuario || "").toLowerCase());
    const ok = u?.activo && crypto.timingSafeEqual(Buffer.from(u.hash, "hex"), Buffer.from(hashClave(String(clave || ""), u.sal), "hex"));
    if (!ok) { intentos.get(ip)?.push(Date.now()); return [401, { error: "Usuario o contraseña incorrectos" }]; } // solo cuentan los fallidos
    return [200, { token: emitirToken(u), usuario: { usuario: u.usuario, nombre: u.nombre, rol: u.rol, tienda: u.tienda } }];
  },
  "GET /api/yo": (req, u) => [200, { usuario: u }],
  "GET /api/estado": async (req, u, url) => {
    await enSerie(refrescarSiCambio);
    const rev = url.searchParams.get("rev");
    if (rev !== null && rev !== "" && Number(rev) === REV) return [200, { sinCambios: true, rev: REV }];
    estadoJSON ??= JSON.stringify({ rev: REV, estado: S });
    return [200, estadoJSON];
  },
  "POST /api/acciones": async (req, u) => {
    const { acciones } = await leerCuerpo(req);
    if (!Array.isArray(acciones)) return [400, { error: "Se esperaba { acciones: [...] }" }];
    return [200, await procesarLote(u, acciones)];
  },
  "GET /api/acciones": async (req, u, url) => { // auditoría: quién hizo qué (solo gerente)
    if (u.rol !== "gerente") return [403, { error: "Solo Gerencia" }];
    const lim = Math.min(500, Number(url.searchParams.get("limite")) || 100);
    return [200, await BD.auditoria(lim)];
  },
  /* ----- Administración de usuarios (solo Gerencia) ----- */
  "GET /api/usuarios": async (req, u) => u.rol !== "gerente" ? [403, { error: "Solo Gerencia" }] : [200, { usuarios: await BD.listarUsuarios(), tiendas: A.TIENDAS }],
  "POST /api/usuarios": async (req, u) => {
    if (u.rol !== "gerente") return [403, { error: "Solo Gerencia" }];
    const b = await leerCuerpo(req, 4096), datos = validarUsuario(b, true);
    if (typeof datos === "string") return [400, { error: datos }];
    if (await BD.buscarUsuario(datos.usuario)) return [409, { error: "Ese usuario ya existe" }];
    const sal = crypto.randomBytes(16).toString("hex");
    await BD.crearUsuario({ ...datos, sal, hash: hashClave(b.clave, sal) });
    return [201, { ok: true, usuario: datos.usuario }];
  },
  "POST /api/usuarios/editar": async (req, u) => {
    if (u.rol !== "gerente") return [403, { error: "Solo Gerencia" }];
    const b = await leerCuerpo(req, 4096), actual = await BD.buscarUsuario(String(b.usuario || "").toLowerCase());
    if (!actual) return [404, { error: "Usuario no encontrado" }];
    const datos = validarUsuario({ ...actual, ...b, usuario: actual.usuario }, false);
    if (typeof datos === "string") return [400, { error: datos }];
    const activo = b.activo === undefined ? actual.activo : (b.activo ? 1 : 0);
    if (actual.usuario === u.usuario && (!activo || datos.rol !== "gerente")) return [400, { error: "No puedes desactivarte ni quitarte el rol de Gerente" }];
    let { sal, hash } = actual;
    if (b.clave) { if (String(b.clave).length < 8) return [400, { error: "La contraseña debe tener al menos 8 caracteres" }]; sal = crypto.randomBytes(16).toString("hex"); hash = hashClave(String(b.clave), sal); }
    await BD.actualizarUsuario({ ...datos, activo, sal, hash });
    return [200, { ok: true }];
  },
  "POST /api/reiniciar": (req, u) => {
    if (u.rol !== "gerente") return [403, { error: "Solo Gerencia" }];
    return enSerie(async () => {
      await BD.borrarRegistro();
      const E = A.estadoInicial(CAT, A.TIENDAS, hoyLocal()), R = REV + 1;
      await BD.confirmar([], [], R, E, new Date().toISOString());
      S = E; REV = R; estadoJSON = null;
      return [200, { ok: true, rev: REV }];
    });
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
      if (!PUBLICAS.has(clave)) { u = await autenticar(req); if (!u) return json(res, 401, { error: "Inicia sesión" }); }
      const [codigo, cuerpo] = await fn(req, u, url);
      json(res, codigo, cuerpo);
    } catch (e) {
      const codigo = e.codigo || 500; if (codigo === 500) console.error(e);
      json(res, codigo, { error: codigo === 500 ? "Error interno" : e.message });
    }
  });
}

/** Abre la BD, crea el secreto y los usuarios demo si faltan, y carga el estado. Idempotente. */
let listo = null;
function iniciar() {
  return listo ??= (async () => {
    BD = await abrirAlmacen({ url: CONF.bdUrl, archivo: CONF.bd });
    SECRETO = process.env.SECRETO_JWT || await BD.leerConfig("secreto") || await (async () => { const x = crypto.randomBytes(32).toString("hex"); await BD.fijarConfig("secreto", x); return x; })();
    await sembrarUsuarios(); await cargarEstado();
  })();
}
if (require.main === module) {
  iniciar().then(() => crearServidor().listen(CONF.puerto, () => console.log(`Manaco Vision API en http://localhost:${CONF.puerto}  (${BD.motor}, rev ${REV})`)))
    .catch(e => { console.error("No se pudo iniciar:", e.message); process.exit(1); });
}
module.exports = { crearServidor, iniciar, procesarLote, get estado() { return S; }, get almacen() { return BD; } };
