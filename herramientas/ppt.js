const pptxgen = require("pptxgenjs"), path = require("path"), fs = require("fs");
const P = process.argv[2], G = f => path.join(P, "graficos", f), I = f => path.join(P, "app", "img", f);
const pres = new pptxgen(); pres.layout = "LAYOUT_16x9"; // 10 x 5.625
pres.theme = { headFontFace: "Cambria", bodyFontFace: "Calibri" };
const ROJO = "B5562B", TINTA = "2A1D17", OSC = "2A1D17", GRIS = "F6F1EA", MUTE = "8A7A6C", BL = "FFFFFF";
const T = (s, txt, o) => s.addText(txt, Object.assign({ isTextBox: true, fontFace: "Calibri", color: TINTA, margin: 0 }, o));
const titulo = (s, t) => T(s, t, { x: 0.5, y: 0.35, w: 9, h: 0.7, fontFace: "Cambria", fontSize: 30, bold: true });
const card = (s, x, y, w, h, fill = GRIS) => s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: fill }, line: { color: fill } });
const circ = (s, x, y, n, d = 0.5) => { s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: ROJO }, line: { color: ROJO } }); T(s, String(n), { x, y, w: d, h: d, align: "center", valign: "middle", color: BL, bold: true, fontSize: 16 }); };
const pie = s => T(s, "Manaco Vision · Caso Manaco", { x: 0.5, y: 5.25, w: 5, h: 0.25, fontSize: 9, color: MUTE });

// 1 Portada
let s = pres.addSlide(); s.background = { color: OSC };
T(s, "CASO DE ESTUDIO EMPRESARIAL · MANACO", { x: 0.6, y: 0.8, w: 6, h: 0.3, fontSize: 12, color: "B3A394", charSpacing: 2 });
T(s, "Manaco Vision", { x: 0.6, y: 1.25, w: 6, h: 1, fontFace: "Cambria", fontSize: 48, bold: true, color: BL });
T(s, "Inventario inteligente con visión artificial para decidir con datos", { x: 0.6, y: 2.3, w: 5.6, h: 0.8, fontSize: 18, color: "EDE3D8" });
T(s, "Equipo consultor: ____________ / ____________", { x: 0.6, y: 3.9, w: 5.5, h: 0.3, fontSize: 13, color: "D8C8B8" });
T(s, "20 de octubre de 2026", { x: 0.6, y: 4.25, w: 5.5, h: 0.3, fontSize: 13, color: "B3A394" });
card(s, 6.9, 1.1, 2.5, 3.1, BL);
s.addImage({ path: G("qr_app.png"), x: 7.15, y: 1.3, w: 2.0, h: 2.0 });
T(s, "Escanea y pruébalo", { x: 6.9, y: 3.4, w: 2.5, h: 0.3, align: "center", fontSize: 13, bold: true, color: ROJO });
T(s, "gris999.github.io/manaco-vision", { x: 6.9, y: 3.7, w: 2.5, h: 0.3, align: "center", fontSize: 9, color: MUTE });
s.addNotes("(15 s) Buenos días. Somos el equipo consultor contratado por la Gerencia de Manaco. Les traemos Manaco Vision: no un análisis, sino una solución funcionando. Pueden escanear el QR y probarla ahora mismo.");

// 2 Problema
s = pres.addSlide(); s.background = { color: BL }; titulo(s, "Manaco decide sin datos confiables");
const probs = [["Importados baratos", "Presión de precios, sobre todo en deportivo"], ["Costos altos", "Producción, almacenaje y distribución"], ["Inventario a ciegas", "Faltantes y sobrestock que nadie detecta"], ["Datos dispersos", "Ventas, stock y clientes sin integrar"]];
probs.forEach(([h, d], i) => { const x = 0.5 + i * 2.3; card(s, x, 1.35, 2.1, 2.2); circ(s, x + 0.2, 1.55, i + 1); T(s, h, { x: x + 0.2, y: 2.2, w: 1.75, h: 0.4, fontSize: 15, bold: true }); T(s, d, { x: x + 0.2, y: 2.6, w: 1.75, h: 0.8, fontSize: 12, color: MUTE }); });
card(s, 0.5, 3.85, 9, 1.1, "FBEFE7");
T(s, [{ text: "Causa raíz: ", options: { bold: true, color: ROJO } }, { text: "las decisiones se toman \"a ojo\". Si había 10, se vendieron 2 y hay 7… hoy nadie se entera del par que falta." }], { x: 0.8, y: 3.95, w: 8.4, h: 0.9, fontSize: 15, valign: "middle" });
pie(s);
s.addNotes("(45 s) Manaco enfrenta cuatro problemas: importados baratos, costos altos, inventario sin control y datos dispersos. Pero la causa raíz es una sola: deciden sin información confiable. Ejemplo: había 10 pares, se vendieron 2, deberían quedar 8, pero quedan 7. Ese par perdido hoy no se detecta; multiplicado por todas las tiendas, es dinero que se va.");

// 3 Datos
s = pres.addSlide(); s.background = { color: BL }; titulo(s, "Los datos dicen: competir en cuero, no en precio");
s.addImage({ path: G("3_valor_por_par.png"), x: 0.4, y: 1.2, w: 5.6, h: 2.8 });
const stats = [["≈ 45 USD", "por par vale el cuero/cuero, casi el doble que el resto (≈ 25)"], ["3×", "más importación que exportación en deportivo"], ["230", "registros depurados (2020–2024), sin nulos ni doble conteo"]];
stats.forEach(([n, d], i) => { const y = 1.2 + i * 1.0; T(s, n, { x: 6.3, y, w: 3.2, h: 0.5, fontFace: "Cambria", fontSize: 28, bold: true, color: ROJO }); T(s, d, { x: 6.3, y: y + 0.48, w: 3.2, h: 0.45, fontSize: 11, color: MUTE }); });
T(s, "Fuente: base de comercio exterior de calzado (país reportante: España). Es referencia de mercado, no son ventas de Manaco. El valor por par es valor en aduana, no precio al consumidor.", { x: 0.5, y: 4.4, w: 9, h: 0.5, fontSize: 10, color: MUTE, italic: true });
pie(s);
s.addNotes("(60 s) Limpiamos la base: 240 registros, sin nulos, sin registros 'Mundo', y agregamos 10 duplicados. Hallazgo clave: el calzado de cuero vale casi el doble por par. El deportivo es donde más presiona el importado barato. Conclusión: Manaco no debe pelear por precio, sino por su fortaleza, el cuero. Limitación honesta: son datos de España, una referencia externa, y el valor es en aduana.");

// 4 Solución
s = pres.addSlide(); s.background = { color: BL }; titulo(s, "Manaco Vision: cada venta se vuelve un dato");
const pasos = [["Escanea", "La cámara reconoce el modelo"], ["Consulta", "Stock en esta y otras tiendas"], ["Vende", "Se descuenta automáticamente"], ["Cierra el día", "Esperado vs. físico: detecta faltantes"], ["Decide", "Dashboard de KPIs para Gerencia"]];
pasos.forEach(([h, d], i) => { const x = 0.5 + i * 1.84; card(s, x, 1.4, 1.65, 2.0); circ(s, x + 0.57, 1.6, i + 1); T(s, h, { x: x + 0.1, y: 2.25, w: 1.45, h: 0.35, align: "center", fontSize: 14, bold: true }); T(s, d, { x: x + 0.1, y: 2.6, w: 1.45, h: 0.7, align: "center", fontSize: 11, color: MUTE });
  if (i < 4) T(s, "›", { x: x + 1.65, y: 2.1, w: 0.19, h: 0.4, align: "center", fontSize: 20, bold: true, color: ROJO }); });
T(s, [{ text: "Tecnología: ", options: { bold: true } }, { text: "IA MobileNetV2 + TensorFlow.js (corre en el celular) · Web HTTPS · Chart.js · sin hardware adicional: usa los celulares de las tiendas" }], { x: 0.5, y: 3.75, w: 9, h: 0.5, fontSize: 13 });
T(s, "Resuelve: inventario a ciegas · datos dispersos · producción sin evidencia · enfoque en la línea de cuero", { x: 0.5, y: 4.3, w: 9, h: 0.4, fontSize: 12, color: ROJO, bold: true });
pie(s);
s.addNotes("(75 s) Nuestra solución tiene 5 pasos. El vendedor apunta la cámara y la IA reconoce el modelo; ve el stock en su tienda y en las demás; registra la venta y el stock baja solo; al cierre del día cuenta, y el sistema compara lo esperado con lo físico y avisa si falta algo; la Gerencia ve todo en un dashboard. No necesita hardware nuevo: usa los celulares que ya existen.");

// 5 Demo
s = pres.addSlide(); s.background = { color: BL }; titulo(s, "Prototipo real: 725 modelos del catálogo");
const cat = JSON.parse(fs.readFileSync(path.join(P, "dataset", "catalogo.json")));
cat.filter((_, i) => i % 72 === 5).slice(0, 10).forEach((c, i) => { const x = 0.5 + (i % 5) * 1.25, y = 1.25 + Math.floor(i / 5) * 1.55; card(s, x, y, 1.12, 1.4, BL); s.addImage({ path: path.join(P, "app", c.imagen), x: x + 0.06, y: y + 0.05, w: 1.0, h: 1.0, sizing: { type: "contain", w: 1.0, h: 1.0 } }); T(s, c.nombre.split(" - ")[0].replace(/^(DEPORTIVO|ZAPATO DE VESTIR|ZAPATO FORMAL|ZAPATO|CASUAL CORDONES|ZAPATILLAS|BOTIN)\s*/i, "") || c.nombre, { x, y: y + 1.07, w: 1.12, h: 0.3, align: "center", fontSize: 9, bold: true }); });
card(s, 6.9, 1.25, 2.6, 3.0, GRIS);
T(s, "95 %", { x: 6.9, y: 1.35, w: 2.6, h: 0.7, align: "center", fontFace: "Cambria", fontSize: 40, bold: true, color: ROJO });
T(s, "el modelo correcto está entre las 3 opciones · 82 % exacto", { x: 7.0, y: 2.05, w: 2.4, h: 0.55, align: "center", fontSize: 11, color: MUTE });
s.addImage({ path: G("qr_app.png"), x: 7.6, y: 2.7, w: 1.2, h: 1.2 });
T(s, "Demo en vivo", { x: 6.9, y: 3.9, w: 2.6, h: 0.3, align: "center", fontSize: 12, bold: true });
T(s, "Todo el calzado de la tienda en línea: 725 modelos y 2.740 fotos reales, ampliadas a unas 22.000 imágenes. Además, un explorador con los 230 registros de la base de mercado.", { x: 0.5, y: 4.45, w: 6.2, h: 0.5, fontSize: 10, color: MUTE, italic: true });
pie(s);
s.addNotes("(45 s) DEMO: abrir la app en el celular, apuntar a la foto de un zapato, mostrar que lo reconoce, tocar Vender, ir a Cierre del día, poner un par menos y mostrar la alerta de faltante; luego el Dashboard. Si la cámara falla, usar 'Subir foto'. Entrenamos con los 725 modelos del catálogo: 82 % de acierto exacto y 95 % con el correcto entre las 3 opciones; si duda, el vendedor elige con un toque. Mostrar también la pestaña Mercado con los 230 registros filtrables.");

// 6 Metas
s = pres.addSlide(); s.background = { color: BL }; titulo(s, "Metas a 3 años y cómo las mediremos");
const kpis = [["≥ 98 %", "Exactitud de inventario", "en 12 meses · KPI: sistema vs. conteo físico"], ["−20 %", "Sobrestock", "en 24 meses · KPI: rotación de inventario"], ["+15 %", "Ventas línea cuero", "en 36 meses · KPI: % de ventas en Bs"]];
kpis.forEach(([n, h, d], i) => { const x = 0.5 + i * 3.05; card(s, x, 1.3, 2.85, 1.85); T(s, n, { x: x + 0.25, y: 1.45, w: 2.4, h: 0.65, fontFace: "Cambria", fontSize: 32, bold: true, color: ROJO }); T(s, h, { x: x + 0.25, y: 2.12, w: 2.4, h: 0.35, fontSize: 15, bold: true }); T(s, d, { x: x + 0.25, y: 2.5, w: 2.4, h: 0.55, fontSize: 11, color: MUTE }); });
T(s, "Riesgos y mitigación", { x: 0.5, y: 3.4, w: 9, h: 0.35, fontSize: 15, bold: true });
T(s, [{ text: "Resistencia del personal → ", options: { bold: true } }, { text: "piloto en 1 tienda, capacitación, 1 toque por venta", options: { breakLine: true } },
  { text: "Errores de reconocimiento → ", options: { bold: true } }, { text: "entrenar con fotos de tienda y usar código de barras como respaldo" }], { x: 0.5, y: 3.8, w: 9, h: 0.9, fontSize: 13, paraSpaceAfter: 6 });
pie(s);
s.addNotes("(30 s) Tres metas SMART: 98 % de exactitud de inventario en un año, 20 % menos de sobrestock en dos, y 15 % más de ventas de cuero en tres. Los riesgos: resistencia al cambio, que mitigamos con un piloto, y errores de la IA, que mitigamos entrenando con fotos de tienda y con código de barras como respaldo.");

// 7 Recomendación
s = pres.addSlide(); s.background = { color: OSC };
T(s, "Recomendación", { x: 0.6, y: 0.4, w: 9, h: 0.7, fontFace: "Cambria", fontSize: 30, bold: true, color: BL });
card(s, 0.6, 1.3, 4.2, 2.1, "3D2D24");
T(s, "A · Solo dashboard", { x: 0.85, y: 1.45, w: 3.8, h: 0.4, fontSize: 16, bold: true, color: "D8C8B8" });
T(s, "Más barato, pero con datos manuales y atrasados. Muestra el problema, no lo resuelve.", { x: 0.85, y: 1.9, w: 3.8, h: 1.3, fontSize: 13, color: "B3A394" });
card(s, 5.2, 1.3, 4.2, 2.1, ROJO);
T(s, "B · Manaco Vision  ✓", { x: 5.45, y: 1.45, w: 3.8, h: 0.4, fontSize: 16, bold: true, color: BL });
T(s, "Datos en tiempo real, detección de faltantes y base para el pronóstico de demanda. Resuelve la causa raíz.", { x: 5.45, y: 1.9, w: 3.8, h: 1.3, fontSize: 13, color: BL });
T(s, "\"Manaco no debe competir en precio con el importado: debe competir en calidad y decidir con datos.\"", { x: 0.6, y: 3.75, w: 8.8, h: 0.8, fontFace: "Cambria", fontSize: 18, italic: true, color: BL });
T(s, "Próximo paso: piloto de 3 meses en 1 tienda de La Paz", { x: 0.6, y: 4.65, w: 8.8, h: 0.35, fontSize: 13, bold: true, color: "F0B48E" });
s.addNotes("(30 s) Comparamos dos alternativas: un dashboard solo muestra el problema; Manaco Vision lo resuelve. Recomendamos la B, empezando con un piloto de 3 meses en una tienda. Manaco no debe competir en precio: debe competir en calidad y decidir con datos. Gracias, quedamos atentos a sus preguntas.");

pres.writeFile({ fileName: path.join(P, "entregables", "Presentacion_Manaco_Vision.pptx") }).then(f => console.log("ok", f));
