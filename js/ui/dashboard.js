/* Capa de presentación — Resumen del Gerente: KPIs, semáforo, gráficos y metas.
   Script clásico: comparte el ámbito global con los demás módulos de js/ui (ver docs/ARQUITECTURA.md). */
let rankN=5;
function renderDash(){
  $$("[data-per]").forEach(b=>{const on=+b.dataset.per===dPer; b.className="px-3.5 py-1.5 rounded-full text-sm font-medium "+(on?"bg-tinta text-white":"text-mute hover:text-tinta"); b.setAttribute("aria-pressed",on);});
  const deT=v=>dTie==="Todas"||v.tienda===dTie, W=D.ventana(dPer,dPer===1?hoy():D.sumarDias(hoy(),-1)) /* 7 y 30 días: días COMPLETOS hasta ayer, para comparar justo */, enW=f=>D.enRango(f,W.desde,W.hasta);
  const vivas=S.ventas.filter(v=>!v.anulada); // las anuladas (devoluciones) no cuentan
  const V=vivas.filter(v=>enW(v.fecha)&&deT(v)).map(conCosto), Vant=vivas.filter(v=>D.enRango(v.fecha,W.antDesde,W.antHasta)&&deT(v)).map(conCosto);
  const R=D.resumenVentas(V), Ra=D.resumenVentas(Vant);
  const tend=dPer===1?null:D.variacion(R.bruto,Ra.bruto); // "Hoy" está en curso: no se compara con un día completo
  const nombrePer={1:"hoy",7:"los últimos 7 días completos",30:"los últimos 30 días completos"}[dPer], antPer={7:"los 7 días anteriores",30:"los 30 días anteriores"}[dPer];
  const donde=dTie==="Todas"?"en las 3 tiendas":"en "+dTie, flecha=v=>v>=0?"▲":"▼";
  const orden=D.rankingModelos(V);
  const C=S.cierres.filter(c=>enW(c.fecha)&&deT(c)), K=D.kpiConteos(C,id=>modelo(id)?.costo_bs||0);
  const tiendasScope=dTie==="Todas"?TIENDAS:[dTie];
  const bajos=[]; CAT.forEach(c=>tiendasScope.forEach(t=>{if(S.stock[c.id][t]<BAJO) bajos.push([c,t,S.stock[c.id][t]])})); bajos.sort((a,b)=>a[2]-b[2]);
  const INV=D.inventarioValorizado(S.stock,CAT.map(c=>c.id),tiendasScope,id=>modelo(id).costo_bs), stockScope=INV.pares;
  const W30=D.ventana(30,D.sumarDias(hoy(),-1)), pares30=vivas.filter(v=>D.enRango(v.fecha,W30.desde,W30.hasta)&&deT(v)).reduce((a,v)=>a+v.cant,0);
  const cob=D.cobertura(stockScope,pares30,30), valInv=INV.valor;
  const tasaMerma=R.neto?K.mermaCosto/R.neto*100:0;
  /* Objetivo SMART 2 del informe: pares sin venta en 90 días ÷ stock total (inventario inmovilizado) */
  const W90=D.ventana(90,hoy()), vend90=new Set(vivas.filter(v=>D.enRango(v.fecha,W90.desde,W90.hasta)&&deT(v)).map(v=>v.id+"|"+v.tienda));
  let sinVenta=0; CAT.forEach(c=>tiendasScope.forEach(t=>{if(!vend90.has(c.id+"|"+t)) sinVenta+=S.stock[c.id][t];}));
  const pctSinVenta=stockScope?sinVenta/stockScope*100:0;

  $("#hero").innerHTML=`<div class="absolute -right-16 -bottom-24 w-72 h-72 rounded-full bg-white/10"></div><div class="absolute right-24 -top-20 w-40 h-40 rounded-full bg-white/10"></div>
    <div class="relative">
      <div class="text-sm text-white/80 mb-2">${nombrePer[0].toUpperCase()+nombrePer.slice(1)} · ${esc(donde)}${dPer>1?` · ${W.desde.slice(8)}/${W.desde.slice(5,7)} al ${W.hasta.slice(8)}/${W.hasta.slice(5,7)}`:""}</div>
      <p class="titular text-2xl sm:text-5xl">${bs(R.bruto)} facturados<br><span class="text-white/85 text-xl sm:text-3xl">${R.pares.toLocaleString("es-BO")} pares vendidos</span></p>
      <div class="flex flex-wrap gap-1.5 sm:gap-2 mt-4 text-xs sm:text-sm">
        ${tend!=null?`<span class="px-3 py-1.5 rounded-full bg-white text-tinta font-semibold"><span class="${tend>=0?'text-ok':'text-marca'}">${flecha(tend)} ${Math.abs(tend).toFixed(0)}%</span> vs. ${antPer}</span>`:`<span class="px-3 py-1.5 rounded-full bg-white/15">Día en curso</span>`}
        <span class="px-3 py-1.5 rounded-full bg-white/15">Utilidad bruta: <b>${bs(R.utilidad)}</b> · margen ${R.margenBruto.toFixed(0)}%</span>
        <span class="px-3 py-1.5 rounded-full bg-white/15">Ticket promedio: <b>${bs(R.ticketPromedio)}</b></span>
        <span class="px-3 py-1.5 rounded-full bg-white/15">Precio promedio por par: <b>${bs(R.precioPromedioPar)}</b></span>
      </div>
    </div>`;

  const est=(a,b)=>a?["Bien","text-ok","bg-ok"]:b?["Atención","text-aviso","bg-aviso"]:["Actuar","text-marca","bg-marca"];
  const T=[
    ["Ventas",bs(R.bruto),tend!=null?`${flecha(tend)} ${Math.abs(tend).toFixed(0)}% respecto a ${antPer}.`:"El día está en curso: compáralo al cerrar.",tend==null?["En curso","text-mute","bg-[#CACACB]"]:est(tend>=0,tend>-10),null],
    ["¿El inventario cuadra?",K.exactitud==null?"—":K.exactitud.toFixed(0)+"%",K.exactitud==null?"Aún no hay conteos en este periodo.":`De cada 100 modelos contados, ${K.exactitud.toFixed(0)} coinciden con el sistema. Meta: 98.`,K.exactitud==null?["Sin datos","text-mute","bg-[#CACACB]"]:est(K.exactitud>=98,K.exactitud>=90),K.exactitud],
    ["Merma de inventario",bs(K.mermaCosto),K.faltantes?`${K.faltantes} pares faltantes, valorizados a costo (${tasaMerma.toFixed(2).replace(".",",")} % de la venta neta).`:"No faltó nada en los conteos.",est(tasaMerma<=0.5,tasaMerma<=1.5),null],
    ["Sin venta en 90 días",pctSinVenta.toFixed(0)+"%",`${sinVenta.toLocaleString("es-BO")} de ${stockScope.toLocaleString("es-BO")} pares en stock no se vendieron en 90 días (inventario inmovilizado). Meta: bajarlo un 20 %.`,est(pctSinVenta<=20,pctSinVenta<=35),null],
    ["Por reponer",bajos.length+(bajos.length===1?" modelo":" modelos"),`Con menos de ${BAJO} pares en alguna tienda. Cobertura general: ${isFinite(cob)?Math.round(cob)+" días":"—"}.`,est(bajos.length===0,bajos.length<=15),null],
  ];
  const filasCat=Object.keys(NOMC).map(k=>{const r=D.resumenVentas(V.filter(v=>modelo(v.id)?.categoria===k)); return [NOMC[k],r];});
  const maxG=Math.max(...filasCat.map(f=>f[1].utilidad),1);
  $("#ganancias").innerHTML=`<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
      <div class="rounded-2xl bg-suave p-3"><div class="text-xs text-mute">Venta neta (sin IVA)</div><div class="text-lg font-extrabold tabular-nums">${bs(R.neto)}</div></div>
      <div class="rounded-2xl bg-ok-50 p-3"><div class="text-xs text-mute">Utilidad bruta</div><div class="text-lg font-extrabold text-ok tabular-nums">${bs(R.utilidad)}</div></div>
      <div class="rounded-2xl bg-suave p-3"><div class="text-xs text-mute">Margen bruto</div><div class="text-lg font-extrabold">${R.margenBruto.toFixed(1).replace(".",",")}%</div></div>
      <div class="rounded-2xl bg-suave p-3"><div class="text-xs text-mute">Inventario a costo</div><div class="text-lg font-extrabold tabular-nums">${bs(valInv)}</div></div></div>
    <details class="mb-4 text-sm"><summary class="cursor-pointer font-semibold">¿Cómo se calcula?</summary>
      <div class="mt-2 rounded-xl bg-suave p-3 space-y-1 tabular-nums [&_b]:whitespace-nowrap [&_div]:gap-3">
        <div class="flex justify-between"><span>Facturado (precio con IVA)</span><b>${bs(R.bruto)}</b></div>
        <div class="flex justify-between"><span>(−) IVA 13 % (se paga a Impuestos)</span><b>${bs(-R.iva)}</b></div>
        <div class="flex justify-between"><span>= Venta neta</span><b>${bs(R.neto)}</b></div>
        <div class="flex justify-between"><span>(−) Costo de lo vendido</span><b>${bs(-R.costo)}</b></div>
        <div class="flex justify-between"><span>= Utilidad bruta</span><b class="text-ok">${bs(R.utilidad)}</b></div>
        <div class="flex justify-between"><span>(−) IT 3 %</span><b>${bs(-R.it)}</b></div>
        <div class="flex justify-between"><span>= Margen de contribución</span><b>${bs(R.contribucion)} (${R.margenContribucion.toFixed(1).replace(".",",")}%)</b></div>
      </div></details>
    <div class="space-y-3">${filasCat.map(([n,r])=>`<div><div class="flex justify-between text-sm"><span class="font-semibold">${n}</span><span class="tabular-nums"><b>${bs(r.utilidad)}</b> <span class="text-mute">· margen ${r.margenBruto.toFixed(0)}%</span></span></div><div class="barra mt-1.5"><i class="bg-ok" style="width:${Math.max(0,r.utilidad)/maxG*100}%"></i></div></div>`).join("")}</div>
    <p class="text-xs text-mute mt-4">Es la utilidad <b>antes</b> de sueldos, alquiler, servicios y otros gastos de operación (no es la ganancia final). Costos simulados. Con estos costos simulados, el formal de cuero tiene el mayor margen por par: es la hipótesis a validar en el piloto.</p>`;
  const estadoHoy=TIENDAS.map(t=>{const c=cajaHoy(t); return [t,!c?["Sin abrir","bg-suave text-mute"]:c.abierta?["Abierta","bg-ok-50 text-ok"]:[(c.dif? "Cerrada · dif. "+bsc(c.dif):"Cerrada · cuadra"),c.dif?"bg-marca-50 text-marca":"bg-ok-50 text-ok"]];});
  const ult=Object.values(S.cajas).filter(c=>!c.abierta&&enW(c.fecha)&&deT(c));
  const conDif=ult.filter(c=>c.dif), faltCaja=D.redondear(conDif.filter(c=>c.dif<0).reduce((a,c)=>a-c.dif,0)), sobraCaja=D.redondear(conDif.filter(c=>c.dif>0).reduce((a,c)=>a+c.dif,0));
  $("#cajasDash").innerHTML=`<div class="space-y-2 mb-4">${estadoHoy.map(([t,[e,cls]])=>`<div class="flex justify-between items-center text-sm"><span class="font-medium">${esc(t.split(" - ")[0])}</span><span class="text-xs font-semibold px-2.5 py-1 rounded-full ${cls}">${e}</span></div>`).join("")}</div>
    <div class="rounded-2xl bg-suave p-4"><div class="text-xs text-mute">Arqueos del periodo</div><div class="text-2xl font-extrabold">${ult.length?`${ult.length-conDif.length} de ${ult.length} cuadraron`:"Sin cierres aún"}</div>
    <div class="grid grid-cols-2 gap-2 mt-2 text-sm"><div>Faltantes<br><b class="${faltCaja?"text-marca":""}">${bsc(faltCaja)}</b></div><div>Sobrantes<br><b class="${sobraCaja?"text-aviso":""}">${bsc(sobraCaja)}</b></div></div>
    <p class="text-[11px] text-mute mt-2">Se muestran por separado: un sobrante no compensa un faltante.</p></div>`;

  $("#salud").innerHTML=T.map(([t,v,d,[e,tx,dot],pct])=>`<details class="rounded-2xl bg-suave p-3.5 sm:p-5 group" ${innerWidth>=640?"open":""}>
    <summary class="list-none cursor-pointer"><div class="flex items-center justify-between gap-1 mb-1.5"><span class="text-xs sm:text-sm font-medium leading-tight">${t}</span><span class="w-2.5 h-2.5 rounded-full shrink-0 ${dot}" title="${e}"></span></div>
    <div class="text-xl sm:text-3xl font-extrabold tracking-tight tabular-nums leading-tight">${v}</div>
    <div class="text-[11px] font-semibold ${tx} mt-1">${e}<span class="sm:hidden text-mute font-normal"> · ver más</span></div></summary>
    ${pct!=null?`<div class="barra mt-2 bg-white"><i class="${dot}" style="width:${pct}%"></i></div>`:""}
    <p class="text-xs sm:text-[13px] text-mute leading-snug mt-2">${d}</p></details>`).join("");

  const porTiendaF={}; C.filter(c=>c.dif<0).forEach(c=>porTiendaF[c.tienda]=(porTiendaF[c.tienda]||0)-c.dif);
  const peorT=Object.entries(porTiendaF).sort((a,b)=>b[1]-a[1])[0];
  const acc=[];
  bajos.slice(0,3).forEach(([c,t,n])=>acc.push({txt:`Reponer <b>${corto(c)}</b> en ${esc(t.split(" - ")[0])}`,sub:`${n===1?"Queda 1 par":"Quedan "+n+" pares"}`,...(pedidoPendiente(c.id,t)?{btn:"Pedido ✓",off:true}:{btn:"Pedir",fn:`pedirReposicion('${c.id}','${t}',this)`})}));
  if(peorT) acc.push({txt:`Revisar faltantes en <b>${esc(peorT[0].split(" - ")[0])}</b>`,sub:`${peorT[1]} pares no aparecieron al contar`,btn:rol==="gerente"?"Avisar":"Ir",fn:rol==="gerente"?`toast('📨 Aviso enviado al Encargado de ${peorT[0].split(" - ")[0]}: revisar ${peorT[1]} pares faltantes')`:`ver('cierre')`});
  if(orden[0]) acc.push({txt:`Asegurar stock de <b>${corto(modelo(orden[0][0]))}</b>`,sub:`Es el más vendido: ${orden[0][1].p} pares`,btn:"Ver",fn:`ver('inventario');$('#buscar').value=${JSON.stringify(modelo(orden[0][0]).nombre.split(" - ")[0])};renderInv()`});
  acc.push({txt:`Probar la línea <b>formal de cuero</b>`,sub:`En la base externa vale casi el doble por par (hipótesis a validar)`,btn:"Ver",fn:`ver('mercado')`});
  $("#acciones").innerHTML=acc.slice(0,5).map((a,i)=>`<li class="flex gap-3 items-center rounded-2xl border border-linea p-3"><span class="w-7 h-7 shrink-0 rounded-full bg-tinta text-white grid place-items-center text-xs font-bold">${i+1}</span>
    <div class="flex-1 min-w-0"><div class="text-sm leading-snug">${a.txt}</div><div class="text-xs text-mute">${a.sub}</div></div><button class="btn btn-s !min-h-0 !py-1.5 !px-3.5 text-xs shrink-0" ${a.off?"disabled":`onclick="${esc(a.fn)}"`}>${a.btn}</button></li>`).join("");

  $("#rankSub").textContent=orden.length?`${orden.length} modelos con ventas`:"";
  const maxP=orden[0]?.[1].p||1;
  $("#ranking").innerHTML=orden.slice(0,rankN).map(([id,o],i)=>{const c=modelo(id);return c?`<div class="flex items-center gap-3">
    <div class="w-5 text-right font-bold text-sm ${i<3?'text-marca':'text-mute'}">${i+1}</div>
    <img src="${c.imagen}" class="w-12 h-12 tile object-contain shrink-0" alt="">
    <div class="flex-1 min-w-0"><div class="flex justify-between text-sm gap-2"><span class="font-semibold truncate">${corto(c)}</span><span class="tabular-nums shrink-0"><b>${o.p}</b> <span class="text-mute">· ${bs(o.bs)}</span></span></div>
      <div class="barra mt-1.5"><i class="${i<3?'bg-marca':'bg-[#CACACB]'}" style="width:${o.p/maxP*100}%"></i></div></div></div>`:""}).join("")||`<p class="text-sm text-mute">Sin ventas en el periodo.</p>`;
  $("#verTodos").textContent=rankN===5?"Ver top 15":"Ver solo top 5";
  $("#verTodos").onclick=()=>{rankN=rankN===5?15:5; renderDash();};

  const Vt=vivas.filter(v=>enW(v.fecha));
  const pt=D.facturacionPor(Vt,v=>v.tienda,TIENDAS), totT=pt.reduce((a,x)=>a+x[1],0)||1;
  $("#tiendas").innerHTML=pt.map(([t,v],i)=>`<div class="${dTie!=="Todas"&&dTie!==t?'opacity-40':''}"><div class="flex justify-between items-baseline mb-1.5"><span class="font-semibold text-sm">${i+1}. ${esc(t)}</span><span class="font-bold tabular-nums">${bs(v)}</span></div>
    <div class="barra !h-3"><i style="width:${v/(pt[0][1]||1)*100}%;background:${["#E40140","#111111","#CACACB"][i]}"></i></div>
    <div class="text-xs text-mute mt-1">${(v/totT*100).toFixed(0)}% de lo facturado</div></div>`).join("");

  Chart.defaults.font.family="Poppins, system-ui, sans-serif"; Chart.defaults.color="#707072";
  const g=(id,cfg)=>{charts[id]?.destroy(); cfg.options=Object.assign({responsive:true,maintainAspectRatio:false,animation:{duration:400},plugins:{legend:{display:false},tooltip:{backgroundColor:"#111",padding:10,cornerRadius:12,titleFont:{weight:"600"}}}},cfg.options||{}); charts[id]=new Chart($("#"+id),cfg);};
  const cats=Object.keys(NOMC), pal=["#E40140","#111111","#CACACB"];
  const vc=filasCat.map(f=>f[1].bruto);
  g("chCat",{type:"doughnut",data:{labels:cats.map(k=>NOMC[k]),datasets:[{data:vc,backgroundColor:pal,borderWidth:3,borderColor:"#fff"}]},options:{cutout:"70%",plugins:{legend:{display:false},tooltip:{backgroundColor:"#111",callbacks:{label:c=>" "+bs(c.raw)}}}}});
  const iMax=vc.indexOf(Math.max(...vc));
  $("#catCentro").innerHTML=R.bruto?`<div><div class="text-2xl font-extrabold">${(vc[iMax]/R.bruto*100).toFixed(0)}%</div><div class="text-[11px] text-mute leading-tight">${NOMC[cats[iMax]]}</div></div>`:"";
  $("#catLeyenda").innerHTML=cats.map((k,i)=>`<div class="flex items-center gap-3"><span class="w-3 h-3 rounded-full shrink-0" style="background:${pal[i]}"></span><div class="flex-1"><div class="text-sm font-semibold">${NOMC[k]}</div><div class="text-xs text-mute">${bs(vc[i])}</div></div><div class="text-lg font-bold">${R.bruto?(vc[i]/R.bruto*100).toFixed(0):0}%</div></div>`).join("");

  const nd=dPer===1?14:dPer, dias=[...Array(nd)].map((_,i)=>D.sumarDias(hoy(),-(nd-i))), Vd=vivas.filter(deT);
  const vd=D.serieDiaria(Vd,dias), prom=vd.reduce((a,b)=>a+b,0)/Math.max(vd.length,1);
  $("#diaNota").textContent=`Promedio: ${bs(prom)} por día · ${nd} días completos (sin hoy)`;
  g("chDia",{type:"bar",data:{labels:dias.map(d=>+d.slice(8)+"/"+(+d.slice(5,7))),datasets:[
    {type:"line",data:vd.map(()=>prom),borderColor:"#111",borderDash:[5,5],pointRadius:0,borderWidth:1.5,order:0},
    {data:vd,backgroundColor:vd.map(v=>v>=prom?"#E40140":"#E5E5E5"),borderRadius:6,order:1}]},
    options:{plugins:{legend:{display:false},tooltip:{backgroundColor:"#111",callbacks:{label:c=>c.dataset.type==="line"?" Promedio: "+bs(c.raw):" Facturado: "+bs(c.raw)}}},
      scales:{x:{grid:{display:false},ticks:{maxTicksLimit:10}},y:{grid:{color:"#F0F0F0"},border:{display:false},ticks:{callback:v=>"Bs "+(v>=1000?(v/1000).toFixed(0)+"k":v)}}}}});

  // Metas SMART con regla explícita: valor actual, meta y avance
  const part=R.bruto?(R.bruto-filasCat[0][1].bruto)/R.bruto*100:0, partAnt=Ra.bruto?(Ra.bruto-D.resumenVentas(Vant.filter(v=>modelo(v.id)?.categoria==="Deportivo")).bruto)/Ra.bruto*100:null;
  const metas=[
    ["Exactitud de inventario",K.exactitud==null?"—":K.exactitud.toFixed(0)+" %","Meta ≥ 98 % en 12 meses",K.exactitud==null?0:Math.min(100,K.exactitud/98*100)],
    ["Ventas casual y formal (no deportivo)",part.toFixed(0)+" %",partAnt==null?"Meta: +15 pts en 36 meses":`Antes ${partAnt.toFixed(0)} % · meta +15 pts en 36 meses`,Math.min(100,part)],
    ["Merma sobre venta neta",tasaMerma.toFixed(2).replace(".",",")+" %","Meta ≤ 0,5 % (estándar retail)",tasaMerma<=0.5?100:Math.max(5,0.5/tasaMerma*100)],
  ];
  // Estación 4: producción, defectos, devoluciones, entregas y ventas — con su origen explícito
  const Vtodas=S.ventas.filter(v=>enW(v.fecha)&&deT(v)), PED=(S.pedidos||[]).filter(p=>dTie==="Todas"||p.tienda===dTie);
  const Q=D.kpiCalidad(Vtodas,PED), pc=x=>x==null?"—":x.toFixed(1).replace(".",",")+" %";
  const TAG={reg:["Registrado","bg-ok/10 text-ok"],sim:["Simulado","bg-amber-100 text-amber-800"],falta:["Falta","bg-suave text-mute"]};
  const IND=[
    ["Ventas",`${R.pares.toLocaleString("es-BO")} pares`,`${bs(R.bruto)} facturados · ventas simuladas + las que registres`,"sim"],
    ["Devoluciones",pc(Q.tasaDevolucion),`${Q.devueltos} pares devueltos (ventas anuladas) · meta ≤ 2 %`,"reg"],
    ["Defectos",pc(Q.tasaDefectos),`${Q.porTipo.defecto} por defecto · ${Q.porTipo.talla} por talla · ${Q.porTipo.otro} otros`,"reg"],
    ["Entregas a tienda",Q.plazoPromedio==null?"—":Q.plazoPromedio.toFixed(1).replace(".",",")+" días",`${Q.pedidos} pedidos · ${Q.pendientes} pendientes · a tiempo (≤ 3 días): ${pc(Q.aTiempo)}`,"reg"],
    ["Producción","Sin dato","Falta: pares producidos, rechazos en planta y costo real por línea (ERP de fábrica)","falta"],
  ];
  $("#calidad").innerHTML=IND.map(([t,v,s,k])=>`<div class="rounded-2xl bg-suave p-4"><div class="flex items-center justify-between gap-2"><span class="text-sm font-semibold">${t}</span><span class="tag-dato ${TAG[k][1]}">${TAG[k][0]}</span></div><div class="text-2xl font-extrabold tabular-nums mt-1">${v}</div><div class="text-xs text-mute mt-1">${s}</div></div>`).join("");
  $("#metas").innerHTML=metas.map(([t,v,s,pct])=>`<div><div class="flex justify-between text-sm mb-1.5"><span class="font-semibold">${t}</span><b class="tabular-nums">${v}</b></div><div class="barra !h-3"><i class="bg-tinta" style="width:${pct}%"></i></div><div class="text-xs text-mute mt-1">${s}</div></div>`).join("");
}

/* ---------- MERCADO (base completa del Excel) ---------- */
