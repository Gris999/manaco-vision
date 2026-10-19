/* Capa de aplicación — Estado: persistencia (IndexedDB), despacho de acciones, sincronización con el servidor y diálogos.
   Regla: la vista NO modifica S directamente; llama a ejecutar(tipo, datos) → Acciones.aplicar (mismas reglas que el servidor).
   Script clásico: comparte el ámbito global con los demás módulos de js/ui (ver docs/ARQUITECTURA.md). */

/* ---------- Almacén: IndexedDB (cientos de MB) con respaldo en localStorage ---------- */
const Almacen=(()=>{
  let dbp=null;
  const abrir=()=>dbp??=new Promise((ok,mal)=>{try{const r=indexedDB.open("manacoVision",1); r.onupgradeneeded=()=>r.result.createObjectStore("kv"); r.onsuccess=()=>ok(r.result); r.onerror=()=>mal(r.error);}catch(e){mal(e)}});
  const tx=async(modo,fn)=>{const db=await abrir(); return new Promise((ok,mal)=>{const t=db.transaction("kv",modo), q=fn(t.objectStore("kv")); t.oncomplete=()=>ok(q?.result); t.onerror=()=>mal(t.error);});};
  return {
    async leer(k){try{return await tx("readonly",s=>s.get(k));}catch(e){try{return JSON.parse(localStorage.getItem("mv_"+k));}catch(_){return null;}}},
    async escribir(k,v){try{await tx("readwrite",s=>s.put(v,k));}catch(e){try{localStorage.setItem("mv_"+k,JSON.stringify(v));}catch(_){toast("No se pudo guardar en este navegador");}}},
  };
})();
/* Borradores locales (no son operaciones del negocio): conteo en curso y arqueo a medio contar */
let BORR={conteo:{},arqueo:{}};
let guardando=null;
function guardar(){ // agrupa escrituras seguidas en una sola
  clearTimeout(guardando);
  guardando=setTimeout(()=>{Almacen.escribir("estado",S); Almacen.escribir("borradores",BORR);},60);
}
async function cargarEstado(){
  let s=await Almacen.leer("estado");
  if(!s){try{s=JSON.parse(localStorage.getItem(KEY)); if(s){ // migración única desde localStorage (v ≤ 20)
    for(const [k,c] of Object.entries(s.conteos||{})) if(!c.cerrado){(BORR.conteo[k]={valores:c.valores||{},ciego:!!c.ciego}); delete s.conteos[k];}
    localStorage.removeItem(KEY);}}catch(e){}}
  BORR={conteo:{},arqueo:{},...(await Almacen.leer("borradores")||{}),...(Object.keys(BORR.conteo).length?{conteo:BORR.conteo}:{})};
  return s;
}

/* ---------- Despacho de acciones ---------- */
const CTX=()=>({modelo, ids:CAT.map(c=>c.id), tiendas:TIENDAS});
const uid=()=>crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);
/** Ejecuta una operación del negocio. Devuelve el resultado o null (y avisa) si una regla la rechaza. */
function ejecutar(tipo,datos,t=tiendaAct()){
  const ahora=new Date();
  const a={id:uid(),tipo,rol,tienda:t,usuario:Sync.sesion?.usuario||rol,fecha:hoy(),hora:ahora.toTimeString().slice(0,5),ts:ahora.getTime(),datos};
  try{ const r=Acciones.aplicar(S,a,CTX()); Sync.encolar(a); guardar(); return r; }
  catch(e){ toast(e.message||"No se pudo completar la operación"); return null; }
}

/* ---------- Sincronización con el servidor (opcional: sin servidor la app funciona sola) ---------- */
const Sync={
  sesion:null, cola:[], estado:"local", rev:null, // local | sincronizado | pendiente | error
  get activo(){return !!this.sesion?.token;},
  async iniciar(){
    try{this.sesion=JSON.parse(localStorage.getItem("mv_sesion"));}catch(e){}
    this.cola=await Almacen.leer("cola")||[];
    if(this.activo){ this.aplicarSesion(); await this.sincronizar(); setInterval(()=>this.sincronizar(),20000); window.addEventListener("online",()=>this.sincronizar()); }
    this.pintar();
  },
  aplicarSesion(){ rol=this.sesion.rol; if(this.sesion.tienda) tienda=this.sesion.tienda; },
  async api(ruta,op={}){
    const r=await fetch(this.sesion.url.replace(/\/$/,"")+ruta,{...op,headers:{"Content-Type":"application/json",...(this.sesion.token?{Authorization:"Bearer "+this.sesion.token}:{})}});
    const j=await r.json().catch(()=>({}));
    if(r.status===401&&ruta!=="/api/login"){this.salir(true); pintarSesion?.(); $("#inicio")?.classList.remove("hidden"); throw new Error("La sesión expiró, vuelve a entrar");}
    if(!r.ok) throw new Error(j.error||"Error del servidor ("+r.status+")");
    return j;
  },
  async entrar(url,usuario,clave){
    this.sesion={url}; const j=await this.api("/api/login",{method:"POST",body:JSON.stringify({usuario,clave})});
    this.sesion={url,token:j.token,usuario:j.usuario.usuario,nombre:j.usuario.nombre,rol:j.usuario.rol,tienda:j.usuario.tienda};
    localStorage.setItem("mv_sesion",JSON.stringify(this.sesion)); localStorage.setItem("mv_rol",this.sesion.rol);
    this.cola=[]; await Almacen.escribir("cola",[]); this.aplicarSesion(); await this.sincronizar();
  },
  salir(silencioso){ this.sesion=null; localStorage.removeItem("mv_sesion"); this.estado="local"; this.pintar(); if(!silencioso) location.reload(); },
  encolar(a){ if(!this.activo) return; this.cola.push(a); Almacen.escribir("cola",this.cola); this.estado="pendiente"; this.pintar(); this.sincronizar(); },
  enCurso:false,
  async sincronizar(){
    if(!this.activo||this.enCurso||!navigator.onLine) {this.pintar(); return;}
    this.enCurso=true;
    try{
      if(this.cola.length){
        const envio=this.cola.slice(); const j=await this.api("/api/acciones",{method:"POST",body:JSON.stringify({acciones:envio})});
        const hechas=new Set(envio.map(a=>a.id)); this.cola=this.cola.filter(a=>!hechas.has(a.id)); await Almacen.escribir("cola",this.cola);
        if(j.rechazadas?.length) toast("El servidor rechazó "+j.rechazadas.length+" operación(es): "+j.rechazadas[0].error);
      }
      const e=await this.api("/api/estado?rev="+(this.rev??-1)); // solo descarga si hubo cambios en el servidor
      if(!e.sinCambios){ S=e.estado; this.rev=e.rev;
        for(const a of this.cola){try{Acciones.aplicar(S,a,CTX());}catch(_){}} // lo que se hizo mientras tanto sigue visible
        guardar(); if(typeof render==="function"&&vista) render(); }
      this.estado=this.cola.length?"pendiente":"sincronizado";
    }catch(err){ this.estado="error"; console.warn("Sincronización",err); }
    finally{ this.enCurso=false; this.pintar(); }
  },
  pintar(){
    const txt={local:"Solo este equipo",sincronizado:"Sincronizado",pendiente:`${this.cola.length} por enviar`,error:navigator.onLine?"Sin conexión al servidor":"Sin internet · se enviará luego"}[this.estado];
    $$(".syncTxt").forEach(e=>{e.textContent=this.activo?`${this.sesion.nombre} · ${txt}`:txt; e.dataset.estado=this.estado;});
  },
};

/* ---------- Diálogos propios (reemplazan prompt/confirm nativos) ---------- */
/**
 * dialogo({titulo, texto, aceptar, peligro, opciones:[[valor,etiqueta]], campo:{etiqueta, placeholder}})
 * → Promise<null | {opcion, texto}>   (null = cancelado)
 */
function dialogo({titulo,texto="",aceptar="Aceptar",peligro=false,opciones=null,campo=null}){
  return new Promise(ok=>{
    const d=document.createElement("div");
    d.className="fixed inset-0 z-[70] bg-black/50 grid place-items-end sm:place-items-center p-0 sm:p-4";
    d.setAttribute("role","dialog"); d.setAttribute("aria-modal","true"); d.setAttribute("aria-labelledby","dlgT");
    d.innerHTML=`<div class="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 fade">
      <h2 id="dlgT" class="font-bold text-lg">${esc(titulo)}</h2>${texto?`<p class="text-sm text-mute mt-1.5">${esc(texto)}</p>`:""}
      ${opciones?`<div class="grid gap-2 mt-4" role="radiogroup">${opciones.map(([v,n],i)=>`<label class="flex items-center gap-3 rounded-xl border border-linea px-3 py-3 cursor-pointer has-[:checked]:border-tinta has-[:checked]:bg-suave"><input type="radio" name="dlgOp" value="${esc(v)}" ${i===0?"checked":""}><span class="text-sm font-medium">${esc(n)}</span></label>`).join("")}</div>`:""}
      ${campo?`<label class="block mt-4"><span class="text-sm font-medium">${esc(campo.etiqueta)}</span><input id="dlgCampo" class="campo mt-1.5" placeholder="${esc(campo.placeholder||"")}" maxlength="120"></label>`:""}
      <div class="flex gap-2 mt-5"><button type="button" class="btn btn-s flex-1" data-r="no">Cancelar</button><button type="button" class="btn ${peligro?"btn-p":"btn-n"} flex-1" data-r="si">${esc(aceptar)}</button></div></div>`;
    const cerrar=v=>{d.remove(); document.removeEventListener("keydown",tecla); ok(v);};
    const tecla=e=>{if(e.key==="Escape") cerrar(null);};
    d.addEventListener("click",e=>{const b=e.target.closest("[data-r]"); if(e.target===d) cerrar(null); if(!b) return;
      cerrar(b.dataset.r==="si"?{opcion:d.querySelector("[name=dlgOp]:checked")?.value??null,texto:d.querySelector("#dlgCampo")?.value.trim()??""}:null);});
    document.addEventListener("keydown",tecla);
    document.body.appendChild(d); (d.querySelector("#dlgCampo")||d.querySelector("[data-r=si]")).focus();
  });
}
const confirmar=(titulo,texto,aceptar="Sí, continuar",peligro=false)=>dialogo({titulo,texto,aceptar,peligro}).then(r=>!!r);
