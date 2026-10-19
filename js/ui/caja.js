/* Capa de presentación — Caja: sesión, movimientos, arqueo y Reporte Z.
   Script clásico: comparte el ámbito global con los demás módulos de js/ui (ver docs/ARQUITECTURA.md). */
document.addEventListener("click",e=>{const b=e.target.closest("[data-pago]"); if(!b) return; pago=b.dataset.pago; $$("[data-pago]").forEach(x=>x.classList.toggle("on",x.dataset.pago===pago));});
const ventasDeSesion=(t=tiendaAct())=>Acciones.ventasSesion(S,sesionKey(t));
function resumenSesion(t=tiendaAct()){
  const vs=ventasDeSesion(t).map(conCosto), R=D.resumenVentas(vs), cj=cajaHoy(t);
  const fecha=cj?.fecha||hoy(), conteo=S.cierres.filter(c=>c.fecha===fecha&&c.tienda===t), K=D.kpiConteos(conteo,id=>modelo(id)?.costo_bs||0);
  const nros=vs.map(v=>v.nro).filter(Boolean);
  return {...R,vs,conteo:conteo.length,K,rango:nros.length?`N° ${Math.min(...nros)} – ${Math.max(...nros)}`:"—"};
}
function abrirCaja(){
  const r=ejecutar("ABRIR_CAJA",{fondo:$("#fondoIni").value}); if(!r){$("#fondoIni").focus(); return;}
  renderCaja(); toast(`🟢 Caja abierta con ${bsc(r.fondo)}`);
}
function movCaja(){
  const tipo=$("#mcTipo").value, r=ejecutar("MOV_CAJA",{tipo,monto:$("#mcMonto").value,motivo:$("#mcMotivo").value});
  if(r){renderCaja(); toast(`${tipo==="retiro"?"↗ Retiro":"↘ Ingreso"} de ${bsc(r.monto)} registrado`);}
}
const leerArqueo=()=>{const o={}; $$("[data-den]").forEach(i=>o[i.dataset.den]=i.value); return o;};
const arqueoBorrador=()=>BORR.arqueo[sesionKey()]||{};
function actArqueo(){BORR.arqueo[sesionKey()]=leerArqueo(); guardar();
  const cj=cajaHoy(), r=resumenSesion(), esp=D.esperadoCaja(cj,r.porPago.efectivo), t=D.totalArqueo(arqueoBorrador()), d=D.redondear(t-esp);
  $("#arqTotal").textContent=bsc(t); $("#arqDif").textContent=(d>0?"+":"")+bsc(d); $("#arqDif").className="text-2xl font-bold tabular-nums "+(d===0?"text-ok":d<0?"text-marca":"text-aviso");}
async function cerrarCaja(){
  const cj=cajaHoy(), r=resumenSesion(), esperado=D.esperadoCaja(cj,r.porPago.efectivo), arqueo=leerArqueo(), contado=D.totalArqueo(arqueo);
  if(contado===0&&esperado>0){toast("Primero cuenta el efectivo: escribe cuántos billetes y monedas hay"); document.querySelector("[data-den]")?.focus(); return;}
  if(!await confirmar("¿Cerrar la caja?",`Contaste ${bsc(contado)} y el sistema espera ${bsc(esperado)}. Después no se podrá vender en esta sesión.`,"Cerrar caja")) return;
  const k=sesionKey(); if(ejecutar("CERRAR_CAJA",{arqueo})){delete BORR.arqueo[k]; guardar(); renderCaja(); toast("Caja cerrada · Reporte Z listo");}
}
// Demo: permite abrir otra sesión el mismo día (la anterior queda en el historial, como en Odoo)
async function nuevaSesion(){ if(await confirmar("¿Abrir una nueva sesión de caja hoy?","La sesión cerrada queda guardada en el historial.","Nueva sesión")&&ejecutar("NUEVA_SESION",{})) renderCaja(); }
function renderCaja(){
  renderCajaCuerpo();
  // Recorrido del día: dónde estoy y qué sigue
  const t=tiendaAct(); let cj=cajaHoy(); if(cj&&!cj.abierta&&S.permitirNueva?.[t]===hoy()) cj=null;
  const vendio=cj&&resumenSesion().transacciones>0, contado=!!conteoCerrado(t), cerrada=cj&&!cj.abierta;
  const pasos=[["Abrir caja",!!cj],["Vender",vendio||cerrada],["Contar inventario",contado],["Arqueo y cierre",cerrada]];
  const sig=pasos.findIndex(p=>!p[1]);
  const consejo=sig===-1?"Día cerrado. Puedes imprimir el Reporte Z.":cerrada&&!contado?`Caja cerrada, pero <b>falta el conteo de inventario</b>. <button class="underline font-semibold" onclick="ver('cierre')">Hacerlo ahora →</button>`:sig===0?"Empieza abriendo la caja con el fondo para cambio.":sig===1?"Los vendedores ya pueden vender. Cuando termine el día, sigue con el conteo.":sig===2?`Antes de cerrar, <button class="underline font-semibold" onclick="ver('cierre')">haz el conteo de inventario →</button>`:"Cuenta el efectivo abajo y cierra la caja.";
  $("#cajaBody").insertAdjacentHTML("afterbegin",`<div class="mb-5"><ol class="grid grid-cols-4 gap-1.5" aria-label="Pasos del día">${pasos.map(([n,ok],i)=>`<li class="text-center"><div class="h-1.5 rounded-full ${ok?"bg-ok":i===sig?"bg-marca":"bg-linea"}"></div><div class="text-[11px] mt-1.5 leading-tight ${i===sig?"font-bold text-tinta":ok?"text-ok":"text-mute"}">${ok?"✓ ":""}${n}</div></li>`).join("")}</ol>
    <p class="text-sm mt-3 rounded-xl bg-suave px-3 py-2">${consejo}</p></div>`);
}
function renderCajaCuerpo(){
  const t=tiendaAct(); let cj=cajaHoy(); if(cj&&!cj.abierta&&S.permitirNueva?.[t]===hoy()) cj=null;
  const r=resumenSesion();
  $("#cajaTienda").textContent=t+" · "+new Date().toLocaleDateString("es-BO",{weekday:"long",day:"numeric",month:"long"});
  const fila=(k,v,cls="")=>`<div class="flex justify-between gap-3 py-2 border-b border-linea text-sm"><span class="text-mute min-w-0">${k}</span><b class="tabular-nums text-right whitespace-nowrap ${cls}">${v}</b></div>`;
  if(!cj){
    $("#cajaBody").innerHTML=`<div class="card p-6 max-w-lg fade">
      <div class="w-14 h-14 rounded-full bg-marca-50 text-marca grid place-items-center mb-4"><svg class="w-7 h-7" aria-hidden="true"><use href="#i-caja"/></svg></div>
      <h2 class="font-bold text-xl">Apertura de caja</h2><p class="text-sm text-mute mb-5">Cuenta el dinero con el que empiezas (fondo para dar cambio). Mientras la caja no esté abierta, no se puede vender.</p>
      <label class="block mb-5"><span class="text-sm font-medium">Fondo inicial (Bs)</span><input id="fondoIni" type="number" min="0" step="0.1" value="500" inputmode="decimal" class="campo mt-1.5 text-lg font-semibold"></label>
      <button class="btn btn-p w-full" onclick="abrirCaja()">Abrir caja</button></div>`;
    return;
  }
  const ing=(cj.movs||[]).filter(m=>m.tipo==="ingreso").reduce((a,m)=>a+m.monto,0), ret=(cj.movs||[]).filter(m=>m.tipo==="retiro").reduce((a,m)=>a+m.monto,0);
  if(cj.abierta){
    const esp=D.esperadoCaja(cj,r.porPago.efectivo);
    $("#cajaBody").innerHTML=`<div class="grid grid-cols-1 lg:grid-cols-5 gap-5 fade">
      <div class="lg:col-span-2 space-y-4">
        <div class="rounded-2xl bg-ok-50 text-ok px-4 py-3 text-sm font-semibold">🟢 Caja abierta desde las ${cj.hApertura}${cj.fecha!==hoy()?` del ${cj.fecha}`:""}</div>
        <div class="card p-5"><h2 class="font-bold text-lg mb-2">Efectivo de la sesión</h2>
          ${fila("Fondo inicial",bsc(cj.fondo))}${fila("💵 Ventas en efectivo",bsc(r.porPago.efectivo))}${fila("↘ Ingresos",bsc(ing))}${fila("↗ Retiros",bsc(-ret),ret?"text-marca":"")}
          <div class="flex justify-between pt-3 text-base"><span class="font-semibold">Debe haber en caja</span><b class="tabular-nums">${bsc(esp)}</b></div>
          <p class="text-xs text-mute mt-2">QR (${bsc(r.porPago.qr)}) y tarjeta (${bsc(r.porPago.tarjeta)}) no están en la caja física: se concilian con el banco.</p></div>
        <div class="card p-5"><h2 class="font-bold text-lg">Ventas de la sesión</h2><p class="text-xs text-mute mb-2">Si un cliente devuelve o hubo un error, anula la venta: el stock vuelve y la caja se ajusta.</p>
          ${r.vs.length||ventasDeSesion(t).some(v=>v.anulada)?`<div class="space-y-1.5 max-h-64 overflow-y-auto">${ventasDeSesion(t).slice().reverse().map(v=>`<div class="flex items-center gap-2 text-xs ${v.anulada?"opacity-50 line-through":""}"><span class="tabular-nums w-14 shrink-0">N° ${v.nro}</span><span class="flex-1 truncate">${v.cant} × ${corto(modelo(v.id))} · ${(PAGOS[v.pago]||PAGOS.efectivo)[1]}</span><b class="tabular-nums">${bsc(v.cant*v.precio)}</b>${v.anulada?"":`<button class="text-marca font-semibold no-underline shrink-0" onclick="anularVenta(${v.nro})">Anular</button>`}</div>`).join("")}</div>`:`<p class="text-sm text-mute">Aún no hay ventas en esta sesión.</p>`}</div>
        <div class="card p-5"><h2 class="font-bold text-lg">Ingreso o retiro de efectivo</h2><p class="text-xs text-mute mb-3">Ej.: depósito al banco, pago de un servicio, cambio recibido.</p>
          <div class="grid grid-cols-2 gap-2"><select id="mcTipo" class="campo !rounded-xl" aria-label="Tipo"><option value="retiro">↗ Retiro</option><option value="ingreso">↘ Ingreso</option></select>
            <input id="mcMonto" type="number" min="0" step="0.1" inputmode="decimal" placeholder="Monto Bs" class="campo !rounded-xl" aria-label="Monto"></div>
          <input id="mcMotivo" maxlength="60" placeholder="Motivo" class="campo !rounded-xl mt-2" aria-label="Motivo">
          <button class="btn btn-s w-full mt-3" onclick="movCaja()">Registrar movimiento</button>
          ${(cj.movs||[]).length?`<div class="mt-3 space-y-1">${cj.movs.map(m=>`<div class="flex justify-between text-xs"><span>${m.hora} · ${esc(m.motivo)}</span><b class="${m.tipo==="retiro"?"text-marca":"text-ok"}">${m.tipo==="retiro"?"−":"+"}${bsc(m.monto)}</b></div>`).join("")}</div>`:""}</div>
      </div>
      <div class="lg:col-span-3 card p-5 h-fit"><h2 class="font-bold text-lg">Arqueo: cuenta el efectivo</h2><p class="text-sm text-mute mb-4">Escribe cuántos billetes y monedas hay de cada valor.</p>
        <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">${DENOM.map(d=>`<label class="rounded-xl bg-suave p-2 text-center"><span class="text-xs text-mute block">Bs ${String(d).replace(".",",")}</span><input data-den="${d}" type="number" min="0" inputmode="numeric" placeholder="0" class="w-full bg-white rounded-lg text-center font-semibold py-1.5 mt-1" value="${arqueoBorrador()[d]??""}" oninput="actArqueo()" aria-label="Cantidad de Bs ${d}"></label>`).join("")}</div>
        <div class="grid grid-cols-2 gap-3 mt-5">
          <div class="rounded-2xl bg-suave p-4"><div class="text-xs text-mute">Contado</div><div id="arqTotal" class="text-2xl font-bold tabular-nums">Bs 0</div></div>
          <div class="rounded-2xl bg-suave p-4"><div class="text-xs text-mute">Diferencia</div><div id="arqDif" class="text-2xl font-bold tabular-nums"></div></div>
        </div>
        <button class="btn btn-n w-full mt-5" onclick="cerrarCaja()">Cerrar caja y generar Reporte Z</button>
        <p class="text-xs text-mute mt-2">Recomendado: haz antes el <button class="underline" onclick="ver('cierre')">conteo de inventario</button>.</p>
      </div></div>`;
    actArqueo(); return;
  }
  $("#cajaBody").innerHTML=`<div id="reporteZ" class="card p-6 max-w-2xl fade">
    <div class="flex items-start justify-between gap-3 mb-4"><div><div class="text-marca text-2xl font-extrabold italic leading-none">manaco</div><h2 class="font-bold text-2xl mt-2">Reporte Z</h2>
      <div class="text-sm text-mute">${esc(t)} · ${cj.fecha} · ${cj.hApertura}–${cj.hCierre} · ventas ${r.rango}</div></div><span class="text-xs font-semibold bg-tinta text-white px-3 py-1 rounded-full shrink-0">Sesión cerrada</span></div>
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5"><div class="rounded-2xl bg-suave p-3"><div class="text-xs text-mute">Facturado (con IVA)</div><div class="text-lg font-bold tabular-nums">${bsc(r.bruto)}</div></div>
      <div class="rounded-2xl bg-suave p-3"><div class="text-xs text-mute">Pares · ventas</div><div class="text-lg font-bold">${r.pares} · ${r.transacciones}</div></div>
      <div class="rounded-2xl bg-ok-50 p-3 col-span-2 sm:col-span-1"><div class="text-xs text-mute">Utilidad bruta</div><div class="text-lg font-bold text-ok tabular-nums">${bsc(r.utilidad)}</div></div></div>
    <div class="grid grid-cols-2 gap-2 mb-4"><div class="rounded-2xl p-3 ${cj.dif===0?"bg-ok-50":"bg-marca-50"}"><div class="text-xs text-mute">Caja</div><div class="font-bold ${cj.dif===0?"text-ok":"text-marca"}">${cj.dif===0?"✓ Cuadra":(cj.dif>0?"Sobra ":"Falta ")+bsc(Math.abs(cj.dif))}</div></div>
      <div class="rounded-2xl p-3 ${!r.conteo?"bg-aviso-50":r.K.faltantes?"bg-marca-50":"bg-ok-50"}"><div class="text-xs text-mute">Inventario</div><div class="font-bold ${!r.conteo?"text-aviso":r.K.faltantes?"text-marca":"text-ok"}">${!r.conteo?"Conteo pendiente":r.K.faltantes?`Faltan ${r.K.faltantes} pares`:"✓ Cuadra"}</div></div></div>
    <details class="group"><summary class="cursor-pointer font-semibold text-sm py-2 no-print text-marca">Ver detalle contable</summary>
    <h3 class="eyebrow mb-1 mt-2">Cobros por método de pago</h3>${fila("💵 Efectivo",bsc(r.porPago.efectivo))}${fila("📱 QR",bsc(r.porPago.qr))}${fila("💳 Tarjeta",bsc(r.porPago.tarjeta))}${fila("Ticket promedio",bsc(r.ticketPromedio))}${(()=>{const an=ventasDeSesion(t).filter(v=>v.anulada);return an.length?fila("Ventas anuladas (devoluciones)",an.length+" · "+bsc(an.reduce((a,v)=>a+v.cant*v.precio,0)),"text-marca"):""})()}
    <h3 class="eyebrow mt-5 mb-1">Estado de resultados de la sesión</h3>${fila("Venta bruta (precio con IVA)",bsc(r.bruto))}${fila("(−) IVA débito fiscal 13 %",bsc(-r.iva))}${fila("= Venta neta",bsc(r.neto))}${fila("(−) Costo de lo vendido (simulado)",bsc(-r.costo))}${fila("= Utilidad bruta",bsc(r.utilidad),"text-ok")}${fila("Margen bruto (sobre venta neta)",r.margenBruto.toFixed(1).replace(".",",")+" %")}${fila("(−) IT 3 %",bsc(-r.it))}${fila("= Margen de contribución",bsc(r.contribucion))}
    <h3 class="eyebrow mt-5 mb-1">Arqueo de caja</h3>${fila("Fondo inicial",bsc(cj.fondo))}${fila("Ventas en efectivo",bsc(r.porPago.efectivo))}${fila("Ingresos / retiros",bsc(ing)+" / "+bsc(-ret))}${fila("Efectivo esperado",bsc(cj.esperado))}${fila("Efectivo contado",bsc(cj.contado))}${fila("Diferencia",(cj.dif>0?"+":"")+bsc(cj.dif),cj.dif===0?"text-ok":"text-marca")}
    <h3 class="eyebrow mt-5 mb-1">Inventario</h3>${r.conteo?fila("Modelos contados · exactitud",r.K.lineas+" · "+(r.K.exactitud??0).toFixed(0)+" %")+fila("Pares faltantes · merma a costo",r.K.faltantes+" · "+bsc(r.K.mermaCosto),r.K.faltantes?"text-marca":"text-ok"):`<p class="text-sm text-aviso py-2">Conteo de inventario pendiente para hoy.</p>`}
    </details>
    <div class="flex flex-wrap gap-2 mt-6 no-print"><button class="btn btn-n" onclick="window.print()">Imprimir / guardar PDF</button><button class="btn btn-s" onclick="nuevaSesion()">Nueva sesión (demo)</button></div>
  </div>`;
}

/* ---------- PWA: instalación, offline y actualizaciones ---------- */
