/* Capa de presentación — IA: carga de MobileNet + clasificador, cámara y modo prueba.
   Script clásico: comparte el ámbito global con los demás módulos de js/ui (ver docs/ARQUITECTURA.md). */
function estadoIA(txt,cls){$$(".estadoIA").forEach(e=>{e.querySelector(".txt").textContent=txt; e.querySelector(".dot").className="dot w-2 h-2 rounded-full "+cls;});}
async function cargarIA(){
  try{
    [net,head]=await Promise.all([mobilenet.load({version:2,alpha:1.0,modelUrl:"mobilenet/model.json",inputRange:[0,1]}),tf.loadLayersModel("modelo/model.json",{requestInit:{cache:"no-cache"}})]);
    CLASES=await (await fetch("modelo/clases.json",{cache:"no-cache"})).json();
    estadoIA("IA lista · "+(CLASES.length-1)+" modelos","bg-ok");
  }catch(e){estadoIA("No se pudo cargar la IA","bg-error");console.error(e)}
}
function clasificar(fuente){
  const p=tf.tidy(()=>Array.from(head.predict(net.infer(fuente,true)).dataSync()));
  const i=p.indexOf(Math.max(...p)); return {clase:CLASES[i],prob:p[i],todas:p};
}
let loop=null, stream=null, ultimo=null, ultimaProb=0, estable=0, facing="environment", ultimasTodas=null;
async function abrirCam(){
  if(!navigator.mediaDevices?.getUserMedia){toast("Este navegador no permite usar la cámara. Usa \"Foto\".");return;}
  try{
    stream?.getTracks().forEach(t=>t.stop());
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:facing,width:{ideal:1280}},audio:false});
    const v=$("#video"); v.srcObject=stream; await v.play();
    $("#placeholderCam").classList.add("hidden"); $("#visor").classList.add("scanning"); placeholderOriginal(); $("#liveChip").classList.remove("hidden");
    $("#btnCam span").textContent="Detener";
    clearInterval(loop); loop=setInterval(()=>{
      if(!net||!head||v.readyState<2) return;
      const r=clasificar(v), valido=r.clase!=="otro"&&r.prob>=UMBRAL;
      $("#liveNombre").innerHTML=valido?corto(modelo(r.clase)):"Buscando zapato…";
      $("#livePct").textContent=valido?(r.prob*100).toFixed(0)+"%":"";
      $("#liveBar").style.width=(valido?r.prob*100:6)+"%";
      if(r.clase===ultimo) estable++; else {estable=0; ultimo=r.clase;}
      if(estable===2) mostrar(r);
    },380);
  }catch(e){toast(e.name==="NotAllowedError"?"Permiso de cámara denegado. Actívalo en el navegador o usa \"Foto\".":"No se pudo abrir la cámara. Usa \"Foto\".");}
}
const PH_HTML=()=>`<div><svg class="w-14 h-14 mx-auto mb-3 opacity-80" aria-hidden="true"><use href="#i-cam"/></svg><p class="font-semibold text-white text-lg">Cámara apagada</p><p class="text-sm">Toca <b>Activar</b> o sube una foto del zapato</p></div>`;
function placeholderOriginal(){ $("#placeholderCam").innerHTML=PH_HTML(); }
function cerrarCam(){
  clearInterval(loop); stream?.getTracks().forEach(t=>t.stop()); stream=null;
  $("#placeholderCam").classList.remove("hidden"); $("#visor").classList.remove("scanning"); $("#liveChip").classList.add("hidden");
  $("#btnCam span").textContent="Activar";
}
$("#btnCam").onclick=()=>stream?cerrarCam():abrirCam();
$("#btnFlip").onclick=()=>{facing=facing==="environment"?"user":"environment"; if(stream) abrirCam(); else toast("Cámara "+(facing==="user"?"frontal":"trasera")+" seleccionada");};
$("#foto").onchange=e=>{
  const f=e.target.files[0]; if(!f) return;
  if(!net||!head){toast("La IA aún está cargando…");return;}
  const img=new Image(); img.onload=()=>{const r=clasificar(img); ultimo=r.clase; mostrar(r); URL.revokeObjectURL(img.src);
    if(innerWidth<1024) setTimeout(()=>$("#resultado").scrollIntoView({behavior:"smooth",block:"start"}),60);}; // en celular, mostrar el resultado img.onerror=()=>toast("No se pudo leer la imagen");
  img.src=URL.createObjectURL(f); e.target.value="";
};
function resultadoVacio(){
  $("#resultado").innerHTML=`<div class="py-2">
    <p class="font-bold text-lg mb-3">¿Cómo se usa?</p>
    <ol class="space-y-3 text-sm">
      <li class="flex gap-3"><span class="w-7 h-7 shrink-0 rounded-full bg-tinta text-white grid place-items-center text-xs font-bold">1</span><span>Toca <b>Activar</b> y apunta la cámara al zapato (o sube una <b>Foto</b>).</span></li>
      <li class="flex gap-3"><span class="w-7 h-7 shrink-0 rounded-full bg-tinta text-white grid place-items-center text-xs font-bold">2</span><span>Revisa el modelo. Si no es, toca el correcto en la lista.</span></li>
      <li class="flex gap-3"><span class="w-7 h-7 shrink-0 rounded-full bg-tinta text-white grid place-items-center text-xs font-bold">3</span><span>Elige cómo paga el cliente y toca <b>Vender</b>.</span></li>
    </ol>
    <div class="rounded-2xl bg-suave p-4 mt-5">
      <p class="text-sm font-semibold">¿No tienes zapatos a mano?</p>
      <p class="text-xs text-mute mb-3">Prueba la IA con fotos reales del catálogo.</p>
      <div class="grid grid-cols-1 gap-2">
        <button class="btn btn-p !min-h-0 py-2.5 text-sm" onclick="probarEjemplo()">✨ Probar con un zapato de ejemplo</button>
        <button class="btn btn-s !min-h-0 py-2.5 text-sm" onclick="abrirMuestra()">Mostrar zapatos para apuntar la cámara</button>
      </div></div></div>`;
}
/* Modo prueba: simula lo que vería la cámara con una foto real del catálogo (fondo y ángulo al azar) */
async function probarEjemplo(){
  if(!net||!head){toast("La IA aún está cargando…");return;}
  const c=CAT[Math.floor(Math.random()*CAT.length)], img=new Image(); img.src=c.imagen; await img.decode();
  const cv=document.createElement("canvas"); cv.width=cv.height=320; const x=cv.getContext("2d");
  x.fillStyle=["#d9d4cc","#c9d6e3","#e8e1d6","#bfc8bf","#ddd"][Math.floor(Math.random()*5)]; x.fillRect(0,0,320,320);
  x.translate(160,160); x.rotate((Math.random()*30-15)*Math.PI/180); const w=200+Math.random()*80; x.drawImage(img,-w/2,-w/2,w,w);
  const ph=$("#placeholderCam"); ph.innerHTML=`<img src="${cv.toDataURL("image/jpeg",.85)}" class="w-full h-full object-cover" alt="Foto de prueba"><span class="absolute top-3 left-3 text-[11px] font-semibold bg-white/90 text-tinta px-2 py-1 rounded-full">Modo prueba</span>`;
  const r=clasificar(cv); ultimo=r.clase; mostrar(r);
  if(r.clase!==c.id||r.prob<UMBRAL) toast(`Era: ${c.nombre.split(" - ")[0]}. Si la IA dudó, tócalo en la lista.`);
  if(innerWidth<1024) setTimeout(()=>$("#resultado").scrollIntoView({behavior:"smooth",block:"start"}),60);
}
/* Pantalla de muestra: abre fotos grandes para apuntar la cámara de OTRO teléfono */
let iMuestra=0;
function abrirMuestra(){ iMuestra=Math.floor(Math.random()*CAT.length); pintarMuestra(); $("#muestra").classList.remove("hidden"); if(stream) cerrarCam(); }
function pintarMuestra(){ const c=CAT[(iMuestra%CAT.length+CAT.length)%CAT.length]; $("#muestraImg").src=c.imagen; $("#muestraNombre").textContent=c.nombre; }
function elegir(k,p){ultimo=k; mostrar({clase:k,prob:Math.max(p,UMBRAL),todas:ultimasTodas});}
function mostrar(r){
  if(r.todas) ultimasTodas=r.todas;
  const box=$("#resultado");
  if(r.clase==="otro"||r.prob<UMBRAL||!modelo(r.clase)){
    const opc=(r.todas||ultimasTodas||[]).map((p,i)=>[CLASES[i],p]).filter(x=>x[0]!=="otro"&&modelo(x[0])).sort((a,b)=>b[1]-a[1]).slice(0,3);
    box.innerHTML=`<div class="fade"><div class="flex items-center gap-3 mb-3"><div class="w-12 h-12 shrink-0 rounded-full bg-aviso-50 grid place-items-center text-xl">🤔</div>
      <div><p class="font-semibold leading-tight">La IA no está segura</p><p class="text-xs text-mute">Confianza ${(r.prob*100).toFixed(0)}% · acerca el zapato, mejora la luz o usa un fondo liso</p></div></div>
      ${opc.length?`<p class="text-sm font-semibold mb-1">¿Es alguno de estos?</p>${opc.map(([k,p])=>`<button onclick="elegir('${k}',${p})" class="w-full flex items-center gap-3 text-left text-sm py-2 px-2 -mx-2 rounded-xl hover:bg-suave"><img src="${modelo(k).imagen}" class="w-12 h-12 object-contain rounded-lg bg-suave" alt=""><span class="flex-1 min-w-0"><span class="block truncate font-medium">${corto(modelo(k))}</span><span class="text-xs text-mute">${bs(modelo(k).precio_bs)}</span></span><span class="text-xs tabular-nums text-mute">${(p*100).toFixed(0)}%</span></button>`).join("")}`:""}
      <p class="text-xs text-mute mt-3">Si no está en la lista, búscalo en <b>Ventas</b> por nombre.</p></div>`; return;
  }
  ultimaProb=r.prob;
  const c=modelo(r.clase), t=tiendaAct(), n=S.stock[c.id][t];
  const TD=r.todas||ultimasTodas;
  const top=TD?TD.map((p,i)=>[CLASES[i],p]).filter(x=>x[0]!=="otro"&&modelo(x[0])).sort((a,b)=>b[1]-a[1]).slice(0,3):null;
  box.innerHTML=`<div class="fade">
   <div class="tile aspect-[4/3] grid place-items-center mb-4"><img src="${c.imagen}" class="max-h-full max-w-[80%] object-contain mix-blend-multiply" alt="${esc(c.nombre)}"></div>
   <div class="eyebrow">${esc(c.marca)} · ${esc(NOMC[c.categoria]||c.categoria)}${c.seccion?" · "+esc(c.seccion):""}</div>
   <div class="font-bold text-xl leading-tight mt-0.5">${esc(c.nombre)}</div>
   <div class="flex items-center gap-3 mt-1.5"><span class="text-lg font-semibold">${bs(c.precio_bs)}</span><span class="text-xs font-semibold text-ok bg-ok-50 px-2 py-0.5 rounded-full">IA ${(r.prob*100).toFixed(0)}%</span></div>
   <div class="mt-4 rounded-2xl p-4 flex items-end justify-between ${n<BAJO?'bg-marca-50':'bg-suave'}">
     <div><div class="text-xs text-mute">Stock en ${esc(t)}</div><div class="text-5xl font-extrabold tabular-nums leading-none mt-1">${n}<span class="text-base font-medium text-mute ml-1.5">pares</span></div></div>
     <span class="text-xs font-semibold px-2.5 py-1 rounded-full ${n<BAJO?'bg-marca text-white':'bg-white text-ok'}">${n<BAJO?'Reponer':'Disponible'}</span>
   </div>
   <div class="grid grid-cols-2 gap-2 mt-2">${TIENDAS.filter(x=>x!==t).map(x=>`<div class="rounded-xl border border-linea px-3 py-2"><div class="text-[11px] text-mute truncate">${esc(x)}</div><div class="font-semibold">${S.stock[c.id][x]} pares</div></div>`).join("")}</div>
   ${cajaAbierta()?`<div class="flex gap-2 mt-4 flex-wrap pagos">${chipsPago()}</div>`:`<div class="mt-4 rounded-xl bg-aviso-50 text-aviso text-sm px-3 py-2">🔒 ${cajaHoy()?"La caja ya se cerró hoy":"La caja aún no está abierta"}: el Encargado debe ${cajaHoy()?"abrir una nueva sesión":"abrirla"} para vender.</div>`}
   <div class="grid grid-cols-2 gap-2 mt-3">
     <button class="btn btn-p" onclick="vender('${c.id}',1)" ${n<1||!cajaAbierta()?"disabled":""}>Vender 1 par</button>
     ${rol==="encargado"?`<button class="btn btn-s" onclick="reponer('${c.id}',5)">+5 reponer</button>`:`<button class="btn btn-s" onclick="verKardex('${c.id}')">Ver ficha</button>`}
   </div>
   ${top?`<div class="mt-5 pt-4 border-t border-linea"><div class="text-xs font-semibold mb-2">¿No es este? Toca el correcto</div>${top.map(([k,p])=>`<button onclick="elegir('${k}',${p})" class="w-full flex items-center gap-3 text-left text-sm py-1.5 px-2 -mx-2 rounded-xl hover:bg-suave ${k===c.id?'bg-suave':''}"><img src="${modelo(k).imagen}" class="w-9 h-9 object-contain rounded-lg bg-suave" alt=""><span class="flex-1 truncate">${corto(modelo(k))}</span><span class="barra w-16"><i class="${k===c.id?'bg-marca':'bg-[#CACACB]'}" style="width:${(p*100).toFixed(1)}%"></i></span><span class="w-9 text-right tabular-nums text-xs">${(p*100).toFixed(0)}%</span></button>`).join("")}</div>`:""}
  </div>`;
}

/* ---------- OPERACIONES ---------- */
