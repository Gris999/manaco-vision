/* Capa de presentación — PWA: instalación, offline, actualizaciones y arranque.
   Script clásico: comparte el ámbito global con los demás módulos de js/ui (ver docs/ARQUITECTURA.md). */
let eventoInstalar=null;
const esStandalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
const esIOS=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
function mostrarInstalar(v){$$(".btnInstalar").forEach(b=>b.classList.toggle("hidden",!v));}
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault(); eventoInstalar=e; mostrarInstalar(!esStandalone());});
window.addEventListener("appinstalled",()=>{eventoInstalar=null; mostrarInstalar(false); toast("✓ App instalada en tu pantalla de inicio");});
if(!esStandalone()&&esIOS) mostrarInstalar(true);
$$(".btnInstalar").forEach(b=>b.onclick=async()=>{
  if(eventoInstalar){eventoInstalar.prompt(); const r=await eventoInstalar.userChoice; if(r.outcome==="accepted") mostrarInstalar(false); eventoInstalar=null; return;}
  $("#pasosInstalar").innerHTML=esIOS
    ?`<li class="flex gap-3"><span class="w-6 h-6 rounded-full bg-tinta text-white grid place-items-center text-xs shrink-0">1</span><span>Toca <b>Compartir</b> <svg class="inline w-4 h-4 -mt-1" aria-hidden="true"><use href="#i-share"/></svg> en la barra de Safari.</span></li>
      <li class="flex gap-3"><span class="w-6 h-6 rounded-full bg-tinta text-white grid place-items-center text-xs shrink-0">2</span><span>Elige <b>Agregar a pantalla de inicio</b>.</span></li>
      <li class="flex gap-3"><span class="w-6 h-6 rounded-full bg-tinta text-white grid place-items-center text-xs shrink-0">3</span><span>Toca <b>Agregar</b>. Listo: abre Manaco Vision desde su ícono.</span></li>`
    :`<li class="flex gap-3"><span class="w-6 h-6 rounded-full bg-tinta text-white grid place-items-center text-xs shrink-0">1</span><span>Abre el menú <b>⋮</b> del navegador (Chrome o Edge).</span></li>
      <li class="flex gap-3"><span class="w-6 h-6 rounded-full bg-tinta text-white grid place-items-center text-xs shrink-0">2</span><span>Elige <b>Instalar app</b> o <b>Agregar a pantalla de inicio</b>.</span></li>`;
  $("#modalIOS").classList.remove("hidden");
});
$("#modalIOS").addEventListener("click",e=>{if(e.target.id==="modalIOS") e.target.classList.add("hidden");});
function estadoRed(){$("#bannerOffline").classList.toggle("hidden",navigator.onLine);}
window.addEventListener("online",()=>{estadoRed(); toast("Conexión recuperada");}); window.addEventListener("offline",estadoRed); estadoRed();
if("serviceWorker" in navigator&&location.protocol!=="file:"){
  let recargando=false; const teniaControlador=!!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange",()=>{if(teniaControlador&&!recargando){recargando=true; location.reload();}});
  navigator.serviceWorker.register("sw.js").then(reg=>{
    const avisar=w=>{$("#bannerUpdate").classList.remove("hidden"); $("#btnUpdate").onclick=()=>w.postMessage("SKIP_WAITING");};
    // Solo es "nueva versión" si esta página YA estaba controlada por un service worker al cargar
    // (en Safari el primer SW puede tomar el control antes de 'installed' y parecer una actualización).
    if(reg.waiting&&teniaControlador) avisar(reg.waiting);
    reg.addEventListener("updatefound",()=>{const w=reg.installing; w.addEventListener("statechange",()=>{if(w.state==="installed"&&teniaControlador) avisar(w);});});
    setInterval(()=>reg.update(),30*60*1000);
  }).catch(e=>console.warn("SW no registrado",e));
}
window.addEventListener("hashchange",()=>{const v=location.hash.slice(1); if(v&&v!==vista) ver(v);});
init();
