/* Capa de presentación — Movimientos (Encargado): compras a proveedores y transferencias entre tiendas.
   Todas las operaciones van por ejecutar() → Acciones (REGISTRAR_COMPRA, TRANSFERIR, RECIBIR_TRANSFERENCIA).
   Script clásico: comparte el ámbito global con los demás módulos de js/ui (ver docs/ARQUITECTURA.md). */
let movTab="compras", compraLineas=[];
const opcionesModelo=()=>[...CAT].sort((a,b)=>a.nombre.localeCompare(b.nombre)).map(c=>`<option value="${c.id}">${esc(c.nombre)}</option>`).join("");
let _opcModelo=null; const opcModelo=()=>_opcModelo??=opcionesModelo();

function renderMovimientos(){
  const t=tiendaAct();
  $("#movTienda").textContent=t;
  $("#movTabs").innerHTML=[["compras","Compras"],["transferencias","Transferencias"]].map(([k,n])=>`<button role="tab" aria-selected="${movTab===k}" class="px-4 py-1.5 rounded-full text-sm font-medium ${movTab===k?"bg-tinta text-white":"text-mute"}" onclick="movTab='${k}';renderMovimientos()">${n}</button>`).join("");
  movTab==="compras"?renderCompras(t):renderTransferencias(t);
}

/* ---------- Compras ---------- */
function renderCompras(t){
  const prov=S.proveedores||[], R=D.resumenCompras(compraLineas.length?[{factura:$("#coFac")?.value||"x",lineas:compraLineas}]:[]);
  const mias=(S.compras||[]).filter(c=>c.tienda===t).slice(-8).reverse();
  $("#movBody").innerHTML=`<div class="grid grid-cols-1 lg:grid-cols-5 gap-5">
    <div class="card p-5 lg:col-span-3 h-fit">
      <h2 class="font-semibold text-lg mb-3">Registrar una compra</h2>
      ${prov.length?`<div class="grid sm:grid-cols-2 gap-2 mb-4">
        <label><span class="text-xs text-mute">Proveedor</span><select id="coProv" class="campo mt-1">${prov.map(p=>`<option value="${esc(p.pid)}">${esc(p.nombre)}</option>`).join("")}</select></label>
        <label><span class="text-xs text-mute">N° de factura (para crédito fiscal)</span><input id="coFac" class="campo mt-1" maxlength="20" placeholder="Ej.: 001234"></label></div>
      <div class="rounded-2xl bg-suave p-3 mb-3"><div class="grid grid-cols-1 sm:grid-cols-[1fr_90px_110px_auto] gap-2 items-end">
        <label class="min-w-0"><span class="text-xs text-mute">Modelo</span><select id="coMod" class="campo mt-1">${opcModelo()}</select></label>
        <label><span class="text-xs text-mute">Pares</span><input id="coCant" class="campo mt-1" type="number" min="1" value="12" inputmode="numeric"></label>
        <label><span class="text-xs text-mute">Costo unit. Bs</span><input id="coCosto" class="campo mt-1" inputmode="decimal" placeholder="0,00"></label>
        <button class="btn btn-s" onclick="agregarLineaCompra()">+ Agregar</button></div></div>
      ${compraLineas.length?`<div class="space-y-1.5 mb-4">${compraLineas.map((l,i)=>`<div class="flex items-center gap-2 text-sm bg-white rounded-xl border border-linea px-3 py-2"><span class="flex-1 truncate">${corto(modelo(l.id))}</span><span class="tabular-nums">${l.cant} × ${bsc(l.costo)}</span><b class="tabular-nums w-24 text-right">${bsc(l.cant*l.costo)}</b><button class="text-marca text-xs underline" onclick="compraLineas.splice(${i},1);renderMovimientos()">Quitar</button></div>`).join("")}</div>
      <div class="grid grid-cols-3 gap-2 mb-4 text-center">${[["Total",bsc(R.total)],["Crédito fiscal IVA",bsc(R.creditoFiscal)],["Pares",R.pares]].map(([k,v])=>`<div class="rounded-xl bg-suave p-2"><div class="text-[11px] text-mute">${k}</div><div class="font-bold tabular-nums">${v}</div></div>`).join("")}</div>`
      :`<p class="text-sm text-mute mb-4">Agrega los modelos de la factura. El costo actualiza el <b>costo promedio ponderado</b> del modelo, que se usa desde ahí para la utilidad.</p>`}
      <button class="btn btn-p w-full" onclick="registrarCompra()" ${compraLineas.length?"":"disabled"}>Registrar compra</button>`
      :`<p class="text-sm rounded-xl bg-aviso-50 text-aviso p-3">Aún no hay proveedores. Gerencia debe registrarlos en <b>Admin → Proveedores</b>.</p>`}
    </div>
    <div class="card p-5 lg:col-span-2 h-fit"><h2 class="font-semibold text-lg mb-3">Últimas compras aquí</h2>
      ${mias.length?mias.map(c=>{const r=D.resumenCompras([c]), p=prov.find(x=>x.pid===c.proveedor);return `<div class="py-2 border-b border-linea text-sm"><div class="flex justify-between gap-2"><b class="truncate">${esc(p?.nombre||"—")}</b><b class="tabular-nums">${bsc(r.total)}</b></div><div class="text-xs text-mute">${c.fecha.slice(8)}/${c.fecha.slice(5,7)} ${c.hora} · ${c.factura?"Factura "+esc(c.factura):"Sin factura"} · ${r.pares} pares</div></div>`}).join(""):`<p class="text-sm text-mute">Sin compras registradas.</p>`}
    </div></div>`;
}
function agregarLineaCompra(){
  const id=$("#coMod").value, cant=D.leerCantidad($("#coCant").value,999), costo=D.leerMonto($("#coCosto").value);
  if(cant==null){toast("Pares: un número entero de 1 a 999");return;} if(!costo){toast("Escribe el costo unitario en Bs");return;}
  compraLineas.push({id,cant,costo}); renderMovimientos();
}
async function registrarCompra(){
  const p=(S.proveedores||[]).find(x=>x.pid===$("#coProv").value), fac=$("#coFac").value.trim();
  const R=D.resumenCompras([{factura:fac,lineas:compraLineas}]);
  if(!await confirmar("¿Registrar la compra?",`${p?.nombre} · ${R.pares} pares · ${bsc(R.total)}${fac?" · crédito fiscal "+bsc(R.creditoFiscal):" · sin factura (sin crédito fiscal)"}.`,"Registrar")) return;
  const r=ejecutar("REGISTRAR_COMPRA",{proveedor:p?.pid,factura:fac,lineas:compraLineas}); if(!r) return;
  compraLineas=[]; renderMovimientos(); toast("✓ "+r.msg);
}

/* ---------- Transferencias ---------- */
function renderTransferencias(t){
  const T=S.transferencias||[], porRecibir=T.filter(x=>x.destino===t&&x.estado==="en tránsito"), enviadas=T.filter(x=>x.origen===t).slice(-8).reverse();
  const fila=x=>`<div class="flex items-center gap-2 py-2 border-b border-linea text-sm"><div class="flex-1 min-w-0"><div class="truncate font-medium">${x.cant} × ${corto(modelo(x.id))}</div><div class="text-xs text-mute">${x.fecha.slice(8)}/${x.fecha.slice(5,7)} ${x.hora} · ${esc(x.origen.split(" - ")[0])} → ${esc(x.destino.split(" - ")[0])}</div></div>`;
  $("#movBody").innerHTML=`<div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
    <div class="card p-5 h-fit"><h2 class="font-semibold text-lg mb-3">Enviar a otra tienda</h2>
      <label class="block mb-2"><span class="text-xs text-mute">Modelo</span><select id="trMod" class="campo mt-1">${opcModelo()}</select></label>
      <p class="text-xs text-mute mb-3" id="trStock"></p>
      <div class="grid grid-cols-2 gap-2 mb-4"><label><span class="text-xs text-mute">Pares</span><input id="trCant" class="campo mt-1" type="number" min="1" value="2" inputmode="numeric"></label>
        <label><span class="text-xs text-mute">Destino</span><select id="trDest" class="campo mt-1">${TIENDAS.filter(x=>x!==t).map(x=>`<option value="${x}">${esc(x.split(" - ")[0])}</option>`).join("")}</select></label></div>
      <button class="btn btn-n w-full" onclick="transferir()">Enviar</button>
      <p class="text-xs text-mute mt-3">El stock sale de aquí al enviar y entra al destino cuando su encargado lo <b>recibe</b> (mientras tanto queda "en tránsito").</p></div>
    <div class="card p-5 h-fit"><h2 class="font-semibold text-lg mb-1">Por recibir ${porRecibir.length?`<span class="text-marca">(${porRecibir.length})</span>`:""}</h2>
      ${porRecibir.length?porRecibir.map(x=>fila(x)+`<button class="btn btn-p !min-h-0 py-1.5 px-3 text-xs" onclick="recibirTransferencia('${esc(x.tid)}')">Recibir</button></div>`).join(""):`<p class="text-sm text-mute mb-2">No hay envíos en camino a esta tienda.</p>`}
      <h2 class="font-semibold text-lg mt-5 mb-1">Enviadas</h2>
      ${enviadas.length?enviadas.map(x=>fila(x)+`<span class="text-[11px] font-semibold px-2 py-0.5 rounded-full ${x.estado==="recibida"?"bg-ok-50 text-ok":"bg-aviso-50 text-aviso"}">${x.estado}</span></div>`).join(""):`<p class="text-sm text-mute">Sin envíos.</p>`}</div></div>`;
  const pint=()=>{$("#trStock").textContent=`Hay ${S.stock[$("#trMod").value][t]} pares aquí`;}; $("#trMod").onchange=pint; pint();
}
async function transferir(){
  const id=$("#trMod").value, cant=$("#trCant").value, dest=$("#trDest").value;
  if(!await confirmar("¿Enviar la mercadería?",`${cant} × ${modelo(id).nombre.split(" - ")[0]} a ${dest}.`,"Enviar")) return;
  const r=ejecutar("TRANSFERIR",{id,cant,destino:dest}); if(r){renderMovimientos(); toast("✓ "+r.msg);}
}
function recibirTransferencia(tid){const r=ejecutar("RECIBIR_TRANSFERENCIA",{tid}); if(r){renderMovimientos(); toast("✓ "+r.msg);}}
