/* Capa de presentación — Conteo cíclico de inventario (paginado, con borrador y conteo ciego).
   Script clásico: comparte el ámbito global con los demás módulos de js/ui (ver docs/ARQUITECTURA.md). */
const POR_PAG_CONTEO=20, POR_PAG_HOY=10, ROTACION_DIA=20, TOPE_HOY=35; let cPag=0, cFiltro="hoy";
function borrador(t=tiendaAct()){ S.conteos??={}; const k=hoy()+"|"+t; return S.conteos[k]??={valores:{},cerrado:false}; }
function vendidosHoy(t){const m={}; S.ventas.forEach(v=>{if(!v.anulada&&v.fecha===hoy()&&v.tienda===t) m[v.id]=(m[v.id]||0)+v.cant;}); return m;}
/* Conteo CÍCLICO (práctica estándar de retail): cada día se cuenta un grupo pequeño elegido por el sistema
   y una parte rotativa del catálogo, así todo se cuenta cada ~5 semanas sin contar 725 modelos a la vez. */
function listaDelDia(t=tiendaAct()){
  const vend=vendidosHoy(t), motivo={};
  const add=(id,m)=>{ if(!motivo[id]) motivo[id]=m; };
  Object.keys(vend).forEach(id=>add(id,"Vendido hoy"));
  CAT.filter(c=>S.stock[c.id][t]<BAJO).forEach(c=>add(c.id,"Stock bajo"));
  const W=D.ventana(30,hoy()), porMod={}; S.ventas.forEach(v=>{if(v.tienda===t&&D.enRango(v.fecha,W.desde,W.hasta)) porMod[v.id]=(porMod[v.id]||0)+v.cant;});
  Object.entries(porMod).sort((a,b)=>b[1]-a[1]).slice(0,5).forEach(([id])=>add(id,"Más vendido"));
  const orden=[...CAT].sort((a,b)=>a.id<b.id?-1:1), dia=Math.floor(new Date(hoy()+"T12:00").getTime()/864e5), ini=(dia*ROTACION_DIA)%orden.length;
  for(let k=0;k<ROTACION_DIA;k++) add(orden[(ini+k)%orden.length].id,"Rotación");
  const ids=Object.keys(motivo).slice(0,TOPE_HOY);
  return {ids,motivo};
}
function listaConteo(){
  const t=tiendaAct(), B=borrador(t), q=($("#cBuscar").value||"").trim().toLowerCase(), sec=$("#cSeccion").value, H=listaDelDia(t), enHoy=new Set(H.ids);
  const base=cFiltro==="todo"?CAT:H.ids.map(id=>modelo(id)).filter(Boolean);
  return base.filter(c=>(!q||(c.nombre+" "+c.marca).toLowerCase().includes(q))&&(sec==="Todas"||c.seccion===sec)&&(
      cFiltro==="hoy"||cFiltro==="todo"||(cFiltro==="pendientes"&&B.valores[c.id]==null)||
      (cFiltro==="diferencias"&&B.valores[c.id]!=null&&B.valores[c.id]!==S.stock[c.id][t])));
}
function renderCierre(){
  const t=tiendaAct(), ini=asegurarInicio(t), B=borrador(t), vend=vendidosHoy(t), H=listaDelDia(t);
  $("#cTienda").textContent=t;
  $("#cPanel").classList.toggle("hidden",B.cerrado);
  $("#cRes").innerHTML=B.cerrado?resultadoConteo(B.resultado):"";
  if(B.cerrado) return;
  const hechosHoy=H.ids.filter(id=>B.valores[id]!=null).length, difs=Object.entries(B.valores).filter(([id,v])=>v!==S.stock[id][t]);
  const faltan=difs.reduce((a,[id,v])=>a+Math.max(0,S.stock[id][t]-v),0), extra=Object.keys(B.valores).filter(id=>!H.motivo[id]).length;
  $("#cProg").textContent=`Hoy: ${hechosHoy} de ${H.ids.length} modelos${extra?` (+${extra} extra)`:""}`;
  $("#cBar").style.width=(H.ids.length?hechosHoy/H.ids.length*100:0)+"%";
  $("#cDifRes").innerHTML=difs.length?`<span class="text-[#FF8FAE]">${difs.length} con diferencia · faltan ${faltan} ${faltan===1?"par":"pares"}</span>`:`<span class="text-white/70">${hechosHoy===H.ids.length?"¡Lista de hoy completa!":"Sin diferencias por ahora"}</span>`;
  const ciego=!!B.ciego;
  const F=[["hoy",`Hoy te tocan (${H.ids.length})`],["pendientes",`Pendientes (${H.ids.length-hechosHoy})`],["diferencias",`Con diferencia (${difs.length})`],["todo","Todo el catálogo"]];
  $("#cFiltros").innerHTML=F.map(([k,n])=>`<button class="chip ${cFiltro===k?"on":""}" data-cf="${k}" aria-pressed="${cFiltro===k}">${n}</button>`).join("")+`<button class="chip ${ciego?"on":""}" onclick="borrador().ciego=!borrador().ciego;guardar();renderCierre()" aria-pressed="${ciego}" title="Oculta lo que dice el sistema para no contar de memoria">🙈 Conteo ciego</button>`;
  $$("[data-cf]").forEach(b=>b.onclick=()=>{cFiltro=b.dataset.cf; cPag=0; renderCierre();});
  $("#cBusqueda").classList.toggle("hidden",cFiltro!=="todo");
  const lista=listaConteo(), porPag=cFiltro==="todo"?POR_PAG_CONTEO:POR_PAG_HOY, pags=Math.max(1,Math.ceil(lista.length/porPag)); cPag=Math.min(cPag,pags-1);
  const pg=lista.slice(cPag*porPag,(cPag+1)*porPag);
  $("#cRango").textContent=!lista.length?"Sin modelos para este filtro":cFiltro==="todo"?`${cPag*porPag+1}–${cPag*porPag+pg.length} de ${lista.length} modelos`:`${cPag*porPag+1}–${cPag*porPag+pg.length} de ${lista.length} · elegidos por el sistema`;
  $("#cPagNav").classList.toggle("hidden",pags<=1);
  $("#cPag").textContent=`Página ${cPag+1} de ${pags}`;
  $("#cPrev").disabled=cPag===0; $("#cNext").disabled=cPag>=pags-1; $("#cPagOk").classList.toggle("invisible",!pg.length);
  $("#cPagOk").textContent="✓ Esta página cuadra";
  const tagCls={"Vendido hoy":"bg-marca-50 text-marca","Stock bajo":"bg-aviso-50 text-aviso","Más vendido":"bg-tinta text-white","Rotación":"bg-suave text-mute"};
  $("#listaCierre").innerHTML=pg.map(c=>{const esp=S.stock[c.id][t], v=B.valores[c.id], hecho=v!=null, dif=hecho?v-esp:0, m=H.motivo[c.id];
    return `<div class="card p-3 ${hecho?(dif?"!border-marca":"!border-ok"):""}">
      <div class="flex items-center gap-3">
        <img src="${c.imagen}" loading="lazy" class="w-12 h-12 tile object-contain shrink-0" alt="">
        <div class="flex-1 min-w-0"><div class="font-semibold text-sm leading-tight line-clamp-2">${corto(c)}</div>
          <div class="text-xs text-mute mt-0.5 flex flex-wrap items-center gap-1.5">${ciego?"Cuenta sin mirar el sistema":`Sistema <b class="text-tinta">${esp}</b>`}${m?`<span class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tagCls[m]}">${m}</span>`:""}</div></div>
        <span class="text-xs font-semibold shrink-0 ${hecho&&!ciego?(dif?"text-marca":"text-ok"):"text-mute"}">${hecho?(ciego?"Contado":(dif?`${dif>0?"+":""}${dif}`:"✓ Cuadra")):"Sin contar"}</span>
      </div>
      <div class="flex items-center justify-between gap-2 mt-2.5 pt-2.5 border-t border-linea">
        <div class="stepper flex items-center gap-1"><button type="button" aria-label="Restar un par" onclick="ajustarConteo('${c.id}',-1)">−</button>
          <input data-id="${c.id}" type="number" min="0" inputmode="numeric" value="${hecho?v:""}" placeholder="–" onchange="fijarConteo('${c.id}',this.value)" aria-label="Pares contados de ${esc(c.nombre)}"><button type="button" aria-label="Sumar un par" onclick="ajustarConteo('${c.id}',1)">+</button></div>
        ${hecho?`<button class="text-xs text-mute underline" onclick="fijarConteo('${c.id}','')">Deshacer</button>`:ciego?"":`<button class="btn btn-s !min-h-0 py-1.5 px-3 text-xs" onclick="fijarConteo('${c.id}',${esp})">✓ Hay ${esp}</button>`}
      </div></div>`}).join("")||`<p class="text-mute col-span-full text-center py-8">No hay modelos en este filtro.</p>`;
  $("#cPagOk").classList.toggle("hidden",ciego);
}
function fijarConteo(id,val){const B=borrador(), n=parseInt(val);
  if(val===""||val==null) delete B.valores[id];
  else if(!Number.isFinite(n)){toast("Escribe un número de pares"); renderCierre(); return;}
  else B.valores[id]=Math.max(0,n);
  guardar(); renderCierre();}
function ajustarConteo(id,d){const B=borrador(), base=B.valores[id]??(B.ciego?0:S.stock[id][tiendaAct()]); fijarConteo(id,Math.max(0,base+d));}
function resultadoConteo(R){
  if(!R) return "";
  const cab=R.filas.length
    ?`<div class="flex items-center gap-3"><div class="w-11 h-11 rounded-full bg-marca text-white grid place-items-center font-bold">!</div><div><div class="font-bold">Conteo cerrado con diferencias</div><div class="text-sm">Faltante: <b>${R.falt} ${R.falt===1?"par":"pares"} · merma a costo ${bs(R.monto)}</b>${R.sobra?` · sobrante: ${R.sobra}`:""}</div></div></div>`
    :`<div class="flex items-center gap-3"><div class="w-11 h-11 rounded-full bg-ok text-white grid place-items-center font-bold">✓</div><div><div class="font-bold">Inventario cuadrado</div><div class="text-sm">Todo lo contado coincide con el sistema.</div></div></div>`;
  return `<div class="rounded-2xl p-5 fade ${R.filas.length?"bg-marca-50":"bg-ok-50"}">${cab}
    <div class="text-sm mt-3">Conteo cíclico: contaste <b>${R.contados}</b> modelos a las ${R.hora}. El resto del catálogo se contará en los próximos días (mantiene el stock del sistema).</div>
    ${R.filas.length?`<div class="mt-3 space-y-1.5">${R.filas.slice(0,30).map(f=>`<div class="flex justify-between text-sm bg-white rounded-xl px-3 py-2"><span class="truncate mr-2">${corto(modelo(f.id))}: sistema <b>${f.esp}</b>, contado <b>${f.fis}</b></span><b class="${f.dif<0?'text-marca':'text-ok'}">${f.dif>0?'+':''}${f.dif}</b></div>`).join("")}${R.filas.length>30?`<div class="text-xs text-mute">… y ${R.filas.length-30} más</div>`:""}</div>`:""}
    <button class="btn btn-s mt-4" onclick="reabrirConteo()">Nuevo conteo (demo)</button></div>`;
}
function reabrirConteo(){ if(!confirm("Solo para la demostración: ¿empezar un nuevo conteo hoy?")) return; const k=hoy()+"|"+tiendaAct(); delete S.conteos[k]; guardar(); renderCierre(); }
$("#cBtn").onclick=()=>{
  const t=tiendaAct(), B=borrador(t), ids=Object.keys(B.valores);
  if(!ids.length){toast("Aún no contaste ningún modelo"); return;}
  const H=listaDelDia(t), pendHoy=H.ids.filter(id=>B.valores[id]==null).length, sinContar=CAT.length-ids.length;
  if(!confirm(pendHoy?`Te faltan ${pendHoy} modelos de la lista de hoy. ¿Cerrar igual? Los no contados mantienen el stock del sistema.`:`Vas a cerrar el conteo de hoy (${ids.length} modelos). ¿Continuar?`)) return;
  let falt=0, sobra=0, monto=0; const filas=[];
  S.cierres=S.cierres.filter(c=>!(c.fecha===hoy()&&c.tienda===t)); // un solo conteo vigente por día y tienda
  ids.forEach(id=>{const esp=S.stock[id][t], fis=B.valores[id], dif=fis-esp;
    S.cierres.push({fecha:hoy(),tienda:t,id,esperado:esp,fisico:fis,dif});
    if(dif){filas.push({id,esp,fis,dif}); if(dif<0){falt+=-dif; monto+=-dif*modelo(id).costo_bs;} else sobra+=dif;}
    if(dif) D.moverStock(S,{id,tienda:t,cant:dif,tipo:"ajuste",ref:"Conteo de inventario",fecha:hoy(),hora:new Date().toTimeString().slice(0,5),costo:modelo(id).costo_bs});});
  const lim=diaMenos(3); S.cierres=S.cierres.filter(c=>c.fecha>=lim||c.dif!==0);
  B.cerrado=true; B.resultado={filas:filas.sort((a,b)=>a.dif-b.dif),falt,sobra,monto,contados:ids.length,total:CAT.length,sinContar,hora:new Date().toTimeString().slice(0,5)};
  guardar(); renderCierre();
  window.scrollTo({top:0,behavior:"smooth"}); toast(filas.length?"Conteo cerrado con diferencias":"Conteo cerrado: todo cuadra");
};
/* ---------- DASHBOARD ---------- */
