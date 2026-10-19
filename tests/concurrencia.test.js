// Dos instancias del servidor sobre la MISMA base de datos (como Render durante un despliegue):
// ninguna debe pisar lo que escribió la otra. Usa SQLite temporal o PostgreSQL si hay TEST_PG_URL.
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const os = require("node:os"), path = require("node:path"), fs = require("node:fs");

const env = { ...process.env, ...(process.env.TEST_PG_URL ? { DATABASE_URL: process.env.TEST_PG_URL } : { BD: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "conc-")), "c.db") }) };
const levantar = puerto => new Promise((ok, mal) => {
  const p = spawn(process.execPath, ["server/servidor.js"], { env: { ...env, PUERTO: String(puerto) }, stdio: ["ignore", "pipe", "pipe"] });
  p.stdout.on("data", d => { if (/API en/.test(d)) ok(p); }); p.on("exit", c => mal(new Error("salió " + c)));
});
const api = async (base, ruta, token, body) => (await fetch(base + ruta, { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: body && JSON.stringify(body) })).json();

test("dos instancias no se pisan: cada acción queda y ambas ven lo mismo", async () => {
  const a = await levantar(8811), b = await levantar(8812);
  try {
    const A = "http://127.0.0.1:8811", B = "http://127.0.0.1:8812";
    const tokA = (await api(A, "/api/login", null, { usuario: "gerente", clave: "Manaco-Gerente-2026" })).token;
    const tokB = (await api(B, "/api/login", null, { usuario: "gerente", clave: "Manaco-Gerente-2026" })).token;
    const prov = (n, nit) => ({ id: "p" + nit, tipo: "CREAR_PROVEEDOR", datos: { nombre: n, nit }, fecha: "2026-10-19", hora: "10:00", ts: 1 });
    const base = (await api(A, "/api/estado?rev=-1", tokA)).estado.proveedores.length;
    assert.equal((await api(A, "/api/acciones", tokA, { acciones: [prov("Uno", "11111111")] })).aplicadas.length, 1);
    assert.equal((await api(B, "/api/acciones", tokB, { acciones: [prov("Dos", "22222222")] })).aplicadas.length, 1); // B tenía el estado viejo en memoria
    assert.equal((await api(A, "/api/acciones", tokA, { acciones: [prov("Tres", "33333333")] })).aplicadas.length, 1);
    const eA = await api(A, "/api/estado?rev=-1", tokA), eB = await api(B, "/api/estado?rev=-1", tokB);
    assert.equal(eA.estado.proveedores.length, base + 3, "no se perdió ninguna escritura");
    assert.equal(eA.rev, eB.rev); assert.deepEqual(eA.estado.proveedores, eB.estado.proveedores);
  } finally { a.kill(); b.kill(); }
});
