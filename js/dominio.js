// @ts-check
/* Dominio de Manaco Vision: reglas de negocio PURAS (sin DOM, sin localStorage).
   Se usa en el navegador (window.Dominio) y en Node para las pruebas (module.exports).
   Referencias: Odoo pos.session / stock.move y ERPNext Stock Ledger Entry / POS Closing Entry.

   Convenciones:
   - Dinero en BOLIVIANOS con 2 decimales; internamente se calcula en CENTAVOS enteros.
   - Fechas como texto "AAAA-MM-DD" (hora local de la tienda).
   - Precio de venta al público INCLUYE IVA (Bolivia). */
(function (global) {
  "use strict";

  const IVA = 0.13; // débito fiscal, incluido en el precio
  const IT = 0.03;  // impuesto a las transacciones, sobre la venta bruta

  /* ---------- Dinero ---------- */
  const cent = bs => Math.round((Number(bs) || 0) * 100);
  const bs = c => Math.round(c) / 100;
  const redondear = n => bs(cent(n));

  /* ---------- Validación de entradas (la vista nunca "adivina" un valor) ---------- */
  /** Cantidad de pares: entero entre 1 y max; si no, null. */
  function leerCantidad(txt, max = 99) {
    const s = String(txt ?? "").trim();
    if (!/^\d+$/.test(s)) return null;
    const n = Number(s);
    return n >= 1 && n <= max ? n : null;
  }
  /** Monto en Bs ≥ 0 con hasta 2 decimales (acepta coma); si no, null. */
  function leerMonto(txt) {
    const s = String(txt ?? "").trim().replace(",", ".");
    if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
    return redondear(Number(s));
  }

  /* ---------- Fechas ---------- */
  const aFecha = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  function sumarDias(fecha, k) {
    const [a, m, d] = fecha.split("-").map(Number);
    return aFecha(new Date(a, m - 1, d + k)); // mediodía implícito: sin problemas de horario de verano
  }
  /** Ventana de N días que TERMINA hoy (inclusive) y la ventana anterior del mismo tamaño. */
  function ventana(dias, hoy) {
    const desde = sumarDias(hoy, -(dias - 1));
    return { desde, hasta: hoy, antDesde: sumarDias(desde, -dias), antHasta: sumarDias(desde, -1), dias };
  }
  const enRango = (f, desde, hasta) => f >= desde && f <= hasta;

  /* ---------- Contabilidad de ventas ---------- */
  /** Desglose de una venta bruta (precio con IVA). */
  function desglose(brutoBs) {
    const b = cent(brutoBs), iva = Math.round(b * IVA), it = Math.round(b * IT);
    return { bruto: bs(b), iva: bs(iva), neto: bs(b - iva), it: bs(it) };
  }
  /**
   * Resumen contable de un conjunto de ventas.
   * venta: {cant, precio, costo, pago, nro?}
   * - Venta neta = bruta − IVA 13 %
   * - Utilidad bruta = neta − costo de lo vendido
   * - Margen de contribución = utilidad bruta − IT 3 %
   */
  function resumenVentas(ventas) {
    let b = 0, c = 0, pares = 0;
    const porPago = { efectivo: 0, qr: 0, tarjeta: 0 };
    for (const v of ventas) {
      if (v.anulada) continue; // anulada = revertida (devolución): no es ingreso
      const lb = cent(v.precio) * v.cant, lc = cent(v.costo) * v.cant;
      b += lb; c += lc; pares += v.cant;
      const k = porPago[v.pago] != null ? v.pago : "efectivo";
      porPago[k] += lb;
    }
    const iva = Math.round(b * IVA), it = Math.round(b * IT), neto = b - iva;
    const utilidad = neto - c, contribucion = utilidad - it;
    const trans = ventas.filter(v => !v.anulada).length;
    return {
      bruto: bs(b), iva: bs(iva), neto: bs(neto), it: bs(it), costo: bs(c),
      utilidad: bs(utilidad), contribucion: bs(contribucion),
      margenBruto: neto ? utilidad / neto * 100 : 0,          // % sobre venta neta
      margenContribucion: neto ? contribucion / neto * 100 : 0,
      pares, transacciones: trans,
      ticketPromedio: trans ? bs(b / trans) : 0,               // facturación / nº de ventas
      precioPromedioPar: pares ? bs(b / pares) : 0,            // facturación / pares
      porPago: { efectivo: bs(porPago.efectivo), qr: bs(porPago.qr), tarjeta: bs(porPago.tarjeta) },
    };
  }
  const variacion = (actual, anterior) => anterior ? (actual - anterior) / anterior * 100 : null;

  /* ---------- Agregaciones para el Resumen (antes estaban en la vista, sin pruebas) ---------- */
  /** Pares y facturación por modelo, ordenado por pares (desc). */
  function rankingModelos(ventas) {
    const m = {};
    for (const v of ventas) { if (v.anulada) continue; const o = (m[v.id] ??= { p: 0, bs: 0 }); o.p += v.cant; o.bs = bs(cent(o.bs) + cent(v.precio) * v.cant); }
    return Object.entries(m).sort((a, b) => b[1].p - a[1].p);
  }
  /** Facturación bruta agrupada por una clave (tienda, categoría…), ordenada desc. */
  function facturacionPor(ventas, clave, claves) {
    const g = {}; for (const k of claves || []) g[k] = [];
    for (const v of ventas) (g[clave(v)] ??= []).push(v);
    return Object.entries(g).map(([k, vs]) => /** @type {[string, number]} */ ([k, resumenVentas(vs).bruto])).sort((a, b) => b[1] - a[1]);
  }
  /** Facturación bruta de cada día de la lista. */
  const serieDiaria = (ventas, dias) => dias.map(d => resumenVentas(ventas.filter(v => v.fecha === d)).bruto);
  /** Pares en stock y su valor a costo en las tiendas indicadas. */
  function inventarioValorizado(stock, ids, tiendas, costoDe) {
    let pares = 0, valor = 0;
    for (const id of ids) for (const t of tiendas) { const n = stock[id][t]; pares += n; valor += n * cent(costoDe(id)); }
    return { pares, valor: bs(valor) };
  }

  /* ---------- Caja (sesión tipo pos.session) ---------- */
  /** Efectivo esperado = fondo + ventas en efectivo + ingresos − retiros. */
  function esperadoCaja(sesion, ventasEfectivoBs) {
    let e = cent(sesion.fondo) + cent(ventasEfectivoBs);
    for (const m of sesion.movs || []) e += (m.tipo === "retiro" ? -1 : 1) * cent(m.monto);
    return bs(e);
  }
  function totalArqueo(conteo) { // {"200": 3, "0.5": 2}
    let t = 0;
    for (const [den, n] of Object.entries(conteo)) t += Math.round(Number(den) * 100) * Math.max(0, parseInt(n) || 0);
    return bs(t);
  }

  /* ---------- Inventario: kardex (libro de movimientos) ---------- */
  /**
   * Único punto que cambia el stock. Registra un movimiento con el saldo resultante,
   * como un Stock Ledger Entry (actual_qty, qty_after_transaction, voucher).
   * tipo: "inicial" | "venta" | "reposicion" | "ajuste"
   */
  function moverStock(estado, { id, tienda, cant, tipo, ref = "", fecha, hora = "", costo = 0 }) {
    const actual = estado.stock[id][tienda];
    const saldo = actual + cant;
    if (!Number.isInteger(cant) || cant === 0) throw new Error("Cantidad inválida para el movimiento");
    if (saldo < 0) throw new Error(`Stock insuficiente: hay ${actual}`);
    estado.stock[id][tienda] = saldo;
    (estado.movs ??= []).push({ fecha, hora, tienda, id, tipo, cant, saldo, ref, costo });
    return saldo;
  }
  /** Verifica que el último saldo del kardex coincida con el stock (invariante). */
  function verificarKardex(estado) {
    const ultimo = {};
    for (const m of estado.movs || []) ultimo[m.id + "|" + m.tienda] = m.saldo;
    const errores = [];
    for (const [k, saldo] of Object.entries(ultimo)) {
      const [id, tienda] = k.split("|");
      if (estado.stock[id]?.[tienda] !== saldo) errores.push({ id, tienda, kardex: saldo, stock: estado.stock[id]?.[tienda] });
    }
    return errores;
  }

  /* ---------- KPIs de inventario ---------- */
  /** Exactitud (IRA), faltantes, sobrantes y merma valorizada A COSTO. */
  function kpiConteos(lineas, costoDe) {
    let exactas = 0, falt = 0, sobra = 0, merma = 0;
    for (const l of lineas) {
      if (l.dif === 0) exactas++;
      else if (l.dif < 0) { falt += -l.dif; merma += -l.dif * cent(costoDe(l.id)); }
      else sobra += l.dif;
    }
    return { lineas: lineas.length, exactas, exactitud: lineas.length ? exactas / lineas.length * 100 : null, faltantes: falt, sobrantes: sobra, mermaCosto: bs(merma) };
  }
  /** Días de cobertura = stock ÷ venta diaria promedio (∞ si no se vende). */
  function cobertura(stock, paresVendidos, dias) {
    const diaria = paresVendidos / dias;
    return diaria > 0 ? stock / diaria : Infinity;
  }

  /* ---------- Calidad y logística (Estación 4: defectos, devoluciones, entregas) ---------- */
  /** Clasifica el motivo libre de una devolución. */
  function tipoDevolucion(motivo = "") {
    const m = motivo.toLowerCase();
    if (/defect|fall|roto|rot[ao]|despeg|cost?ura|suela|fábrica|fabrica/.test(m)) return "defecto";
    if (/talla|número|numero|cambio|grande|pequeñ|chico/.test(m)) return "talla";
    return "otro";
  }
  /**
   * ventas: del periodo (incluye anuladas). pedidos: {fecha, fechaRecibido?, recibido}.
   * - Tasa de devolución = pares devueltos ÷ pares facturados
   * - Tasa de defectos = pares devueltos por defecto ÷ pares facturados
   * - Plazo de entrega = días entre el pedido del Gerente y la recepción en tienda; a tiempo ≤ plazoMeta
   */
  function kpiCalidad(ventas, pedidos, plazoMeta = 3) {
    let vend = 0, dev = 0; const porTipo = { defecto: 0, talla: 0, otro: 0 };
    for (const v of ventas) {
      vend += v.cant;
      if (v.anulada) { dev += v.cant; porTipo[v.tipoAnulacion || tipoDevolucion(v.motivoAnulacion)] += v.cant; }
    }
    const dias = (a, b) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 864e5);
    const recibidos = pedidos.filter(p => p.recibido && p.fechaRecibido).map(p => dias(p.fecha, p.fechaRecibido));
    return {
      pares: vend, devueltos: dev, porTipo,
      tasaDevolucion: vend ? dev / vend * 100 : null,
      tasaDefectos: vend ? porTipo.defecto / vend * 100 : null,
      pedidos: pedidos.length, pendientes: pedidos.filter(p => !p.recibido).length,
      plazoPromedio: recibidos.length ? recibidos.reduce((a, b) => a + b, 0) / recibidos.length : null,
      aTiempo: recibidos.length ? recibidos.filter(d => d <= plazoMeta).length / recibidos.length * 100 : null,
    };
  }

  /* ---------- Migración de datos guardados ---------- */
  const VERSION_ESQUEMA = 7;
  /** v6 → v7: saldo inicial en el kardex, N° de venta y sesiones independientes de la fecha. */
  function migrar(estado, ids, tiendas, hoy) {
    estado.version ??= 6;
    if (estado.version < 7) {
      estado.movs = [];
      for (const id of ids) for (const t of tiendas) {
        const s = estado.stock[id][t];
        estado.movs.push({ fecha: hoy, hora: "", tienda: t, id, tipo: "inicial", cant: s, saldo: s, ref: "Saldo inicial (migración)" });
      }
      estado.nroVenta = {};
      for (const v of estado.ventas) { estado.nroVenta[v.tienda] = (estado.nroVenta[v.tienda] || 0) + 1; v.nro ??= estado.nroVenta[v.tienda]; }
      estado.sesionActiva = {};
      for (const [k, c] of Object.entries(estado.cajas || {})) { c.movs ??= []; if (c.abierta) estado.sesionActiva[c.tienda] = k; }
      estado.version = 7;
    }
    return estado;
  }

  const Dominio = { IVA, IT, cent, bs, redondear, leerCantidad, leerMonto, rankingModelos, facturacionPor, serieDiaria, inventarioValorizado, sumarDias, ventana, enRango, desglose, resumenVentas, variacion,
    esperadoCaja, totalArqueo, moverStock, verificarKardex, kpiConteos, cobertura, tipoDevolucion, kpiCalidad, migrar, VERSION_ESQUEMA };
  if (typeof module !== "undefined" && module.exports) module.exports = Dominio; else global.Dominio = Dominio;
})(typeof window !== "undefined" ? window : globalThis);
