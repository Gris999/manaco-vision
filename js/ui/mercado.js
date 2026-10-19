/* Capa de presentación — Mercado: base depurada del Excel del caso.
   Script clásico: comparte el ámbito global con los demás módulos de js/ui (ver docs/ARQUITECTURA.md). */
let MER=[], mf={f:"T",c:"Todos",a:"Todos",p:"Todos"}, mOrden={k:"v",dir:-1}, mPagina=0;
const usd=n=>n>=1e9?(n/1e9).toFixed(2).replace(".",",")+" mil M USD":n>=1e6?(n/1e6).toFixed(1).replace(".",",")+" M USD":Math.round(n).toLocaleString("es-BO")+" USD";
const millP=n=>n>=1e6?(n/1e6).toFixed(1).replace(".",",")+" M":Math.round(n).toLocaleString("es-BO");
async function initMercado(){
  if(innerWidth>=640) $("#mFiltrosBox").open=true; // en celular los filtros parten plegados
  try{MER=await (await fetch("mercado.json",{cache:"no-cache"})).json();}catch(e){$("#mFrase").textContent="No se pudo cargar la base de mercado."; return;}
  const chips=(id,key,opts)=>{$(id).innerHTML=opts.map(([v,t])=>`<button class="chip" data-k="${key}" data-val="${v}">${t}</button>`).join("");};
  chips("#fFlujo","f",[["T","Todo"],["I","Importación (compras)"],["E","Exportación (ventas)"]]);
  chips("#fCat","c",[["Todos","Todos"],...Object.entries({"Deportivo":"Deportivo","Casual cuero (suela caucho)":"Casual de cuero","Formal cuero/cuero":"Formal de cuero"})]);
  chips("#fAnio","a",[["Todos","Todos"],...[...new Set(MER.map(r=>r.a))].sort().map(a=>[a,a])]);
  $("#fPais").innerHTML=`<option value="Todos">Todos los países</option>`+[...new Set(MER.map(r=>r.s))].sort().map(s=>`<option>${esc(s)}</option>`).join("");
  $$("[data-k]").forEach(b=>b.onclick=()=>{mf[b.dataset.k]=b.dataset.val; mPagina=0; renderMercado();});
  $("#fPais").onchange=e=>{mf.p=e.target.value; mPagina=0; renderMercado();};
  $("#mPrev").onclick=()=>{mPagina=Math.max(0,mPagina-1); renderTablaM();};
  $("#mNext").onclick=()=>{mPagina++; renderTablaM();};
  if(vista==="mercado") renderMercado();
}
const NOMM={"Deportivo":"Deportivo","Casual cuero (suela caucho)":"Casual de cuero","Formal cuero/cuero":"Formal de cuero"};
function filtrados(){return MER.filter(r=>(mf.f==="T"||r.f===mf.f)&&(mf.c==="Todos"||r.c===mf.c)&&(mf.a==="Todos"||String(r.a)===String(mf.a))&&(mf.p==="Todos"||r.s===mf.p));}
function renderMercado(){
  if(!MER.length) return;
  $$("[data-k]").forEach(b=>{const on=String(mf[b.dataset.k])===b.dataset.val; b.classList.toggle("on",on); b.setAttribute("aria-pressed",on);});
  const R=filtrados(), V=R.reduce((a,r)=>a+r.v,0), Q=R.reduce((a,r)=>a+r.q,0), vpp=Q?V/Q:0;
  $("#mFiltrosTxt").textContent=[{T:"Todo",I:"Importación",E:"Exportación"}[mf.f],mf.c==="Todos"?"todos los tipos":NOMM[mf.c],mf.a==="Todos"?"2020–2024":mf.a,mf.p==="Todos"?"todos los países":mf.p].join(" · ");
  const vI=R.filter(r=>r.f==="I").reduce((a,r)=>a+r.v,0), vE=R.filter(r=>r.f==="E").reduce((a,r)=>a+r.v,0);
  const que=mf.c==="Todos"?"calzado":"calzado "+NOMM[mf.c].toLowerCase(), cuando=mf.a==="Todos"?"entre 2020 y 2024":"en "+mf.a, donde=mf.p==="Todos"?"":` con ${esc(mf.p)}`;
  $("#mFrase").innerHTML=R.length?`<p class="titular text-2xl sm:text-3xl">${cuando[0].toUpperCase()+cuando.slice(1)}${donde}, España ${mf.f==="E"?"vendió":mf.f==="I"?"compró":"comerció"} <span class="text-[#FF6B93]">${millP(Q)} pares</span> de ${que} por <span class="text-[#FF6B93]">${usd(V)}</span>.</p>
    <p class="text-sm text-white/75 mt-3">Cada par valió en promedio <b class="text-white">${vpp.toFixed(1).replace(".",",")} USD</b>${mf.f==="T"&&vE?` · Por cada dólar que vendió, compró ${(vI/vE).toFixed(1).replace(".",",")}`:""}.</p>`
    :`<p class="titular text-2xl">No hay registros con estos filtros.</p>`;
  $("#mKpis").innerHTML=[["Dinero total",usd(V)],["Pares",millP(Q)],["Valor por par",vpp.toFixed(1).replace(".",",")+" USD"],["Registros",R.length+" de "+MER.length]]
    .map(([k,v])=>`<div class="rounded-2xl bg-suave p-4"><div class="text-xs text-mute">${k}</div><div class="text-lg sm:text-2xl font-bold tabular-nums leading-tight mt-0.5">${v}</div></div>`).join("");
  const anios=[...new Set(MER.map(r=>r.a))].sort();
  const serie=f=>anios.map(a=>R.filter(r=>r.a===a&&r.f===f).reduce((x,r)=>x+r.v,0)/1e6);
  const ds=[]; if(mf.f!=="E") ds.push({label:"Importación",data:serie("I"),backgroundColor:"#E40140",borderRadius:6}); if(mf.f!=="I") ds.push({label:"Exportación",data:serie("E"),backgroundColor:"#111111",borderRadius:6});
  charts.chAnios?.destroy();
  charts.chAnios=new Chart($("#chAnios"),{type:"bar",data:{labels:anios,datasets:ds},options:{responsive:true,maintainAspectRatio:false,
    plugins:{legend:{position:"bottom",labels:{boxWidth:10,usePointStyle:true}},tooltip:{backgroundColor:"#111",callbacks:{label:c=>" "+c.dataset.label+": "+usd(c.raw*1e6)}}},
    scales:{x:{grid:{display:false}},y:{grid:{color:"#F0F0F0"},border:{display:false},ticks:{callback:v=>v.toLocaleString("es-BO")+" M"}}}}});
  const ps={}; R.forEach(r=>ps[r.s]=(ps[r.s]||0)+r.v); const top=Object.entries(ps).sort((a,b)=>b[1]-a[1]).slice(0,8);
  $("#mPaises").innerHTML=top.map(([s,v],i)=>`<button onclick="mf.p=${esc(JSON.stringify(s))};$('#fPais').value=mf.p;renderMercado()" class="w-full text-left"><div class="flex justify-between text-sm mb-1"><span class="font-semibold">${i+1}. ${esc(s)}</span><span class="tabular-nums text-mute">${usd(v)}</span></div><div class="barra"><i class="${i<3?'bg-marca':'bg-[#CACACB]'}" style="width:${v/top[0][1]*100}%"></i></div></button>`).join("")||`<p class="text-sm text-mute">Sin datos</p>`;
  $("#mVQ").innerHTML=Object.entries(NOMM).map(([k,n])=>{const s=R.filter(r=>r.c===k), v=s.reduce((a,r)=>a+r.v,0), q=s.reduce((a,r)=>a+r.q,0), pv=V?v/V*100:0, pq=Q?q/Q*100:0;
    return `<div><div class="font-semibold">${n}</div><div class="text-3xl font-extrabold tracking-tight mt-1">${q?(v/q).toFixed(1).replace(".",","):"–"}<span class="text-sm font-medium text-mute"> USD/par</span></div>
      <div class="flex items-center gap-2 text-xs mt-3 mb-1.5"><span class="w-12 text-mute">Dinero</span><div class="barra flex-1"><i class="bg-marca" style="width:${pv}%"></i></div><span class="w-9 text-right tabular-nums font-semibold">${pv.toFixed(0)}%</span></div>
      <div class="flex items-center gap-2 text-xs"><span class="w-12 text-mute">Pares</span><div class="barra flex-1"><i class="bg-tinta" style="width:${pq}%"></i></div><span class="w-9 text-right tabular-nums font-semibold">${pq.toFixed(0)}%</span></div></div>`}).join("");
  renderTablaM();
}
function renderTablaM(){
  const R=filtrados().map(r=>({...r,p:r.v/r.q})).sort((a,b)=>{const x=a[mOrden.k],y=b[mOrden.k]; return (x>y?1:x<y?-1:0)*mOrden.dir;});
  const POR=15, pags=Math.max(1,Math.ceil(R.length/POR)); mPagina=Math.min(mPagina,pags-1);
  const pg=R.slice(mPagina*POR,(mPagina+1)*POR);
  const cols=[["a","Año"],["f","Movimiento"],["c","Tipo"],["s","País"],["v","Dinero (USD)"],["q","Pares"],["p","USD/par"]];
  $("#mHead").innerHTML=cols.map(([k,t])=>`<th scope="col" class="py-2 px-2 font-semibold whitespace-nowrap"><button data-o="${k}" class="hover:text-tinta">${t}${mOrden.k===k?(mOrden.dir>0?" ↑":" ↓"):""}</button></th>`).join("");
  $$("[data-o]").forEach(th=>th.onclick=()=>{mOrden={k:th.dataset.o,dir:mOrden.k===th.dataset.o?-mOrden.dir:-1}; renderTablaM();});
  const flujo=f=>f==="I"?`<span class="text-marca font-semibold">Importación</span>`:`<span class="font-semibold">Exportación</span>`;
  $("#mTabla").innerHTML=pg.map(r=>`<tr class="border-b border-linea hover:bg-suave"><td class="py-2.5 px-2">${r.a}</td><td class="px-2">${flujo(r.f)}</td><td class="px-2">${NOMM[r.c]}</td><td class="px-2">${esc(r.s)}</td><td class="px-2 tabular-nums">${r.v.toLocaleString("es-BO")}</td><td class="px-2 tabular-nums">${r.q.toLocaleString("es-BO")}</td><td class="px-2 tabular-nums font-semibold">${r.p.toFixed(2).replace(".",",")}</td></tr>`).join("");
  $("#mCards").innerHTML=pg.map(r=>`<div class="rounded-2xl bg-suave p-3.5"><div class="flex justify-between text-sm"><span class="font-semibold">${esc(r.s)} · ${r.a}</span>${flujo(r.f)}</div><div class="text-xs text-mute">${NOMM[r.c]}</div>
    <div class="grid grid-cols-3 gap-2 mt-2 text-xs"><div><div class="text-mute">Dinero</div><b>${usd(r.v)}</b></div><div><div class="text-mute">Pares</div><b>${millP(r.q)}</b></div><div><div class="text-mute">Por par</div><b>${r.p.toFixed(1).replace(".",",")} USD</b></div></div></div>`).join("");
  $("#mCuenta").textContent=`${R.length} registros`;
  $("#mPag").textContent=`Página ${mPagina+1} de ${pags}`;
  $("#mPrev").disabled=mPagina===0; $("#mNext").disabled=mPagina>=pags-1;
}
/* ---------- CAJA: sesión, movimientos de efectivo, arqueo y Reporte Z ---------- */
