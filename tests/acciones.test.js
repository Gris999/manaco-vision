// Pruebas del reductor de acciones (las mismas reglas corren en el celular y en el servidor)
const test = require("node:test");
const assert = require("node:assert/strict");
const D = require("../js/dominio.js");
const A = require("../js/acciones.js");

const TI = ["LP", "CB"], CAT = [{ id: "z1", categoria: "Deportivo", precio_bs: 100, costo_bs: 60 }, { id: "z2", categoria: "Deportivo", precio_bs: 200, costo_bs: 120 }];
const ctx = { modelo: id => CAT.find(c => c.id === id), ids: CAT.map(c => c.id), tiendas: TI };
let n = 0;
const acc = (tipo, rol, datos, tienda = "LP") => ({ id: "a" + (++n), tipo, rol, tienda, fecha: "2026-10-19", hora: "10:00", ts: n, datos, usuario: rol });
const nuevo = () => { const S = { stock: { z1: { LP: 5, CB: 5 }, z2: { LP: 1, CB: 0 } }, ventas: [], cierres: [], cajas: {}, version: 6 }; return D.migrar(S, ctx.ids, TI, "2026-10-19"); };
const run = (S, a) => A.aplicar(S, a, ctx);

test("permisos por rol: el vendedor no abre caja ni anula; el gerente no vende", () => {
  const S = nuevo();
  assert.throws(() => run(S, acc("ABRIR_CAJA", "vendedor", { fondo: "100" })), /rol no puede/);
  assert.throws(() => run(S, acc("VENDER", "gerente", { id: "z1", cant: 1, pago: "qr" })), /rol no puede/);
  assert.throws(() => run(S, acc("ANULAR", "vendedor", { nro: 1, tipoMotivo: "otro" })), /rol no puede/);
  assert.throws(() => run(S, acc("HACKEAR", "gerente", {})), /desconocida/);
});

test("día completo: abrir, vender, retirar, anular por defecto, contar y cerrar caja", () => {
  const S = nuevo();
  assert.throws(() => run(S, acc("VENDER", "vendedor", { id: "z1", cant: 1, pago: "efectivo" })), /abrir la caja/);
  assert.throws(() => run(S, acc("ABRIR_CAJA", "encargado", { fondo: "" })), /fondo inicial/);
  run(S, acc("ABRIR_CAJA", "encargado", { fondo: "100" }));
  assert.throws(() => run(S, acc("ABRIR_CAJA", "encargado", { fondo: "100" })), /ya está abierta/);
  assert.equal(run(S, acc("VENDER", "vendedor", { id: "z1", cant: "2", pago: "efectivo" })).nro, 1);
  run(S, acc("VENDER", "vendedor", { id: "z2", cant: 1, pago: "qr" }));
  assert.throws(() => run(S, acc("VENDER", "vendedor", { id: "z2", cant: 1, pago: "qr" })), /Solo hay 0/);
  assert.throws(() => run(S, acc("VENDER", "vendedor", { id: "z1", cant: "0", pago: "qr" })), /entero/);
  assert.throws(() => run(S, acc("MOV_CAJA", "encargado", { tipo: "retiro", monto: "999", motivo: "banco" })), /tanto efectivo/);
  run(S, acc("MOV_CAJA", "encargado", { tipo: "retiro", monto: "50", motivo: "banco" }));
  run(S, acc("ANULAR", "encargado", { nro: 2, tipoMotivo: "defecto", detalle: "suela" }));
  assert.throws(() => run(S, acc("ANULAR", "encargado", { nro: 2, tipoMotivo: "defecto" })), /ya está anulada/);
  assert.equal(S.stock.z2.LP, 1);
  assert.equal(D.kpiCalidad(S.ventas, []).porTipo.defecto, 1);
  run(S, acc("CERRAR_CONTEO", "encargado", { valores: { z1: 2 } })); // sistema 3 → contó 2: falta 1
  assert.equal(S.stock.z1.LP, 2);
  assert.equal(S.conteos["2026-10-19|LP"].resultado.monto, 60);
  const k = A.sesionKey(S, "LP", "2026-10-19");
  assert.equal(A.esperadoSesion(S, k), 250); // 100 + 200 efectivo − 50
  assert.throws(() => run(S, acc("CERRAR_CAJA", "encargado", { arqueo: {} })), /cuenta el efectivo/);
  run(S, acc("CERRAR_CAJA", "encargado", { arqueo: { "200": 1, "20": 2 } }));
  assert.equal(S.cajas[k].dif, -10);
  assert.deepEqual(D.verificarKardex(S), []);
});

test("pedido del gerente: no se duplica y solo lo recibe la tienda destino", () => {
  const S = nuevo();
  const p = acc("PEDIR", "gerente", { id: "z2", tienda: "CB" }, "");
  run(S, p);
  assert.throws(() => run(S, acc("PEDIR", "gerente", { id: "z2", tienda: "CB" }, "")), /pendiente/);
  assert.throws(() => run(S, acc("RECIBIR", "encargado", { pid: p.id }, "LP")), /otra tienda/);
  run(S, acc("RECIBIR", "encargado", { pid: p.id }, "CB"));
  assert.equal(S.stock.z2.CB, 10); assert.equal(S.pedidos[0].fechaRecibido, "2026-10-19");
  assert.deepEqual(D.verificarKardex(S), []);
});

test("idempotencia: reenviar la misma acción (reintento de red) no la aplica dos veces", () => {
  const S = nuevo(); run(S, acc("ABRIR_CAJA", "encargado", { fondo: 0 }));
  const v = acc("VENDER", "vendedor", { id: "z1", cant: 1, pago: "qr" });
  run(S, v); assert.equal(run(S, v).repetida, true);
  assert.equal(S.ventas.length, 1); assert.equal(S.stock.z1.LP, 4);
});

test("reproducir el registro de acciones da el mismo estado (base de la sincronización)", () => {
  const S1 = nuevo(), log = [acc("ABRIR_CAJA", "encargado", { fondo: 10 }), acc("VENDER", "vendedor", { id: "z1", cant: 2, pago: "qr" }), acc("CERRAR_CONTEO", "encargado", { valores: { z1: 3 } })];
  log.forEach(a => run(S1, a));
  const S2 = nuevo(); log.forEach(a => run(S2, structuredClone(a)));
  assert.deepEqual(S2.stock, S1.stock); assert.equal(S2.ventas.length, S1.ventas.length);
});

test("estado inicial determinista", () => {
  const C = [{ id: "x", categoria: "Deportivo", precio_bs: 100, costo_bs: 60 }];
  assert.deepEqual(A.estadoInicial(C, TI, "2026-10-19").stock, A.estadoInicial(C, TI, "2026-10-19").stock);
});
