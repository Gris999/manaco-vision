/* Capa de presentación — Operaciones: venta, reposición, pedidos y anulación (todas pasan por el kardex).
   Script clásico: comparte el ámbito global con los demás módulos de js/ui (ver docs/ARQUITECTURA.md). */
function asegurarInicio(t){
  const k=hoy()+"|"+t;
  if(!S.inicioDia[k]){S.inicioDia[k]={}; CAT.forEach(c=>S.inicioDia[k][c.id]=S.stock[c.id][t]);}
  return S.inicioDia[k];
}
let ultimaVenta={id:null,t:0};
function vender(id,cant){
  if(ultimaVenta.id===id&&Date.now()-ultimaVenta.t<900) return false; // evita ventas duplicadas por doble toque
  const t=tiendaAct(), c=modelo(id); cant=Math.max(1,parseInt(cant)||1);
  if(!c) return false;
  if(!cajaAbierta(t)){toast(cajaHoy(t)?`La caja de ${t.split(" - ")[0]} ya se cerró hoy.`:`Primero el Encargado debe abrir la caja de ${t.split(" - ")[0]}.`);return false;}
  asegurarInicio(t);
  if(S.stock[id][t]<cant){toast(`Solo hay ${S.stock[id][t]} pares en ${t}`);return false;}
  const nro=(S.nroVenta[t]=(S.nroVenta[t]||0)+1), hora=new Date().toTimeString().slice(0,5);
  D.moverStock(S,{id,tienda:t,cant:-cant,tipo:"venta",ref:`Venta N° ${nro}`,fecha:hoy(),hora,costo:c.costo_bs});
  S.ventas.push({nro,fecha:hoy(),hora,sesion:sesionKey(t),id,tienda:t,cant,precio:c.precio_bs,costo:c.costo_bs,pago});
  ultimaVenta={id,t:Date.now()};
  guardar(); render(); toast(`✓ Vendido: ${cant} × ${c.nombre.split(" - ")[0]} · ${bs(cant*c.precio_bs)} · ${PAGOS[pago][1]}`);
  if(ultimo===id) mostrar({clase:id,prob:ultimaProb||1}); return true;
}
function pedirReposicion(id,t,btn){ S.pedidos??=[]; S.pedidos.push({fecha:hoy(),id,tienda:t,cant:10}); guardar(); if(btn){btn.textContent="Pedido ✓"; btn.disabled=true;} toast(`📦 Pedido de 10 pares de ${modelo(id).nombre.split(" - ")[0]} enviado a ${t.split(" - ")[0]}`); }
const TIPOMOV={inicial:["Saldo inicial","text-mute"],venta:["Venta","text-marca"],reposicion:["Reposición","text-ok"],ajuste:["Ajuste por conteo","text-aviso"],devolucion:["Devolución / anulación","text-ok"]};
function verKardex(id){
  const c=modelo(id), ts=rol==="gerente"?TIENDAS:[tiendaAct()];
  $("#tKardex").textContent=c.nombre;
  const cab=`<div class="flex gap-4 items-center mb-4"><img src="${c.imagen}" class="w-20 h-20 tile object-contain shrink-0" alt=""><div><div class="text-lg font-bold">${bs(c.precio_bs)}</div><div class="text-xs text-mute">${esc(c.marca)} · ${esc(NOMC[c.categoria]||c.categoria)}${c.seccion?" · "+esc(c.seccion):""}</div></div></div>
    <div class="grid grid-cols-3 gap-2 mb-4">${TIENDAS.map(x=>{const m=S.stock[id][x];return `<div class="rounded-xl p-2 text-center ${m<BAJO?"bg-marca-50 text-marca":"bg-suave"} ${x===tiendaAct()&&rol!=="gerente"?"ring-2 ring-tinta":""}"><div class="text-[11px] truncate">${esc(x.split(" - ")[0])}</div><div class="text-xl font-extrabold">${m}</div></div>`}).join("")}</div>
    ${rol==="encargado"?`<button class="btn btn-n w-full mb-4" onclick="reponer('${id}',5);verKardex('${id}')">+5 pares a ${esc(tiendaAct().split(" - ")[0])}</button>`:""}
    <div class="eyebrow mb-2">Movimientos (kardex)</div>`;
  $("#kardexBody").innerHTML=cab+ts.map(t=>{const M=(S.movs||[]).filter(m=>m.id===id&&m.tienda===t), ultimo=M.at(-1)?.saldo, ok=ultimo===S.stock[id][t];
    return `<div class="mb-4"><div class="flex justify-between items-center mb-2"><span class="font-semibold text-sm">${esc(t)}</span>
      <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full ${ok?"bg-ok-50 text-ok":"bg-marca-50 text-marca"}">${ok?"✓ Kardex = stock":"⚠ Descuadre"} · ${S.stock[id][t]} pares</span></div>
      <table class="w-full text-xs"><thead><tr class="text-left text-mute border-b border-linea"><th class="py-1.5 font-medium">Fecha</th><th class="font-medium">Movimiento</th><th class="text-right font-medium">Cant.</th><th class="text-right font-medium">Saldo</th></tr></thead>
      <tbody>${M.slice(-15).reverse().map(m=>`<tr class="border-b border-linea"><td class="py-1.5">${m.fecha.slice(8)}/${m.fecha.slice(5,7)} ${m.hora||""}</td><td><span class="${TIPOMOV[m.tipo]?.[1]||""} font-medium">${TIPOMOV[m.tipo]?.[0]||m.tipo}</span>${m.ref&&m.tipo!=="inicial"?`<div class="text-mute">${esc(m.ref)}</div>`:""}</td><td class="text-right tabular-nums font-semibold">${m.cant>0?"+":""}${m.cant}</td><td class="text-right tabular-nums">${m.saldo}</td></tr>`).join("")}</tbody></table>
      ${M.length>15?`<div class="text-[11px] text-mute mt-1">Mostrando los últimos 15 de ${M.length} movimientos</div>`:""}</div>`;}).join("");
  $("#modalKardex").classList.remove("hidden");
}
$("#modalKardex").addEventListener("click",e=>{if(e.target.id==="modalKardex") e.target.classList.add("hidden");});
document.addEventListener("keydown",e=>{if(e.key==="Escape") $$("#modalKardex,#modalIOS").forEach(m=>m.classList.add("hidden"));});
/* Anulación / devolución: revierte el stock en el kardex y deja la venta marcada (no se borra: trazabilidad) */
function anularVenta(nro){
  const t=tiendaAct(), v=S.ventas.find(x=>x.tienda===t&&x.nro===nro);
  if(!v||v.anulada) return;
  if(!cajaAbierta(t)){toast("Solo se puede anular con la caja abierta");return;}
  const motivo=(prompt(`Anular la venta N° ${nro} (${v.cant} × ${modelo(v.id)?.nombre.split(" - ")[0]} · ${bsc(v.cant*v.precio)}). \nMotivo (ej.: "defecto: suela despegada", "cambio de talla", "no le gustó"):`,"Defecto: suela despegada")||"").trim();
  if(!motivo) return;
  if(v.pago==="efectivo"&&v.cant*v.precio>D.esperadoCaja(cajaHoy(t),resumenSesion(t).porPago.efectivo)){toast("No hay efectivo suficiente en caja para devolver");return;}
  D.moverStock(S,{id:v.id,tienda:t,cant:v.cant,tipo:"devolucion",ref:`Anulación venta N° ${nro}: ${motivo}`,fecha:hoy(),hora:new Date().toTimeString().slice(0,5),costo:v.costo});
  Object.assign(v,{anulada:true,motivoAnulacion:motivo,horaAnulacion:new Date().toTimeString().slice(0,5)});
  guardar(); render(); toast(`Venta N° ${nro} anulada · stock devuelto`);
}
function recibirPedido(i){const p=S.pedidos[i]; if(!p||p.recibido) return; p.recibido=true; p.fechaRecibido=hoy(); reponer(p.id,p.cant,p.tienda);}
function reponer(id,cant,t=tiendaAct()){
  asegurarInicio(t); D.moverStock(S,{id,tienda:t,cant,tipo:"reposicion",ref:"Reposición",fecha:hoy(),hora:new Date().toTimeString().slice(0,5),costo:modelo(id).costo_bs}); S.inicioDia[hoy()+"|"+t][id]+=cant;
  guardar(); render(); toast(`+${cant} pares de ${modelo(id).nombre.split(" - ")[0]} en ${t.split(" - ")[0]}`); if(ultimo===id&&vista==="escaner") mostrar({clase:id,prob:ultimaProb||1});
}
$("#vBtn").onclick=()=>{const id=$("#vModelo").value,n=parseInt($("#vCant").value)||1; if(vender(id,n)) $("#vCant").value=1;};

function renderInv(){
  const q=$("#buscar").value.trim().toLowerCase();
  $$("[data-f]").forEach(b=>b.classList.toggle("on",b.dataset.f===filtroCat));
  const lista=CAT.filter(c=>(filtroCat==="Todas"||c.categoria===filtroCat||c.seccion===filtroCat||(filtroCat==="Stock bajo"&&TIENDAS.some(t=>S.stock[c.id][t]<BAJO)))&&(c.nombre+" "+c.marca).toLowerCase().includes(q));
  const tot=CAT.reduce((a,c)=>a+stockTotal(c.id),0), bajos=CAT.filter(c=>TIENDAS.some(t=>S.stock[c.id][t]<BAJO)).length;
  $("#invResumen").innerHTML=`<b class="text-tinta">${CAT.length}</b> modelos · <b class="text-tinta">${tot.toLocaleString("es-BO")}</b> pares · <b class="text-marca">${bajos}</b> con stock bajo`;
  const t=tiendaAct();
  $("#gridInv").innerHTML=lista.slice(0,invMax).map(c=>{const n=rol==="gerente"?stockTotal(c.id):S.stock[c.id][t], baj=rol==="gerente"?TIENDAS.some(x=>S.stock[c.id][x]<BAJO):n<BAJO; return `<button class="group fade text-left" onclick="verKardex('${c.id}')" aria-label="Ver ${esc(c.nombre)}">
    <div class="tile aspect-square grid place-items-center relative overflow-hidden"><img src="${c.imagen}" loading="lazy" class="w-[82%] h-[82%] object-contain mix-blend-multiply group-hover:scale-105 transition" alt="">
      <span class="absolute bottom-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full ${baj?"bg-marca text-white":"bg-white text-tinta"}">${n} ${rol==="gerente"?"en total":"aquí"}</span></div>
    <div class="pt-2 px-0.5"><div class="font-semibold text-sm leading-tight line-clamp-2">${corto(c)}</div>
      <div class="text-xs text-mute mt-0.5">${bs(c.precio_bs)} · ${esc(c.marca)}</div></div>
  </button>`}).join("")||`<p class="text-mute col-span-full py-10 text-center">Sin resultados para "${esc(q)}"</p>`;
  const ped=(S.pedidos||[]).map((p,i)=>[p,i]).filter(([p])=>!p.recibido&&p.tienda===t&&rol==="encargado");
  $("#invPedidos").innerHTML=ped.length?`<div class="rounded-2xl bg-aviso-50 p-4 mb-5"><div class="font-semibold text-sm mb-2">📦 Pedidos de reposición de Gerencia (${ped.length})</div>${ped.map(([p,i])=>`<div class="flex items-center justify-between gap-2 text-sm py-1"><span class="truncate">${p.cant} pares · ${corto(modelo(p.id))}</span><button class="btn btn-n !min-h-0 py-1.5 px-3 text-xs" onclick="recibirPedido(${i})">Recibir</button></div>`).join("")}</div>`:"";
  $("#invMas").classList.toggle("hidden",lista.length<=invMax);
  $("#invMas").textContent=`Mostrar más (${lista.length-invMax} restantes)`;
}
function renderVentas(){
  const t=tiendaAct(); $("#vTienda").textContent=t;
  $$(".pagos").forEach(e=>e.innerHTML=chipsPago());
  $("#vBtn").disabled=!cajaAbierta()||!$("#vModelo").value;
  $("#vCaja").innerHTML=cajaAbierta()?`<div class="rounded-2xl bg-ok-50 text-ok text-sm px-4 py-2.5 font-medium">🟢 Caja abierta desde las ${cajaHoy().hApertura} · fondo ${bs(cajaHoy().fondo)}</div>`
    :`<div class="rounded-2xl bg-aviso-50 text-aviso text-sm px-4 py-2.5 font-medium">🔒 ${cajaHoy()?"La caja de hoy ya se cerró.":"La caja no está abierta."} Para vender, el Encargado debe ${cajaHoy()?"iniciar una nueva sesión":"abrirla en la pestaña Caja"}.</div>`;
  const vs=S.ventas.filter(v=>v.fecha===hoy()&&v.tienda===t).reverse();
  const ok=vs.filter(v=>!v.anulada), tot=ok.reduce((a,v)=>a+v.cant*v.precio,0), pares=ok.reduce((a,v)=>a+v.cant,0);
  $("#vKpis").innerHTML=[["Facturado",bs(tot)],["Pares",pares],["Ventas",ok.length]].map(([k,v])=>`<div class="rounded-2xl bg-suave p-4"><div class="text-xs text-mute">${k}</div><div class="text-xl sm:text-2xl font-bold tabular-nums">${v}</div></div>`).join("");
  $("#listaVentas").innerHTML=vs.length?vs.map(v=>{const c=modelo(v.id);return c?`<div class="card p-3 flex items-center gap-3 fade">
    <img src="${c.imagen}" class="w-12 h-12 tile object-contain" alt=""><div class="flex-1 min-w-0"><div class="font-semibold text-sm truncate">${corto(c)}</div><div class="text-xs ${v.anulada?"text-marca":"text-mute"}">${v.anulada?"ANULADA · ":""}N° ${v.nro??"—"} · ${v.hora} · ${v.cant} ${v.cant===1?"par":"pares"} · ${(PAGOS[v.pago]||PAGOS.efectivo).join(" ")}</div></div>
    <div class="font-semibold tabular-nums">${bs(v.cant*v.precio)}</div></div>`:""}).join("")
    :`<div class="rounded-2xl bg-suave p-8 text-center text-mute text-sm">Aún no hay ventas hoy en esta tienda.<br>Usa el escáner o el formulario.</div>`;
}
/* ---------- CONTEO DE INVENTARIO (paginado, con borrador) ---------- */
