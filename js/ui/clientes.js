/* Capa de presentación — Clientes (Gerente): segmentación RFM y acción comercial por segmento (Estación 4 del caso).
   Script clásico: comparte el ámbito global con los demás módulos de js/ui (ver docs/ARQUITECTURA.md). */
const SEGMENTOS={
  "VIP":["bg-marca text-white","Clientes de mayor valor","Preventa exclusiva de la nueva colección de cuero y doble puntos el mes de su cumpleaños."],
  "Frecuente":["bg-tinta text-white","Compran seguido","Cupón de Bs 30 en su 3.ª compra del trimestre para llevarlos a VIP."],
  "Nuevo":["bg-ok text-white","Primera compra reciente","Mensaje de bienvenida por WhatsApp y 10 % en la segunda compra dentro de 30 días."],
  "En riesgo":["bg-aviso text-white","No compran hace más de 45 días","Campaña de reactivación: recordatorio de puntos acumulados y oferta en casual de cuero."],
};
function renderClientes(){
  const L=D.segmentarClientes(S.ventas,hoy()), C=S.clientes||{}, tot=L.reduce((a,x)=>a+x.monto,0)||1;
  const por=Object.keys(SEGMENTOS).map(k=>{const xs=L.filter(x=>x.segmento===k); return [k,xs.length,xs.reduce((a,x)=>a+x.monto,0)];});
  const conCli=S.ventas.filter(v=>v.cliente&&!v.anulada).length, todas=S.ventas.filter(v=>!v.anulada).length||1;
  $("#cliBody").innerHTML=!L.length?`<div class="card p-8 text-center text-mute">Aún no hay ventas con cliente registrado. El vendedor puede registrarlo en <b>Ventas → Cliente (opcional)</b>.</div>`:`
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">${por.map(([k,n,m])=>`<div class="rounded-2xl bg-suave p-4"><span class="text-[11px] font-semibold px-2 py-0.5 rounded-full ${SEGMENTOS[k][0]}">${k}</span>
    <div class="text-2xl font-extrabold mt-2 tabular-nums">${n}</div><div class="text-xs text-mute">${SEGMENTOS[k][1]} · ${(m/tot*100).toFixed(0)} % de lo facturado</div></div>`).join("")}</div>
  <div class="grid grid-cols-1 lg:grid-cols-5 gap-5">
    <div class="card p-5 lg:col-span-2 h-fit"><h2 class="font-bold text-xl mb-1">Acción comercial por segmento</h2><p class="text-xs text-mute mb-3">Propuesta basada en los datos (Estación 4)</p>
      ${por.filter(([,n])=>n).map(([k,n])=>`<div class="py-2.5 border-b border-linea"><div class="flex items-center gap-2"><span class="text-[11px] font-semibold px-2 py-0.5 rounded-full ${SEGMENTOS[k][0]}">${k}</span><span class="text-xs text-mute">${n} clientes</span></div><p class="text-sm mt-1">${SEGMENTOS[k][2]}</p></div>`).join("")}
      <p class="text-xs text-mute mt-3">Cobertura: el ${(conCli/todas*100).toFixed(0)} % de las ventas tiene cliente registrado. Meta: 40 %.</p></div>
    <div class="card p-5 lg:col-span-3"><h2 class="font-bold text-xl mb-3">Mejores clientes</h2>
      <div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="text-left text-xs text-mute border-b border-linea"><th class="py-2 font-medium">Cliente</th><th class="font-medium">Segmento</th><th class="text-right font-medium">Compras</th><th class="text-right font-medium">Monto</th><th class="text-right font-medium">Puntos</th><th class="text-right font-medium">Última</th></tr></thead>
      <tbody>${L.slice(0,20).map(x=>`<tr class="border-b border-linea"><td class="py-2"><div class="font-medium">${esc(C[x.doc]?.nombre||"—")}</div><div class="text-xs text-mute">${esc(x.doc)}</div></td><td><span class="text-[11px] font-semibold px-2 py-0.5 rounded-full ${SEGMENTOS[x.segmento][0]}">${x.segmento}</span></td><td class="text-right tabular-nums">${x.compras}</td><td class="text-right tabular-nums">${bs(x.monto)}</td><td class="text-right tabular-nums">${C[x.doc]?.puntos??0}</td><td class="text-right text-xs">hace ${x.recencia} d</td></tr>`).join("")}</tbody></table></div>
      <p class="text-xs text-mute mt-2">Clientes de demostración simulados; los reales se registran en cada venta.</p></div></div>`;
}
