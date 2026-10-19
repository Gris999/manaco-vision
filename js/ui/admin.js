/* Capa de presentación — Administración (Gerente): proveedores, usuarios (modo servidor), resumen fiscal y exportar a Excel.
   Script clásico: comparte el ámbito global con los demás módulos de js/ui (ver docs/ARQUITECTURA.md). */
let usuariosSrv=null;
function renderAdmin(){
  const prov=S.proveedores||[], hoyF=hoy(), mes=hoyF.slice(0,7);
  const vMes=S.ventas.filter(v=>v.fecha.startsWith(mes)), cMes=(S.compras||[]).filter(c=>c.fecha.startsWith(mes));
  const R=D.resumenVentas(vMes), C=D.resumenCompras(cMes), iva=D.ivaPorPagar(R.iva,C.creditoFiscal);
  const tarjeta=(titulo,sub,cuerpo)=>`<div class="card p-5 h-fit"><h2 class="font-bold text-xl">${titulo}</h2><p class="text-xs text-mute mb-4">${sub}</p>${cuerpo}</div>`;
  $("#admBody").innerHTML=
    tarjeta("Exportar a Excel","Archivo .xlsx con una hoja por tema, para contabilidad",`
      <div class="grid gap-2"><button class="btn btn-n" onclick="exportarExcel('completo')"><svg class="w-4 h-4" aria-hidden="true"><use href="#i-download"/></svg> Reporte completo (todas las hojas)</button>
      <div class="grid grid-cols-2 gap-2">${[["ventas","Ventas"],["inventario","Inventario"],["kardex","Kardex"],["cajas","Cajas (Z)"],["compras","Compras"],["clientes","Clientes"]].map(([k,n])=>`<button class="btn btn-s !min-h-0 py-2 text-sm" onclick="exportarExcel('${k}')">${n}</button>`).join("")}</div></div>`)+
    tarjeta("Resumen fiscal del mes",`IVA a pagar al SIN = débito (ventas) − crédito (compras con factura) · ${mes}`,`
      ${[["IVA débito fiscal (13 % de ventas)",bsc(R.iva)],["(−) IVA crédito fiscal (compras con factura)",bsc(-C.creditoFiscal)],[iva>=0?"= IVA a pagar":"= Saldo a favor",bsc(Math.abs(iva))],["IT 3 % (sobre ventas)",bsc(R.it)]].map(([k,v],i)=>`<div class="flex justify-between gap-3 py-2 border-b border-linea text-sm ${i===2?"font-bold":""}"><span class="${i===2?"":"text-mute"}">${k}</span><b class="tabular-nums">${v}</b></div>`).join("")}
      <p class="text-xs text-mute mt-2">Ventas simuladas + registradas. Las compras con factura ahora sí permiten calcular el IVA neto.</p>`)+
    tarjeta("Proveedores",`${prov.length} registrados · se usan en las compras de las tiendas`,`
      <div class="space-y-1 mb-4">${prov.map(p=>`<div class="flex justify-between gap-2 text-sm py-1.5 border-b border-linea"><span class="truncate"><b>${esc(p.nombre)}</b><span class="text-xs text-mute block">NIT ${esc(p.nit)}${p.contacto?" · "+esc(p.contacto):""}</span></span><span class="text-xs text-mute shrink-0">${(S.compras||[]).filter(c=>c.proveedor===p.pid).length} compras</span></div>`).join("")||`<p class="text-sm text-mute">Ninguno todavía.</p>`}</div>
      <form id="fProv" class="grid gap-2"><input name="nombre" class="campo" placeholder="Razón social" maxlength="80" required><div class="grid grid-cols-2 gap-2"><input name="nit" class="campo" placeholder="NIT" inputmode="numeric" maxlength="15" required><input name="contacto" class="campo" placeholder="Contacto (opcional)" maxlength="80"></div><button class="btn btn-n">Agregar proveedor</button></form>`)+
    tarjeta("Usuarios",Sync.activo?"Cuentas del servidor: cada persona entra con su usuario":"Disponible en modo servidor",`<div id="admUsuarios">${Sync.activo?`<p class="text-sm text-mute">Cargando…</p>`:`<p class="text-sm text-mute">En modo demo el rol se elige libremente. Inicia sesión en el servidor (pantalla de roles) para crear usuarios, desactivarlos o cambiar contraseñas.</p>`}</div>`);
  $("#fProv").onsubmit=e=>{e.preventDefault(); const f=e.target; const r=ejecutar("CREAR_PROVEEDOR",{nombre:f.nombre.value,nit:f.nit.value,contacto:f.contacto.value},""); if(r){renderAdmin(); toast("✓ "+r.msg);}};
  if(Sync.activo) cargarUsuarios();
}
async function cargarUsuarios(){
  try{ usuariosSrv=await Sync.api("/api/usuarios"); }catch(e){ $("#admUsuarios").innerHTML=`<p class="text-sm text-marca">${esc(e.message)}</p>`; return; }
  const {usuarios,tiendas}=usuariosSrv;
  $("#admUsuarios").innerHTML=`<div class="space-y-1 mb-4">${usuarios.map(u=>`<div class="flex items-center gap-2 text-sm py-1.5 border-b border-linea ${u.activo?"":"opacity-50"}"><span class="flex-1 min-w-0 truncate"><b>${esc(u.nombre)}</b><span class="text-xs text-mute block">${esc(u.usuario)} · ${esc(ROLES[u.rol]?.nombre||u.rol)}${u.tienda?" · "+esc(u.tienda.split(" - ")[0]):""}</span></span>
      <button class="text-xs underline" onclick="claveUsuario('${esc(u.usuario)}')">Clave</button>${u.usuario!==Sync.sesion.usuario?`<button class="text-xs underline ${u.activo?"text-marca":"text-ok"}" onclick="activarUsuario('${esc(u.usuario)}',${u.activo?0:1})">${u.activo?"Desactivar":"Activar"}</button>`:""}</div>`).join("")}</div>
    <form id="fUsr" class="grid gap-2"><div class="grid grid-cols-2 gap-2"><input name="usuario" class="campo" placeholder="usuario (ej.: vendedor.lp2)" autocomplete="off" required><input name="nombre" class="campo" placeholder="Nombre" required></div>
      <div class="grid grid-cols-2 gap-2"><select name="rol" class="campo">${Object.entries(ROLES).map(([k,r])=>`<option value="${k}">${r.nombre}</option>`).join("")}</select><select name="tienda" class="campo">${tiendas.map(t=>`<option>${esc(t)}</option>`).join("")}</select></div>
      <input name="clave" type="password" class="campo" placeholder="Contraseña inicial (mín. 8)" autocomplete="new-password" required><button class="btn btn-n">Crear usuario</button></form>`;
  $("#fUsr").onsubmit=async e=>{e.preventDefault(); const f=e.target;
    try{ await Sync.api("/api/usuarios",{method:"POST",body:JSON.stringify({usuario:f.usuario.value,nombre:f.nombre.value,rol:f.rol.value,tienda:f.tienda.value,clave:f.clave.value})}); toast("✓ Usuario creado"); cargarUsuarios(); }catch(err){ toast(err.message); }};
}
async function activarUsuario(usuario,activo){
  if(!activo&&!await confirmar(`¿Desactivar a ${usuario}?`,"No podrá entrar y su sesión actual se cierra.","Desactivar",true)) return;
  try{ await Sync.api("/api/usuarios/editar",{method:"POST",body:JSON.stringify({usuario,activo:!!activo})}); cargarUsuarios(); }catch(e){ toast(e.message); }
}
async function claveUsuario(usuario){
  const r=await dialogo({titulo:`Nueva contraseña para ${usuario}`,campo:{etiqueta:"Contraseña (mínimo 8 caracteres)"},aceptar:"Cambiar"}); if(!r) return;
  try{ await Sync.api("/api/usuarios/editar",{method:"POST",body:JSON.stringify({usuario,clave:r.texto})}); toast("✓ Contraseña cambiada"); }catch(e){ toast(e.message); }
}

/* ---------- Exportar a Excel ---------- */
function hojasExcel(){
  const nom=id=>modelo(id)?.nombre||id, cli=S.clientes||{}, prov=Object.fromEntries((S.proveedores||[]).map(p=>[p.pid,p.nombre]));
  return {
    ventas:{nombre:"Ventas",filas:[["Fecha","Hora","Tienda","N°","Modelo","Pares","Precio Bs","Total Bs","Costo Bs","Pago","Cliente","Vendedor","Anulada","Motivo"],
      ...S.ventas.map(v=>[v.fecha,v.hora,v.tienda,v.nro??"",nom(v.id),v.cant,v.precio,D.redondear(v.cant*v.precio),v.costo,v.pago,v.cliente||"",v.usuario||"",v.anulada?"Sí":"",v.motivoAnulacion||""])]},
    inventario:{nombre:"Inventario",filas:[["Modelo","Categoría","Precio Bs","Costo Bs",...TIENDAS,"Total","Valor a costo Bs"],
      ...CAT.map(c=>{const cos=Acciones.costoDe(S,c.id,CTX()), n=TIENDAS.map(t=>S.stock[c.id][t]), tot=n.reduce((a,b)=>a+b,0); return [c.nombre,c.categoria,c.precio_bs,cos,...n,tot,D.redondear(tot*cos)];})]},
    kardex:{nombre:"Kardex",filas:[["Fecha","Hora","Tienda","Modelo","Tipo","Cantidad","Saldo","Referencia"],...(S.movs||[]).map(m=>[m.fecha,m.hora||"",m.tienda,nom(m.id),m.tipo,m.cant,m.saldo,m.ref||""])]},
    cajas:{nombre:"Cajas (Reporte Z)",filas:[["Fecha","Tienda","Apertura","Cierre","Fondo","Esperado","Contado","Diferencia","Estado"],
      ...Object.values(S.cajas||{}).map(c=>[c.fecha,c.tienda,c.hApertura||"",c.hCierre||"",c.fondo,c.esperado??"",c.contado??"",c.dif??"",c.abierta?"Abierta":"Cerrada"])]},
    compras:{nombre:"Compras",filas:[["Fecha","Tienda","Proveedor","Factura","Modelo","Pares","Costo unit. Bs","Subtotal Bs"],
      ...(S.compras||[]).flatMap(c=>c.lineas.map(l=>[c.fecha,c.tienda,prov[c.proveedor]||"",c.factura||"",nom(l.id),l.cant,l.costo,D.redondear(l.cant*l.costo)]))]},
    clientes:{nombre:"Clientes",filas:[["CI/NIT","Nombre","Teléfono","Segmento","Compras","Monto Bs","Puntos","Última compra"],
      ...D.segmentarClientes(S.ventas,hoy()).map(x=>[x.doc,cli[x.doc]?.nombre||"",cli[x.doc]?.tel||"",x.segmento,x.compras,x.monto,cli[x.doc]?.puntos??0,x.ultima])]},
    transferencias:{nombre:"Transferencias",filas:[["Fecha","Origen","Destino","Modelo","Pares","Estado","Recibida"],...(S.transferencias||[]).map(x=>[x.fecha,x.origen,x.destino,nom(x.id),x.cant,x.estado,x.fechaRecibida||""])]},
  };
}
function descargar(nombre,bytes,tipo="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"){
  const url=URL.createObjectURL(new Blob([bytes],{type:tipo})), a=Object.assign(document.createElement("a"),{href:url,download:nombre});
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),4000);
}
function exportarExcel(cual){
  const H=hojasExcel(), hojas=cual==="completo"?Object.values(H):[H[cual]];
  descargar(`Manaco_${cual}_${hoy()}.xlsx`,Xlsx.crear(hojas)); toast("📥 Excel generado");
}
