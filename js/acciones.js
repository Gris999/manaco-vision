// @ts-check
/* Acciones de Manaco Vision: ÚNICA forma de cambiar el estado del negocio (patrón reductor / command).
   La misma función corre en el celular (window.Acciones) y en el servidor (require), así ambos validan
   y aplican exactamente las mismas reglas. Depende solo de dominio.js (puro). */
(function (global) {
  "use strict";
  const D = typeof module !== "undefined" && module.exports ? require("./dominio.js") : global.Dominio;

  /** @typedef {"vendedor"|"encargado"|"gerente"} Rol */
  /** @typedef {{id:string, tipo:string, rol:Rol, tienda:string, usuario?:string, fecha:string, hora:string, ts:number, datos:any}} Accion */
  /** @typedef {{modelo:(id:string)=>({precio_bs:number,costo_bs:number}|undefined), ids:string[], tiendas:string[]}} Contexto */

  /** Qué rol puede ejecutar cada acción (se valida en el celular Y en el servidor). */
  const PERMISOS = {
    ABRIR_CAJA: ["encargado"], MOV_CAJA: ["encargado"], CERRAR_CAJA: ["encargado"], NUEVA_SESION: ["encargado"],
    VENDER: ["vendedor", "encargado"], ANULAR: ["encargado"], REPONER: ["encargado"],
    PEDIR: ["gerente"], RECIBIR: ["encargado"], CERRAR_CONTEO: ["encargado"], REABRIR_CONTEO: ["encargado"],
  };
  const MOTIVOS = { defecto: "Defecto de fábrica", talla: "Cambio de talla", otro: "Otro motivo" };

  class ErrorNegocio extends Error {}
  const falla = (/** @type {string} */ m) => { throw new ErrorNegocio(m); };
  /** Texto libre del usuario: recortado, sin caracteres de control y con largo máximo (los datos pueden venir de otros equipos). */
  const texto = (v, max = 120) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);

  /* ---------- Lecturas compartidas (sin efectos) ---------- */
  const cajaKey = (/** @type {string} */ f, /** @type {string} */ t) => f + "|" + t;
  /** Sesión vigente de la tienda: la abierta, o la última del día. */
  function sesionKey(S, t, fecha) {
    if (S.sesionActiva?.[t]) return S.sesionActiva[t];
    const base = cajaKey(fecha, t);
    return Object.keys(S.cajas || {}).filter(k => k === base || k.startsWith(base + "#")).sort().at(-1) || base;
  }
  const sesion = (S, t, fecha) => S.cajas?.[sesionKey(S, t, fecha)];
  function ventasSesion(S, k) {
    const cj = S.cajas?.[k];
    const con = S.ventas.filter(v => v.sesion === k);
    return con.length || !cj?.idx0 ? con : S.ventas.slice(cj.idx0).filter(v => v.tienda === cj.tienda && v.fecha === cj.fecha);
  }
  /** Efectivo que debería haber en la caja de la sesión k. */
  function esperadoSesion(S, k) {
    const cj = S.cajas[k];
    return D.esperadoCaja(cj, D.resumenVentas(ventasSesion(S, k)).porPago.efectivo);
  }
  const pedidoPendiente = (S, id, t) => (S.pedidos || []).some(p => p.id === id && p.tienda === t && !p.recibido);
  function asegurarInicio(S, t, fecha, ctx) {
    S.inicioDia ??= {};
    const k = fecha + "|" + t;
    if (!S.inicioDia[k]) { S.inicioDia[k] = {}; for (const id of ctx.ids) S.inicioDia[k][id] = S.stock[id][t]; }
    return S.inicioDia[k];
  }

  /* ---------- Reductor ---------- */
  /**
   * Valida y aplica una acción sobre el estado S (lo modifica). Lanza ErrorNegocio con un mensaje para el usuario.
   * @param {any} S @param {Accion} a @param {Contexto} ctx @returns {{msg:string, [k:string]:any}}
   */
  function aplicar(S, a, ctx) {
    const P = PERMISOS[a.tipo];
    if (!P) falla("Acción desconocida: " + a.tipo);
    if (!P.includes(a.rol)) falla("Tu rol no puede hacer esta operación");
    if (a.tipo !== "PEDIR" && !ctx.tiendas.includes(a.tienda)) falla("Tienda inválida");
    const { fecha, hora } = a, t = a.tienda, d = a.datos || {};
    S.log ??= [];
    if (S.log.some(x => x.id === a.id)) return { msg: "Ya registrada", repetida: true }; // idempotente (reintentos de red)
    let r;
    switch (a.tipo) {
      case "ABRIR_CAJA": {
        const fondo = D.leerMonto(d.fondo);
        if (fondo == null) falla("Escribe el fondo inicial en Bs (0 si empiezas sin cambio)");
        if (sesion(S, t, fecha)?.abierta) falla("La caja ya está abierta");
        const k = cajaKey(fecha, t) + "#" + a.ts;
        S.cajas[k] = { fecha, tienda: t, abierta: true, fondo, movs: [], hApertura: hora, idx0: S.ventas.length, usuario: a.usuario };
        (S.sesionActiva ??= {})[t] = k; if (S.permitirNueva) delete S.permitirNueva[t];
        asegurarInicio(S, t, fecha, ctx);
        r = { msg: "Caja abierta", fondo, k }; break;
      }
      case "MOV_CAJA": {
        const cj = sesion(S, t, fecha); if (!cj?.abierta) falla("La caja no está abierta");
        const monto = D.leerMonto(d.monto), motivo = texto(d.motivo);
        if (!monto) falla("Escribe un monto mayor a 0");
        if (!motivo) falla("Escribe el motivo (ej.: depósito al banco)");
        if (!["ingreso", "retiro"].includes(d.tipo)) falla("Tipo de movimiento inválido");
        if (d.tipo === "retiro" && monto > esperadoSesion(S, sesionKey(S, t, fecha))) falla("No hay tanto efectivo en caja");
        (cj.movs ??= []).push({ tipo: d.tipo, monto, motivo, hora });
        r = { msg: (d.tipo === "retiro" ? "Retiro" : "Ingreso") + " registrado", monto }; break;
      }
      case "CERRAR_CAJA": {
        const k = sesionKey(S, t, fecha), cj = S.cajas[k]; if (!cj?.abierta) falla("La caja no está abierta");
        const esperado = esperadoSesion(S, k), contado = D.totalArqueo(d.arqueo || {});
        if (contado === 0 && esperado > 0) falla("Primero cuenta el efectivo: escribe cuántos billetes y monedas hay");
        Object.assign(cj, { abierta: false, hCierre: hora, esperado, contado, dif: D.redondear(contado - esperado), arqueo: d.arqueo });
        delete S.sesionActiva[t];
        r = { msg: "Caja cerrada · Reporte Z listo", esperado, contado }; break;
      }
      case "NUEVA_SESION": {
        if (sesion(S, t, fecha)?.abierta) falla("Hay una sesión abierta");
        (S.permitirNueva ??= {})[t] = fecha; r = { msg: "Puedes abrir una nueva sesión" }; break;
      }
      case "VENDER": {
        const c = ctx.modelo(d.id), cant = D.leerCantidad(d.cant);
        if (!c) falla("Modelo inválido");
        if (cant == null) falla("La cantidad debe ser un número entero de 1 a 99");
        if (!["efectivo", "qr", "tarjeta"].includes(d.pago)) falla("Método de pago inválido");
        if (!sesion(S, t, fecha)?.abierta) falla(sesion(S, t, fecha) ? `La caja de ${t.split(" - ")[0]} ya se cerró hoy.` : `Primero el Encargado debe abrir la caja de ${t.split(" - ")[0]}.`);
        asegurarInicio(S, t, fecha, ctx);
        if (S.stock[d.id][t] < cant) falla(`Solo hay ${S.stock[d.id][t]} pares en ${t}`);
        S.nroVenta ??= {};
        const nro = (S.nroVenta[t] = (S.nroVenta[t] || 0) + 1);
        D.moverStock(S, { id: d.id, tienda: t, cant: -cant, tipo: "venta", ref: `Venta N° ${nro}`, fecha, hora, costo: c.costo_bs });
        S.ventas.push({ nro, fecha, hora, sesion: sesionKey(S, t, fecha), id: d.id, tienda: t, cant, precio: c.precio_bs, costo: c.costo_bs, pago: d.pago, usuario: a.usuario });
        r = { msg: "Vendido", nro, cant, total: D.redondear(cant * c.precio_bs) }; break;
      }
      case "ANULAR": {
        const v = S.ventas.find(x => x.tienda === t && x.nro === d.nro);
        if (!v) falla("Venta no encontrada"); if (v.anulada) falla("Esa venta ya está anulada");
        if (!sesion(S, t, fecha)?.abierta) falla("Solo se puede anular con la caja abierta");
        if (!MOTIVOS[d.tipoMotivo]) falla("Elige el motivo de la devolución");
        const det = texto(d.detalle), motivo = MOTIVOS[d.tipoMotivo] + (det ? ": " + det : "");
        if (v.pago === "efectivo" && v.cant * v.precio > esperadoSesion(S, sesionKey(S, t, fecha))) falla("No hay efectivo suficiente en caja para devolver");
        D.moverStock(S, { id: v.id, tienda: t, cant: v.cant, tipo: "devolucion", ref: `Anulación venta N° ${v.nro}: ${motivo}`, fecha, hora, costo: v.costo });
        Object.assign(v, { anulada: true, tipoAnulacion: d.tipoMotivo, motivoAnulacion: motivo, horaAnulacion: hora, sesionAnulacion: sesionKey(S, t, fecha) });
        r = { msg: `Venta N° ${v.nro} anulada · stock devuelto` }; break;
      }
      case "REPONER": {
        const c = ctx.modelo(d.id), cant = D.leerCantidad(d.cant, 999); if (!c || cant == null) falla("Reposición inválida");
        asegurarInicio(S, t, fecha, ctx);
        D.moverStock(S, { id: d.id, tienda: t, cant, tipo: "reposicion", ref: texto(d.ref) || "Reposición", fecha, hora, costo: c.costo_bs });
        S.inicioDia[fecha + "|" + t][d.id] += cant;
        r = { msg: `+${cant} pares`, cant }; break;
      }
      case "PEDIR": {
        if (!ctx.modelo(d.id) || !ctx.tiendas.includes(d.tienda)) falla("Pedido inválido");
        if (pedidoPendiente(S, d.id, d.tienda)) falla("Ya hay un pedido pendiente de ese modelo para esa tienda");
        (S.pedidos ??= []).push({ pid: a.id, fecha, id: d.id, tienda: d.tienda, cant: 10 });
        r = { msg: "Pedido enviado" }; break;
      }
      case "RECIBIR": {
        const p = (S.pedidos || []).find(x => (x.pid ?? "") === d.pid) ?? S.pedidos?.[d.i];
        if (!p || p.recibido) falla("Pedido no encontrado o ya recibido");
        if (p.tienda !== t) falla("Ese pedido es de otra tienda");
        aplicar(S, { ...a, id: a.id + ":rep", tipo: "REPONER", datos: { id: p.id, cant: p.cant, ref: "Pedido de Gerencia" } }, ctx);
        S.log.pop(); // el REPONER interno no se registra aparte
        Object.assign(p, { recibido: true, fechaRecibido: fecha });
        r = { msg: `+${p.cant} pares recibidos` }; break;
      }
      case "CERRAR_CONTEO": {
        const valores = d.valores || {}, ids = Object.keys(valores);
        if (!ids.length) falla("Aún no contaste ningún modelo");
        for (const id of ids) if (!ctx.modelo(id) || !Number.isInteger(valores[id]) || valores[id] < 0) falla("Conteo inválido");
        let falt = 0, sobra = 0, monto = 0; const filas = [];
        S.cierres = (S.cierres || []).filter(c => !(c.fecha === fecha && c.tienda === t)); // un solo conteo vigente por día
        for (const id of ids) {
          const esp = S.stock[id][t], fis = valores[id], dif = fis - esp, costo = ctx.modelo(id).costo_bs;
          S.cierres.push({ fecha, tienda: t, id, esperado: esp, fisico: fis, dif });
          if (dif) {
            filas.push({ id, esp, fis, dif });
            if (dif < 0) { falt += -dif; monto += -dif * costo; } else sobra += dif;
            D.moverStock(S, { id, tienda: t, cant: dif, tipo: "ajuste", ref: "Conteo de inventario", fecha, hora, costo });
          }
        }
        const lim = D.sumarDias(fecha, -3); S.cierres = S.cierres.filter(c => c.fecha >= lim || c.dif !== 0); // historial liviano: exactos de 3 días + todas las diferencias
        const k = fecha + "|" + t; (S.conteos ??= {})[k] ??= { valores: {} };
        Object.assign(S.conteos[k], { valores, cerrado: true, resultado: { filas: filas.sort((x, y) => x.dif - y.dif), falt, sobra, monto: D.redondear(monto), contados: ids.length, total: ctx.ids.length, hora } });
        r = { msg: filas.length ? "Conteo cerrado con diferencias" : "Conteo cerrado: todo cuadra" }; break;
      }
      case "REABRIR_CONTEO": { if (S.conteos) delete S.conteos[fecha + "|" + t]; r = { msg: "Nuevo conteo" }; break; }
    }
    S.log.push({ id: a.id, tipo: a.tipo, tienda: t, usuario: a.usuario, rol: a.rol, fecha, hora });
    return r;
  }

  /* ---------- Catálogo: precio por defecto y costo simulado (igual en celular y servidor) ---------- */
  const MARGEN_COSTO = { "Deportivo": 0.62, "Casual cuero (suela caucho)": 0.58, "Formal cuero/cuero": 0.52 }; // costo ≈ % del precio (SIMULADO)
  const TIENDAS = ["La Paz - El Prado", "Cochabamba - Heroínas", "Santa Cruz - Ventura Mall"];
  function prepararCatalogo(CAT) {
    for (const c of CAT) { if (!c.precio_bs) c.precio_bs = 189.3; c.costo_bs = Math.round(c.precio_bs * (MARGEN_COSTO[c.categoria] || 0.58)); }
    return CAT;
  }

  /* ---------- Estado inicial de demostración (determinista: mismo resultado en celular y servidor) ---------- */
  /** @param {{id:string,categoria:string,precio_bs:number,costo_bs:number}[]} CAT @param {string[]} TIENDAS @param {string} hoy */
  function estadoInicial(CAT, TIENDAS, hoy) {
    let r = 42; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
    const dia = k => D.sumarDias(hoy, -k);
    const st = {}; CAT.forEach(c => { st[c.id] = {}; TIENDAS.forEach(t => st[c.id][t] = rnd() < 0.03 ? 1 + Math.floor(rnd() * 4) : 5 + Math.floor(rnd() * 20)); });
    const peso = { "Deportivo": 1.4, "Casual cuero (suela caucho)": 1.0, "Formal cuero/cuero": 0.7 };
    const ventas = [];
    for (let d = 60; d >= 1; d--) {
      const f = dia(d);
      TIENDAS.forEach((t, ti) => CAT.forEach(c => {
        if (rnd() > Math.min(1, 30 / CAT.length)) return;
        const rp = rnd();
        ventas.push({ fecha: f, hora: "12:00", sesion: f + "|" + t, id: c.id, tienda: t, cant: 1 + Math.floor(rnd() * 2 * (peso[c.categoria] || 1) * (1 + ti * 0.2)), precio: c.precio_bs, costo: c.costo_bs, pago: rp < 0.55 ? "efectivo" : rp < 0.9 ? "qr" : "tarjeta" });
      }));
    }
    const cierres = [];
    for (let d = 3; d >= 1; d--) { const f = dia(d); TIENDAS.forEach(t => CAT.forEach(c => { const dif = rnd() < 0.008 ? -1 : 0; cierres.push({ fecha: f, tienda: t, id: c.id, esperado: 10, fisico: 10 + dif, dif }); })); }
    const cajas = {};
    for (let d = 60; d >= 1; d--) {
      const f = dia(d); TIENDAS.forEach(t => {
        const ef = ventas.filter(v => v.fecha === f && v.tienda === t && v.pago === "efectivo").reduce((a, v) => a + v.cant * v.precio, 0);
        const esperado = Math.round(500 + ef), x = rnd(), dif = x < 0.86 ? 0 : [-20, -10, -5, 5, 10, -50][Math.floor(rnd() * 6)];
        cajas[f + "|" + t] = { fecha: f, tienda: t, abierta: false, fondo: 500, hApertura: "09:00", hCierre: "20:30", esperado, contado: esperado + dif, dif };
      });
    }
    const S = { stock: st, inicioDia: {}, ventas, cierres, cajas, version: 6 };
    return D.migrar(S, CAT.map(c => c.id), TIENDAS, hoy);
  }

  const Acciones = { PERMISOS, MOTIVOS, MARGEN_COSTO, TIENDAS, prepararCatalogo, ErrorNegocio, aplicar, estadoInicial, sesionKey, ventasSesion, esperadoSesion, pedidoPendiente };
  if (typeof module !== "undefined" && module.exports) module.exports = Acciones; else global.Acciones = Acciones;
})(typeof window !== "undefined" ? window : globalThis);
