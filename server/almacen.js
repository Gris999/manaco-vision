// @ts-check
/* Capa de persistencia del servidor (patrón Repository / Adapter).
   - PostgreSQL si existe DATABASE_URL (producción en la nube: Render).
   - SQLite (node:sqlite) en cualquier otro caso (desarrollo local, sin instalar nada).
   El resto del servidor solo conoce esta interfaz asíncrona; cambiar de motor no toca la lógica. */
"use strict";
const fs = require("node:fs");
const path = require("node:path");

/** @typedef {{usuario:string,nombre:string,rol:string,tienda:string|null,sal:string,hash:string,activo:number}} Usuario */
/** @typedef {{id:string,tipo:string,usuario:string,rol:string,tienda:string,fecha:string,hora:string,datos:any}} AccionGuardada */

const ESQUEMA = (serial, json) => `
  CREATE TABLE IF NOT EXISTS config      (clave TEXT PRIMARY KEY, valor TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS usuarios    (usuario TEXT PRIMARY KEY, nombre TEXT NOT NULL, rol TEXT NOT NULL CHECK (rol IN ('vendedor','encargado','gerente')),
                                          tienda TEXT, sal TEXT NOT NULL, hash TEXT NOT NULL, activo INTEGER NOT NULL DEFAULT 1);
  CREATE TABLE IF NOT EXISTS acciones    (seq ${serial}, id TEXT NOT NULL UNIQUE, tipo TEXT NOT NULL, usuario TEXT NOT NULL REFERENCES usuarios(usuario),
                                          rol TEXT NOT NULL, tienda TEXT, fecha TEXT NOT NULL, hora TEXT, datos ${json} NOT NULL, recibida TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS rechazos    (seq ${serial}, id TEXT, usuario TEXT, tipo TEXT, error TEXT, recibida TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS instantanea (n INTEGER PRIMARY KEY CHECK (n = 1), rev INTEGER NOT NULL, estado ${json} NOT NULL);
  CREATE INDEX IF NOT EXISTS ix_acciones_tienda ON acciones (tienda, fecha);`;

/* ---------- SQLite ---------- */
function sqlite(archivo) {
  const { DatabaseSync } = require("node:sqlite");
  fs.mkdirSync(path.dirname(archivo), { recursive: true });
  const db = new DatabaseSync(archivo);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;" + ESQUEMA("INTEGER PRIMARY KEY AUTOINCREMENT", "TEXT"));
  const q = (sql, ...p) => db.prepare(sql);
  return {
    motor: "SQLite · " + archivo,
    async leerConfig(k) { return /** @type {any} */ (q("SELECT valor FROM config WHERE clave = ?").get(k))?.valor; },
    async fijarConfig(k, v) { q("INSERT INTO config (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor").run(k, v); },
    async contarUsuarios() { return Number(/** @type {any} */ (q("SELECT COUNT(*) AS n FROM usuarios").get()).n); },
    async crearUsuario(u) { q("INSERT INTO usuarios (usuario, nombre, rol, tienda, sal, hash) VALUES (?, ?, ?, ?, ?, ?)").run(u.usuario, u.nombre, u.rol, u.tienda, u.sal, u.hash); },
    /** @returns {Promise<Usuario|undefined>} */
    async buscarUsuario(usuario) { return /** @type {any} */ (q("SELECT * FROM usuarios WHERE usuario = ?").get(usuario)); },
    async listarUsuarios() { return q("SELECT usuario, nombre, rol, tienda, activo FROM usuarios ORDER BY rol, tienda, usuario").all(); },
    async actualizarUsuario(u) { q("UPDATE usuarios SET nombre = ?, rol = ?, tienda = ?, activo = ?, sal = ?, hash = ? WHERE usuario = ?").run(u.nombre, u.rol, u.tienda, u.activo, u.sal, u.hash, u.usuario); },
    async leerInstantanea() { const f = /** @type {any} */ (q("SELECT rev, estado FROM instantanea WHERE n = 1").get()); return f && { rev: f.rev, estado: JSON.parse(f.estado) }; },
    /** Guarda acciones nuevas + instantanea en UNA transacción (todo o nada). */
    async confirmar(acciones, rechazos, rev, estado, ahora) {
      db.exec("BEGIN");
      try {
        const ia = q("INSERT INTO acciones (id, tipo, usuario, rol, tienda, fecha, hora, datos, recibida) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        for (const a of acciones) ia.run(a.id, a.tipo, a.usuario, a.rol, a.tienda, a.fecha, a.hora, JSON.stringify(a.datos), ahora);
        const ir = q("INSERT INTO rechazos (id, usuario, tipo, error, recibida) VALUES (?, ?, ?, ?, ?)");
        for (const r of rechazos) ir.run(r.id, r.usuario, r.tipo, r.error, ahora);
        if (estado) q("INSERT INTO instantanea (n, rev, estado) VALUES (1, ?, ?) ON CONFLICT(n) DO UPDATE SET rev = excluded.rev, estado = excluded.estado").run(rev, JSON.stringify(estado));
        db.exec("COMMIT");
      } catch (e) { db.exec("ROLLBACK"); throw e; }
    },
    async auditoria(lim) {
      return { acciones: q("SELECT seq, tipo, usuario, rol, tienda, fecha, hora, datos, recibida FROM acciones ORDER BY seq DESC LIMIT ?").all(lim),
        rechazos: q("SELECT * FROM rechazos ORDER BY seq DESC LIMIT 50").all() };
    },
    async borrarRegistro() { db.exec("DELETE FROM acciones; DELETE FROM rechazos;"); },
    async cerrar() { db.close(); },
  };
}

/* ---------- PostgreSQL ---------- */
async function postgres(url) {
  const { Pool } = require("pg");
  const local = /localhost|127\.0\.0\.1/.test(url);
  const pool = new Pool({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false }, max: 5 });
  await pool.query(ESQUEMA("BIGSERIAL PRIMARY KEY", "JSONB"));
  const uno = async (sql, p = []) => (await pool.query(sql, p)).rows[0];
  return {
    motor: "PostgreSQL · " + new URL(url).hostname,
    async leerConfig(k) { return (await uno("SELECT valor FROM config WHERE clave = $1", [k]))?.valor; },
    async fijarConfig(k, v) { await pool.query("INSERT INTO config (clave, valor) VALUES ($1, $2) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor", [k, v]); },
    async contarUsuarios() { return Number((await uno("SELECT COUNT(*) AS n FROM usuarios")).n); },
    async crearUsuario(u) { await pool.query("INSERT INTO usuarios (usuario, nombre, rol, tienda, sal, hash) VALUES ($1, $2, $3, $4, $5, $6)", [u.usuario, u.nombre, u.rol, u.tienda, u.sal, u.hash]); },
    async buscarUsuario(usuario) { return uno("SELECT * FROM usuarios WHERE usuario = $1", [usuario]); },
    async listarUsuarios() { return (await pool.query("SELECT usuario, nombre, rol, tienda, activo FROM usuarios ORDER BY rol, tienda, usuario")).rows; },
    async actualizarUsuario(u) { await pool.query("UPDATE usuarios SET nombre = $1, rol = $2, tienda = $3, activo = $4, sal = $5, hash = $6 WHERE usuario = $7", [u.nombre, u.rol, u.tienda, u.activo, u.sal, u.hash, u.usuario]); },
    async leerInstantanea() { const f = await uno("SELECT rev, estado FROM instantanea WHERE n = 1"); return f && { rev: Number(f.rev), estado: f.estado }; },
    async confirmar(acciones, rechazos, rev, estado, ahora) {
      const c = await pool.connect();
      try {
        await c.query("BEGIN");
        for (const a of acciones) await c.query("INSERT INTO acciones (id, tipo, usuario, rol, tienda, fecha, hora, datos, recibida) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
          [a.id, a.tipo, a.usuario, a.rol, a.tienda, a.fecha, a.hora, JSON.stringify(a.datos), ahora]);
        for (const r of rechazos) await c.query("INSERT INTO rechazos (id, usuario, tipo, error, recibida) VALUES ($1,$2,$3,$4,$5)", [r.id, r.usuario, r.tipo, r.error, ahora]);
        if (estado) await c.query("INSERT INTO instantanea (n, rev, estado) VALUES (1, $1, $2) ON CONFLICT (n) DO UPDATE SET rev = EXCLUDED.rev, estado = EXCLUDED.estado", [rev, JSON.stringify(estado)]);
        await c.query("COMMIT");
      } catch (e) { await c.query("ROLLBACK"); throw e; } finally { c.release(); }
    },
    async auditoria(lim) {
      return { acciones: (await pool.query("SELECT seq, tipo, usuario, rol, tienda, fecha, hora, datos, recibida FROM acciones ORDER BY seq DESC LIMIT $1", [lim])).rows,
        rechazos: (await pool.query("SELECT * FROM rechazos ORDER BY seq DESC LIMIT 50")).rows };
    },
    async borrarRegistro() { await pool.query("DELETE FROM acciones; DELETE FROM rechazos;"); },
    async cerrar() { await pool.end(); },
  };
}

/** Elige el motor según el entorno. */
async function abrirAlmacen({ url, archivo }) { return url ? postgres(url) : sqlite(archivo); }
module.exports = { abrirAlmacen };
