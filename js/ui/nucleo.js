/* Capa de presentación — Núcleo: configuración, estado, persistencia, navegación por roles y render.
   Script clásico: comparte el ámbito global con los demás módulos de js/ui (ver docs/ARQUITECTURA.md). */
const D=window.Dominio; // reglas de negocio puras (js/dominio.js, con pruebas en tests/)
const TIENDAS=["La Paz - El Prado","Cochabamba - Heroínas","Santa Cruz - Ventura Mall"];
const VISTAS=[["escaner","Escáner","i-scan"],["inventario","Inventario","i-box"],["ventas","Ventas","i-cash"],["cierre","Conteo","i-moon"],["caja","Caja","i-caja"],["dashboard","Resumen","i-chart"],["mercado","Mercado","i-globe"]];
const ROLES={
  vendedor:{nombre:"Vendedor",ico:"👟",vistas:["escaner","ventas"],desc:"Escanea el zapato y vende.",tareas:["Reconocer el modelo con la cámara","Consultar stock en las 3 tiendas","Registrar la venta"]},
  encargado:{nombre:"Encargado de tienda",ico:"🏬",vistas:["caja","cierre","inventario","escaner"],desc:"Abre y cierra la caja y cuenta el stock.",tareas:["Apertura y arqueo de caja","Conteo de inventario y faltantes","Reporte Z del día"]},
  gerente:{nombre:"Gerente",ico:"📊",vistas:["dashboard","mercado","inventario"],desc:"Decide con datos de las 3 tiendas.",tareas:["Resumen y semáforo del negocio","Qué hacer hoy","Mercado: base del Excel"]},
};
let rol=null; try{rol=localStorage.getItem("mv_rol")}catch(e){}
if(!ROLES[rol]) rol=null;
const vistasRol=()=>rol?ROLES[rol].vistas:VISTAS.map(v=>v[0]);
const duenoVista=v=>Object.values(ROLES).find(r=>r.vistas.includes(v))?.nombre||"";
const UMBRAL=0.55, KEY="manacoVision_v6", BAJO=5;
const PAGOS={efectivo:["💵","Efectivo"],qr:["📱","QR"],tarjeta:["💳","Tarjeta"]};
const MARGEN_COSTO={"Deportivo":0.62,"Casual cuero (suela caucho)":0.58,"Formal cuero/cuero":0.52}; // costo ≈ % del precio (simulado)
const DENOM=[200,100,50,20,10,5,2,1,0.5,0.2,0.1];
let pago="efectivo";
const cajaKey=(t=tiendaAct())=>hoy()+"|"+t;
// Sesión de caja: la abierta no depende de la fecha; si no hay abierta, la última de hoy. Cada sesión tiene id único.
const sesionesDeHoy=(t=tiendaAct())=>Object.keys(S.cajas||{}).filter(k=>k===cajaKey(t)||k.startsWith(cajaKey(t)+"#")).sort();
const sesionKey=(t=tiendaAct())=>S.sesionActiva?.[t]||sesionesDeHoy(t).at(-1)||cajaKey(t);
const cajaHoy=(t=tiendaAct())=>S.cajas?.[sesionKey(t)];
const cajaAbierta=(t=tiendaAct())=>!!cajaHoy(t)?.abierta;
const conCosto=v=>v.costo!=null?v:{...v,costo:modelo(v.id)?.costo_bs??0};
const chipsPago=()=>Object.entries(PAGOS).map(([k,[i,n]])=>`<button type="button" data-pago="${k}" class="chip ${pago===k?"on":""}">${i} ${n}</button>`).join("");
const NOMC={"Deportivo":"Deportivo","Casual cuero (suela caucho)":"Casual","Formal cuero/cuero":"Formal de cuero"};
let invMax=24, CAT=[], IDX={}, CLASES=[], net=null, head=null, S=null, charts={}, vista="escaner", filtroCat="Todas", tienda=TIENDAS[0];
let dPer=30, dTie="Todas";
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const bs=n=>(Math.round(n)<0?"−":"")+"Bs "+Math.abs(Math.round(n)).toLocaleString("es-BO");
const bsc=n=>(n<-0.004?"−":"")+"Bs "+Math.abs(n).toLocaleString("es-BO",{minimumFractionDigits:2,maximumFractionDigits:2}); // montos de caja con centavos
const fechaLocal=d=>{const x=new Date(d); return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0");};
const hoy=()=>fechaLocal(Date.now());
const diaMenos=k=>fechaLocal(Date.now()-k*864e5);
const tiendaAct=()=>tienda;
const modelo=id=>IDX[id];
const corto=c=>c?esc(c.nombre.split(" - ")[0].replace(/^(DEPORTIVO|ZAPATO DE VESTIR|ZAPATO FORMAL|ZAPATOS?|CASUAL CORDONES|ZAPATILLAS|BOTIN)\s+/i,"").toLowerCase().replace(/(^|\s)\S/g,m=>m.toUpperCase())):"";
const stockTotal=id=>TIENDAS.reduce((a,t)=>a+S.stock[id][t],0);
const deb=(f,ms=180)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>f(...a),ms)}};

function guardar(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){toast("No se pudo guardar en este navegador")}}
let tt; function toast(msg){const t=$("#toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(tt); tt=setTimeout(()=>t.classList.remove("show"),2600);}

function semilla(){
  let r=42; const rnd=()=>(r=(r*9301+49297)%233280)/233280;
  const st={}; CAT.forEach(c=>{st[c.id]={}; TIENDAS.forEach(t=>st[c.id][t]=rnd()<0.03?1+Math.floor(rnd()*4):5+Math.floor(rnd()*20))});
  const peso={"Deportivo":1.4,"Casual cuero (suela caucho)":1.0,"Formal cuero/cuero":0.7};
  const ventas=[];
  for(let d=60; d>=1; d--){
    const f=diaMenos(d);
    TIENDAS.forEach((t,ti)=>CAT.forEach(c=>{
      if(rnd()>Math.min(1,30/CAT.length)) return;
      const rp=rnd();
      ventas.push({fecha:f,hora:"12:00",sesion:f+"|"+t,id:c.id,tienda:t,cant:1+Math.floor(rnd()*2*(peso[c.categoria]||1)*(1+ti*0.2)),precio:c.precio_bs,costo:c.costo_bs,pago:rp<0.55?"efectivo":rp<0.9?"qr":"tarjeta"});
    }));
  }
  const cierres=[];
  for(let d=3; d>=1; d--){const f=diaMenos(d); TIENDAS.forEach(t=>CAT.forEach(c=>{const dif=rnd()<0.008?-1:0; cierres.push({fecha:f,tienda:t,id:c.id,esperado:10,fisico:10+dif,dif})}));}
  const cajas={};
  for(let d=60; d>=1; d--){const f=diaMenos(d); TIENDAS.forEach(t=>{
    const ef=ventas.filter(v=>v.fecha===f&&v.tienda===t&&v.pago==="efectivo").reduce((a,v)=>a+v.cant*v.precio,0);
    const esperado=Math.round(500+ef), r=rnd(), dif=r<0.86?0:[-20,-10,-5,5,10,-50][Math.floor(rnd()*6)];
    cajas[f+"|"+t]={fecha:f,tienda:t,abierta:false,fondo:500,hApertura:"09:00",hCierre:"20:30",esperado,contado:esperado+dif,dif};
  });}
  return {stock:st,inicioDia:{},ventas,cierres,cajas};
}

async function init(){
  try{CAT=await (await fetch("catalogo.json",{cache:"no-cache"})).json();}catch(e){$("#resultado").innerHTML=`<p class="text-error">No se pudo cargar el catálogo. Revisa tu conexión.</p>`;return;}
  CAT.forEach(c=>{if(!c.precio_bs) c.precio_bs=189.3; c.costo_bs=Math.round(c.precio_bs*(MARGEN_COSTO[c.categoria]||0.58)); IDX[c.id]=c;});
  try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){}
  if(!S||!S.stock||!S.cajas||CAT.some(c=>!S.stock[c.id])) S=semilla();
  D.migrar(S,CAT.map(c=>c.id),TIENDAS,hoy()); guardar();
  const errK=D.verificarKardex(S); if(errK.length) console.warn("Kardex descuadrado",errK);
  $$(".selTienda").forEach(sel=>{sel.innerHTML=TIENDAS.map(t=>`<option value="${t}">${sel.closest("header")?t.split(" - ")[0]:t}</option>`).join(""); sel.onchange=()=>{tienda=sel.value; $$(".selTienda").forEach(o=>o.value=tienda); render(); if(ultimo&&ultimo!=="otro") mostrar({clase:ultimo,prob:ultimaProb}); toast("Tienda: "+tienda);};});
  armarNav();
  $$(".btnRol").forEach(b=>b.onclick=abrirInicio);
  $("#inicioTienda").innerHTML=TIENDAS.map(t=>`<option value="${t}">${t}</option>`).join("");
  $("#rolesGrid").innerHTML=Object.entries(ROLES).map(([k,r])=>`<button data-rol="${k}" class="card text-left p-4 md:p-5 hover:border-tinta hover:shadow-lg transition bg-white flex md:flex-col items-center md:items-start gap-4">
    <span class="w-14 h-14 shrink-0 rounded-2xl bg-marca text-white grid place-items-center shadow-sm"><svg class="w-7 h-7" aria-hidden="true"><use href="#i-rol-${k}"/></svg></span>
    <span class="flex-1 min-w-0"><span class="font-bold text-lg block">${r.nombre}</span><span class="text-sm text-mute block leading-snug">${r.desc}</span>
      <span class="text-xs text-marca font-semibold block mt-1.5">${r.vistas.map(v=>VISTAS.find(x=>x[0]===v)[1]).join(" · ")}</span></span>
    <span class="w-9 h-9 shrink-0 rounded-full bg-tinta text-white grid place-items-center md:hidden" aria-hidden="true">›</span>
    <span class="btn btn-n w-full hidden md:inline-flex mt-auto">Entrar</span></button>`).join("");
  $$("[data-rol]").forEach(b=>b.onclick=()=>elegirRol(b.dataset.rol));
  // Ventas
  const llenarSel=q=>{const L=[...CAT].filter(c=>!q||(c.nombre+" "+c.marca).toLowerCase().includes(q)).sort((a,b)=>a.nombre.localeCompare(b.nombre)).slice(0,300);
    $("#vModelo").innerHTML=L.map(c=>`<option value="${c.id}">${esc(c.nombre)} · ${bs(c.precio_bs)}</option>`).join("")||`<option value="">Sin resultados</option>`; $("#vModelo").onchange();};
  $("#vModelo").onchange=()=>{const c=modelo($("#vModelo").value); $("#vImg").src=c?c.imagen:"icons/icon-192.png"; $("#vImg").classList.toggle("opacity-30",!c); $("#vBtn").disabled=!c||!cajaAbierta();};
  $("#vBuscar").oninput=deb(e=>llenarSel(e.target.value.trim().toLowerCase()));
  llenarSel("");
  $$(".stepper button[data-d]").forEach(b=>b.onclick=()=>{const i=$("#vCant"); i.value=Math.min(99,Math.max(1,(parseInt(i.value)||1)+(+b.dataset.d)));});
  // Inventario
  const secc=[...new Set(CAT.map(c=>c.seccion).filter(Boolean))];
  const cats=["Todas",...secc,...new Set(CAT.map(c=>c.categoria)),"Stock bajo"];
  $("#filtros").innerHTML=cats.map(c=>`<button class="chip" data-f="${esc(c)}">${esc(NOMC[c]||c)}</button>`).join("");
  $$("[data-f]").forEach(b=>b.onclick=()=>{filtroCat=b.dataset.f; invMax=24; renderInv();});
  $("#buscar").oninput=deb(()=>{invMax=24; renderInv();});
  $("#invMas").onclick=()=>{invMax+=24; renderInv();};
  $("#cBuscar").oninput=deb(()=>{cPag=0; renderCierre();});
  $("#cSeccion").innerHTML=`<option value="Todas">Todas</option>`+[...new Set(CAT.map(c=>c.seccion).filter(Boolean))].map(x=>`<option>${esc(x)}</option>`).join("");
  $("#cSeccion").onchange=()=>{cPag=0; renderCierre();};
  $("#cPrev").onclick=()=>{cPag=Math.max(0,cPag-1); renderCierre(); $("#cRango").scrollIntoView({block:"center"});};
  $("#cNext").onclick=()=>{cPag++; renderCierre(); $("#cRango").scrollIntoView({block:"center"});};
  $("#cPagOk").onclick=()=>{const t=tiendaAct(), B=borrador(t), porPag=cFiltro==="todo"?POR_PAG_CONTEO:POR_PAG_HOY, L=listaConteo().slice(cPag*porPag,(cPag+1)*porPag); let n=0; L.forEach(c=>{if(B.valores[c.id]==null){B.valores[c.id]=S.stock[c.id][t]; n++;}}); guardar(); renderCierre(); toast(n?`✓ ${n} modelos marcados como correctos`:"Esta página ya estaba contada");};
  // Dashboard
  $("#dPeriodo").innerHTML=[[1,"Hoy"],[7,"7 días"],[30,"30 días"]].map(([v,t])=>`<button data-per="${v}" class="px-3.5 py-1.5 rounded-full text-sm font-medium">${t}</button>`).join("");
  $$("[data-per]").forEach(b=>b.onclick=()=>{dPer=+b.dataset.per; renderDash();});
  $("#dTienda").innerHTML=`<option value="Todas">Las 3 tiendas</option>`+TIENDAS.map(t=>`<option>${t}</option>`).join("");
  $("#dTienda").onchange=e=>{dTie=e.target.value; renderDash();};
  $("#btnReset").onclick=()=>{if(confirm("¿Reiniciar los datos de demostración? Se perderán las ventas y cierres registrados.")){S=semilla(); guardar(); render(); toast("Datos reiniciados");}};
  if(new URLSearchParams(location.search).has("muestra")){ $("#inicio").classList.add("hidden"); abrirMuestra(); }
  const rp=new URLSearchParams(location.search).get("rol"); if(ROLES[rp]) {rol=rp; try{localStorage.setItem("mv_rol",rol)}catch(e){}}
  resultadoVacio(); cargarIA(); initMercado();
  if(rol){armarNav(); ver(location.hash.slice(1)||ROLES[rol].vistas[0]);} else {ver("escaner"); abrirInicio();}
}
function armarNav(){
  const V=VISTAS.filter(([v])=>vistasRol().includes(v)).sort((a,b)=>vistasRol().indexOf(a[0])-vistasRol().indexOf(b[0]));
  $("#navSide").innerHTML=V.map(([v,n,i])=>`<button data-v="${v}" class="nav-item"><svg aria-hidden="true"><use href="#${i}"/></svg>${n}</button>`).join("");
  $("#navBottom").innerHTML=V.map(([v,n,i])=>`<button data-v="${v}" class="tab-item"><svg aria-hidden="true"><use href="#${i}"/></svg>${n}</button>`).join("");
  $$("#navSide [data-v],#navBottom [data-v]").forEach(b=>b.onclick=()=>ver(b.dataset.v));
  $$(".tiendaHeader").forEach(e=>e.classList.toggle("hidden",rol==="gerente"));
  const fija=rol&&rol!=="gerente"; // vendedor y encargado trabajan en SU tienda
  $$(".selTienda").forEach(o=>o.value=tienda);
  $$(".selTienda").forEach(x=>{x.disabled=fija; x.title=fija?"Para cambiar de tienda, cambia de rol":"";});
  $$(".tiendaHeader,.tiendaSide").forEach(l=>l.onclick=()=>{if(fija){toast("Tu tienda se elige al entrar. Toca tu rol para cambiarla."); abrirInicio();}});
  const r=ROLES[rol]; $$(".rolTxt").forEach(e=>e.textContent=r?(e.closest("header")?r.nombre.split(" ")[0]:r.nombre):"Elegir rol"); $$(".rolIco").forEach(e=>e.innerHTML=r?`<svg class="w-full h-full" aria-hidden="true"><use href="#i-rol-${rol}"/></svg>`:"");
}
function abrirInicio(){ $("#inicioTienda").value=tienda; $("#inicio").classList.remove("hidden"); if(stream) cerrarCam(); }
function elegirRol(k){
  rol=k; try{localStorage.setItem("mv_rol",k)}catch(e){}
  tienda=$("#inicioTienda").value; $$(".selTienda").forEach(o=>o.value=tienda);
  $("#inicio").classList.add("hidden"); armarNav(); ver(ROLES[k].vistas[0]);
  toast(`Entraste como ${ROLES[k].nombre}${k!=="gerente"?" · "+tienda.split(" - ")[0]:""}`);
}
function ver(v){
  if(!VISTAS.some(x=>x[0]===v)) v=vistasRol()[0];
  if(!vistasRol().includes(v)){toast(`Esa pantalla es del ${duenoVista(v)}. Toca "${ROLES[rol].nombre}" arriba para cambiar de rol.`); return;}
  vista=v; history.replaceState(null,"","#"+v);
  $$("[data-v]").forEach(b=>{b.classList.toggle("on",b.dataset.v===v); b.setAttribute("aria-current",b.dataset.v===v?"page":"false");});
  $$(".vista").forEach(s=>s.classList.toggle("hidden",s.id!=="v-"+v));
  if(v!=="escaner"&&stream) cerrarCam();
  window.scrollTo({top:0});
  render();
}
function render(){
  if(vista==="inventario") renderInv();
  if(vista==="ventas") renderVentas();
  if(vista==="cierre") renderCierre();
  if(vista==="caja") renderCaja();
  if(vista==="dashboard") renderDash();
  if(vista==="mercado") renderMercado();
}

/* ---------- IA ---------- */
