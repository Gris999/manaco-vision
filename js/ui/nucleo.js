/* Capa de presentación — Núcleo: configuración, estado, persistencia, navegación por roles y render.
   Script clásico: comparte el ámbito global con los demás módulos de js/ui (ver docs/ARQUITECTURA.md). */
const D=window.Dominio; // reglas de negocio puras (js/dominio.js, con pruebas en tests/)
const TIENDAS=Acciones.TIENDAS;
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

let tt; function toast(msg){const t=$("#toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(tt); tt=setTimeout(()=>t.classList.remove("show"),2600);}

const semilla=()=>Acciones.estadoInicial(CAT,TIENDAS,hoy());

async function init(){
  try{CAT=await (await fetch("catalogo.json",{cache:"no-cache"})).json();}catch(e){$("#resultado").innerHTML=`<p class="text-error">No se pudo cargar el catálogo. Revisa tu conexión.</p>`;return;}
  Acciones.prepararCatalogo(CAT).forEach(c=>IDX[c.id]=c);
  S=await cargarEstado();
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
  $("#btnReset").onclick=async()=>{ if(Sync.activo){toast("Con servidor, los datos se reinician desde el servidor");return;}
    if(await confirmar("¿Reiniciar los datos de demostración?","Se perderán las ventas y cierres registrados en este equipo.","Reiniciar",true)){S=semilla(); BORR={conteo:{},arqueo:{}}; guardar(); render(); toast("Datos reiniciados");}};
  await Sync.iniciar(); pintarSesion();
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
  if(Sync.activo&&k!==Sync.sesion.rol){toast(`Tu usuario es ${ROLES[Sync.sesion.rol].nombre}. Para usar otro rol, cierra sesión.`); return;}
  rol=k; try{localStorage.setItem("mv_rol",k)}catch(e){}
  tienda=Sync.activo&&Sync.sesion.tienda?Sync.sesion.tienda:$("#inicioTienda").value; $$(".selTienda").forEach(o=>o.value=tienda);
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

/* Inicio de sesión (modo servidor) */
function pintarSesion(){
  const box=$("#inicioSesion"); if(!box) return;
  box.innerHTML=Sync.activo
    ?`<div class="flex items-center justify-between gap-3"><div class="min-w-0"><div class="eyebrow">Sesión en el servidor</div><div class="font-semibold truncate">${esc(Sync.sesion.nombre)} · ${esc(ROLES[Sync.sesion.rol]?.nombre||"")}</div><div class="text-xs text-mute truncate">${esc(Sync.sesion.tienda||"Las 3 tiendas")}</div></div><button class="btn btn-s !min-h-0 py-2 px-3 text-sm" onclick="Sync.salir()">Cerrar sesión</button></div>`
    :`<div class="eyebrow mb-2">Modo servidor (datos compartidos)</div>
      <form id="fLogin" class="grid gap-2"><input name="url" class="campo" placeholder="Servidor (ej.: http://localhost:8787)" autocomplete="url" required>
      <div class="grid grid-cols-2 gap-2"><input name="usuario" class="campo" placeholder="Usuario" autocomplete="username" required><input name="clave" type="password" class="campo" placeholder="Contraseña" autocomplete="current-password" required></div>
      <button class="btn btn-n">Iniciar sesión</button></form>`;
  const f=$("#fLogin"); if(!f) return;
  f.url.value=localStorage.getItem("mv_url")||(location.hostname.endsWith("github.io")?"":location.origin); // servido por la API: mismo origen
  f.onsubmit=async e=>{e.preventDefault(); const b=f.querySelector("button"); b.disabled=true; b.textContent="Entrando…";
    try{ localStorage.setItem("mv_url",f.url.value); await Sync.entrar(f.url.value,f.usuario.value.trim(),f.clave.value);
      f.clave.value=""; $("#inicio").classList.add("hidden"); pintarSesion(); armarNav(); ver(ROLES[rol].vistas[0]); toast(`Entraste como ${Sync.sesion.nombre}`);
    }catch(err){ toast(err.message||"No se pudo conectar"); b.disabled=false; b.textContent="Iniciar sesión"; }};
}
