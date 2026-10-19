// Pruebas de integración del servidor (API real sobre una BD temporal)
const test = require("node:test");
const assert = require("node:assert/strict");
const os = require("node:os"), path = require("node:path"), fs = require("node:fs");
process.env.BD = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "manaco-")), "prueba.db");
const { crearServidor, iniciar } = require("../server/servidor.js");
const D = require("../js/dominio.js");

let base, srv;
test.before(async () => { await iniciar(); await new Promise(ok => { srv = crearServidor().listen(0, () => { base = "http://127.0.0.1:" + srv.address().port; ok(); }); }); });
test.after(async () => { srv.close(); await require("../server/servidor.js").almacen.cerrar(); });
const api = async (ruta, { token, body, metodo } = {}) => {
  const r = await fetch(base + ruta, { method: metodo || (body ? "POST" : "GET"), headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: body && JSON.stringify(body) });
  return { status: r.status, j: await r.json() };
};
const login = async (u, c) => (await api("/api/login", { body: { usuario: u, clave: c } })).j.token;
let n = 0; const acc = (tipo, datos, tienda = "La Paz - El Prado") => ({ id: "t" + (++n) + "-" + Date.now(), tipo, datos, tienda, fecha: D.sumarDias(new Date().toISOString().slice(0, 10), 0), hora: "10:00", ts: Date.now() });

test("salud pública; estado exige sesión; contraseña incorrecta = 401", async () => {
  assert.equal((await api("/api/salud")).j.ok, true);
  assert.equal((await api("/api/estado")).status, 401);
  assert.equal((await api("/api/login", { body: { usuario: "gerente", clave: "x" } })).status, 401);
  assert.equal((await api("/api/estado", { token: "a.b.c" })).status, 401, "token falsificado");
});

test("no se sirven archivos privados ni se sale de la carpeta", async () => {
  for (const r of ["/server/usuarios.semilla.json", "/tests/servidor.test.js", "/../package.json", "/%2e%2e/%2e%2e/etc/passwd"]) assert.notEqual((await fetch(base + r)).status, 200, r);
  assert.equal((await fetch(base + "/index.html")).status, 200);
});

test("flujo multiusuario: el servidor impone rol y tienda; la otra tienda ve el cambio", async () => {
  const enc = await login("encargado.lp", "Manaco-LP-2026"), ven = await login("vendedor.lp", "Manaco-VLP-2026"), ger = await login("gerente", "Manaco-Gerente-2026");
  // el vendedor intenta abrir la caja y se hace pasar por gerente: el servidor usa SU rol real
  let r = await api("/api/acciones", { token: ven, body: { acciones: [{ ...acc("ABRIR_CAJA", { fondo: "100" }), rol: "gerente" }] } });
  assert.equal(r.j.rechazadas.length, 1); assert.match(r.j.rechazadas[0].error, /rol/);
  r = await api("/api/acciones", { token: enc, body: { acciones: [acc("ABRIR_CAJA", { fondo: "100" })] } });
  assert.equal(r.j.aplicadas.length, 1);
  const { j: e0 } = await api("/api/estado", { token: ger }); const id = Object.keys(e0.estado.stock).find(k => e0.estado.stock[k]["La Paz - El Prado"] >= 2);
  const s0 = e0.estado.stock[id]["La Paz - El Prado"];
  // el vendedor de La Paz intenta vender en Santa Cruz: se registra en SU tienda
  const v = acc("VENDER", { id, cant: 2, pago: "qr" }, "Santa Cruz - Ventura Mall");
  r = await api("/api/acciones", { token: ven, body: { acciones: [v, v] } }); // duplicada a propósito
  assert.equal(r.j.aplicadas.length, 2); assert.equal(r.j.rechazadas.length, 0);
  const { j: e1 } = await api("/api/estado", { token: ger });
  assert.equal(e1.estado.stock[id]["La Paz - El Prado"], s0 - 2, "una sola venta, en La Paz");
  const venta = e1.estado.ventas.at(-1); assert.equal(venta.tienda, "La Paz - El Prado"); assert.equal(venta.usuario, "vendedor.lp");
  assert.deepEqual(D.verificarKardex(e1.estado), []);
  // sin cambios → respuesta liviana
  assert.equal((await api("/api/estado?rev=" + e1.rev, { token: ger })).j.sinCambios, true);
  // auditoría solo para gerente
  assert.equal((await api("/api/acciones", { token: ven })).status, 403);
  const aud = (await api("/api/acciones", { token: ger })).j; assert.ok(aud.acciones.some(x => x.tipo === "VENDER" && x.usuario === "vendedor.lp")); assert.ok(aud.rechazos.length >= 1);
});

test("atomicidad: una acción rechazada no deja el estado a medias", async () => {
  const ger = await login("gerente", "Manaco-Gerente-2026"), enc = await login("encargado.lp", "Manaco-LP-2026");
  const { j: a } = await api("/api/estado", { token: ger });
  const r = await api("/api/acciones", { token: enc, body: { acciones: [acc("CERRAR_CONTEO", { valores: { [Object.keys(a.estado.stock)[0]]: -5 } })] } });
  assert.equal(r.j.rechazadas.length, 1);
  const { j: b } = await api("/api/estado", { token: ger }); assert.equal(b.rev, a.rev);
});

test("límite de intentos de login", async () => {
  let ultimo; for (let i = 0; i < 12; i++) ultimo = (await api("/api/login", { body: { usuario: "nadie", clave: "x" } })).status;
  assert.equal(ultimo, 429);
});
