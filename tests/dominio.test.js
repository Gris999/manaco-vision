// Pruebas del dominio: node --test app/tests
const test = require("node:test");
const assert = require("node:assert/strict");
const D = require("../js/dominio.js");

test("desglose: precio con IVA 13 % e IT 3 %", () => {
  const d = D.desglose(100);
  assert.deepEqual(d, { bruto: 100, iva: 13, neto: 87, it: 3 });
});

test("resumenVentas: utilidad sobre venta NETA, no sobre el precio con IVA", () => {
  // 2 pares a Bs 349 (costo 210) + 1 par a Bs 251 (costo 131)
  const r = D.resumenVentas([
    { cant: 2, precio: 349, costo: 210, pago: "efectivo" },
    { cant: 1, precio: 251, costo: 131, pago: "qr" },
  ]);
  assert.equal(r.bruto, 949);
  assert.equal(r.iva, 123.37);          // 949 × 13 %
  assert.equal(r.neto, 825.63);         // 949 − 123,37
  assert.equal(r.costo, 551);
  assert.equal(r.utilidad, 274.63);     // 825,63 − 551
  assert.equal(r.it, 28.47);            // 949 × 3 %
  assert.equal(r.contribucion, 246.16); // 274,63 − 28,47
  assert.equal(r.transacciones, 2);
  assert.equal(r.pares, 3);
  assert.equal(r.ticketPromedio, 474.5);       // 949 / 2 ventas
  assert.equal(r.precioPromedioPar, 316.33);   // 949 / 3 pares
  assert.deepEqual(r.porPago, { efectivo: 698, qr: 251, tarjeta: 0 });
  assert.ok(Math.abs(r.margenBruto - 33.26) < 0.01);
});

test("resumenVentas: sin errores de coma flotante con centavos", () => {
  const v = Array.from({ length: 10 }, () => ({ cant: 1, precio: 181.3, costo: 105.15, pago: "efectivo" }));
  const r = D.resumenVentas(v);
  assert.equal(r.bruto, 1813);
  assert.equal(r.costo, 1051.5);
});

test("resumenVentas vacío no divide entre cero", () => {
  const r = D.resumenVentas([]);
  assert.equal(r.margenBruto, 0); assert.equal(r.ticketPromedio, 0); assert.equal(r.precioPromedioPar, 0);
});

test("ventana: 30 días EXACTOS terminando hoy y los 30 anteriores", () => {
  const w = D.ventana(30, "2026-10-19");
  assert.equal(w.desde, "2026-09-20"); assert.equal(w.hasta, "2026-10-19");
  assert.equal(w.antDesde, "2026-08-21"); assert.equal(w.antHasta, "2026-09-19");
  const contar = (a, b) => { let n = 0, f = a; while (f <= b) { n++; f = D.sumarDias(f, 1); } return n; };
  assert.equal(contar(w.desde, w.hasta), 30);
  assert.equal(contar(w.antDesde, w.antHasta), 30);
});

test("ventana de 1 día = solo hoy; anterior = ayer", () => {
  const w = D.ventana(1, "2026-03-01");
  assert.deepEqual([w.desde, w.hasta, w.antDesde, w.antHasta], ["2026-03-01", "2026-03-01", "2026-02-28", "2026-02-28"]);
});

test("caja: esperado = fondo + efectivo + ingresos − retiros", () => {
  const s = { fondo: 500, movs: [{ tipo: "retiro", monto: 120.5 }, { tipo: "ingreso", monto: 50 }] };
  assert.equal(D.esperadoCaja(s, 698), 1127.5);
});

test("arqueo por denominaciones con centavos", () => {
  assert.equal(D.totalArqueo({ "200": 3, "50": 1, "0.5": 3, "0.2": 1, "0.1": 2 }), 651.9); // 600 + 50 + 1,50 + 0,20 + 0,20
});

test("kardex: cada movimiento deja el saldo y el stock coincide", () => {
  const e = { stock: { z1: { LP: 0 } }, movs: [] };
  D.moverStock(e, { id: "z1", tienda: "LP", cant: 10, tipo: "inicial", fecha: "2026-10-19" });
  D.moverStock(e, { id: "z1", tienda: "LP", cant: -2, tipo: "venta", fecha: "2026-10-19", ref: "V-1" });
  D.moverStock(e, { id: "z1", tienda: "LP", cant: 5, tipo: "reposicion", fecha: "2026-10-19" });
  D.moverStock(e, { id: "z1", tienda: "LP", cant: -1, tipo: "ajuste", fecha: "2026-10-19", ref: "Conteo" });
  assert.equal(e.stock.z1.LP, 12);
  assert.deepEqual(e.movs.map(m => m.saldo), [10, 8, 13, 12]);
  assert.deepEqual(D.verificarKardex(e), []);
});

test("kardex: no permite stock negativo ni cantidades inválidas", () => {
  const e = { stock: { z1: { LP: 1 } }, movs: [] };
  assert.throws(() => D.moverStock(e, { id: "z1", tienda: "LP", cant: -2, tipo: "venta", fecha: "x" }), /insuficiente/);
  assert.throws(() => D.moverStock(e, { id: "z1", tienda: "LP", cant: 0, tipo: "venta", fecha: "x" }), /inválida/);
  assert.throws(() => D.moverStock(e, { id: "z1", tienda: "LP", cant: 1.5, tipo: "venta", fecha: "x" }), /inválida/);
  assert.equal(e.stock.z1.LP, 1);
});

test("verificarKardex detecta stock modificado por fuera del kardex", () => {
  const e = { stock: { z1: { LP: 5 } }, movs: [{ id: "z1", tienda: "LP", saldo: 4 }] };
  assert.equal(D.verificarKardex(e).length, 1);
});

test("conteos: exactitud y merma valorizada A COSTO", () => {
  const costos = { a: 200, b: 100 };
  const k = D.kpiConteos([{ id: "a", dif: 0 }, { id: "a", dif: -2 }, { id: "b", dif: -1 }, { id: "b", dif: 3 }], id => costos[id]);
  assert.equal(k.exactitud, 25);
  assert.equal(k.faltantes, 3); assert.equal(k.sobrantes, 3);
  assert.equal(k.mermaCosto, 500); // 2×200 + 1×100
  assert.equal(D.kpiConteos([], () => 0).exactitud, null);
});

test("cobertura en días", () => {
  assert.equal(D.cobertura(30, 60, 30), 15);
  assert.equal(D.cobertura(5, 0, 30), Infinity);
});

test("migración v6 → v7: saldo inicial, N° de venta y sesión activa", () => {
  const e = { stock: { a: { LP: 4, CB: 0 } }, ventas: [{ tienda: "LP" }, { tienda: "LP" }, { tienda: "CB" }],
    cajas: { "2026-10-19|LP": { tienda: "LP", abierta: true } } };
  D.migrar(e, ["a"], ["LP", "CB"], "2026-10-19");
  assert.equal(e.version, 7);
  assert.equal(e.movs.length, 2);
  assert.deepEqual(e.ventas.map(v => v.nro), [1, 2, 1]);
  assert.equal(e.sesionActiva.LP, "2026-10-19|LP");
  assert.deepEqual(e.cajas["2026-10-19|LP"].movs, [], "las cajas migradas aceptan ingresos/retiros");
  assert.deepEqual(D.verificarKardex(e), []);
  const antes = JSON.stringify(e); D.migrar(e, ["a"], ["LP", "CB"], "2026-10-20");
  assert.equal(JSON.stringify(e), antes, "la migración es idempotente");
});

test("ventas anuladas no suman ingresos, costo ni transacciones", () => {
  const r = D.resumenVentas([
    { cant: 1, precio: 100, costo: 60, pago: "efectivo" },
    { cant: 2, precio: 100, costo: 60, pago: "qr", anulada: true },
  ]);
  assert.equal(r.bruto, 100); assert.equal(r.costo, 60); assert.equal(r.pares, 1); assert.equal(r.transacciones, 1);
  assert.deepEqual(r.porPago, { efectivo: 100, qr: 0, tarjeta: 0 });
});

test("calidad: devoluciones por tipo, defectos y plazo de entrega", () => {
  assert.equal(D.tipoDevolucion("Suela despegada"), "defecto");
  assert.equal(D.tipoDevolucion("Cambio de talla"), "talla");
  assert.equal(D.tipoDevolucion("No le gustó"), "otro");
  const k = D.kpiCalidad([
    { cant: 8 }, { cant: 1, anulada: true, motivoAnulacion: "Costura rota" }, { cant: 1, anulada: true, motivoAnulacion: "talla" },
  ], [{ fecha: "2026-10-10", fechaRecibido: "2026-10-12", recibido: true }, { fecha: "2026-10-10", fechaRecibido: "2026-10-15", recibido: true }, { fecha: "2026-10-18" }]);
  assert.equal(k.pares, 10); assert.equal(k.tasaDevolucion, 20); assert.equal(k.tasaDefectos, 10);
  assert.equal(k.plazoPromedio, 3.5); assert.equal(k.aTiempo, 50); assert.equal(k.pendientes, 1);
  assert.equal(D.kpiCalidad([], []).tasaDevolucion, null);
});
