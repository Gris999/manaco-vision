const pptxgen = require("pptxgenjs"), path = require("path"), fs = require("fs");
const P = process.argv[2], G = f => path.join(P, "graficos", f), I = f => path.join(P, "app", "img", f);
const pres = new pptxgen(); pres.layout = "LAYOUT_16x9"; // 10 x 5.625
pres.theme = { headFontFace: "Poppins", bodyFontFace: "Poppins" };
const ROJO = "E40140", TINTA = "111111", OSC = "111111", GRIS = "F5F5F5", MUTE = "707072", BL = "FFFFFF";
const T = (s, txt, o) => s.addText(txt, Object.assign({ isTextBox: true, fontFace: "Poppins", color: TINTA, margin: 0 }, o));
const titulo = (s, t) => T(s, t, { x: 0.5, y: 0.35, w: 9, h: 0.7, fontFace: "Poppins", fontSize: 26, bold: true });
const card = (s, x, y, w, h, fill = GRIS) => s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: fill }, line: { color: fill } });
const circ = (s, x, y, n, d = 0.5) => { s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: ROJO }, line: { color: ROJO } }); T(s, String(n), { x, y, w: d, h: d, align: "center", valign: "middle", color: BL, bold: true, fontSize: 16 }); };
const pie = s => T(s, "Manaco Vision · Caso Manaco", { x: 0.5, y: 5.25, w: 5, h: 0.25, fontSize: 9, color: MUTE });

// 1 Portada
let s = pres.addSlide(); s.background = { color: ROJO };
T(s, "manaco", { x: 0.6, y: 0.55, w: 4, h: 0.6, fontSize: 30, bold: true, italic: true, color: BL });
T(s, "CASO DE ESTUDIO EMPRESARIAL", { x: 0.6, y: 1.15, w: 6, h: 0.3, fontSize: 11, color: "FFD1DD", charSpacing: 2 });
T(s, "Manaco Vision", { x: 0.6, y: 1.5, w: 6, h: 0.9, fontFace: "Poppins", fontSize: 42, bold: true, color: BL });
T(s, "Inventario inteligente con visión artificial para decidir con datos", { x: 0.6, y: 2.3, w: 5.6, h: 0.8, fontSize: 17, color: BL });
T(s, "Equipo consultor: ____________ / ____________", { x: 0.6, y: 3.9, w: 5.5, h: 0.3, fontSize: 13, color: BL });
T(s, "20 de octubre de 2026", { x: 0.6, y: 4.25, w: 5.5, h: 0.3, fontSize: 13, color: "FFD1DD" });
card(s, 6.9, 1.1, 2.5, 3.1, BL);
s.addImage({ path: G("qr_app.png"), x: 7.15, y: 1.3, w: 2.0, h: 2.0 });
T(s, "Escanea y pruébalo", { x: 6.9, y: 3.4, w: 2.5, h: 0.3, align: "center", fontSize: 13, bold: true, color: ROJO });
T(s, "gris999.github.io/manaco-vision", { x: 6.9, y: 3.7, w: 2.5, h: 0.3, align: "center", fontSize: 9, color: MUTE });
s.addNotes("(15 s) Buenos días. Somos el equipo consultor contratado por la Gerencia de Manaco. Les traemos Manaco Vision: no un análisis, sino una solución funcionando. Pueden escanear el QR y probarla ahora mismo.");

// 2 Problema
s = pres.addSlide(); s.background = { color: BL }; titulo(s, "Manaco decide sin datos confiables");
const probs = [["Importados baratos", "Presión de precios, sobre todo en deportivo"], ["Costos altos", "Producción, almacenaje y distribución"], ["Inventario a ciegas", "Faltantes y sobrestock que nadie detecta"], ["Datos dispersos", "Ventas, stock y clientes sin integrar"]];
probs.forEach(([h, d], i) => { const x = 0.5 + i * 2.3; card(s, x, 1.3, 2.1, 2.35); circ(s, x + 0.2, 1.45, i + 1); T(s, h, { x: x + 0.2, y: 2.05, w: 1.8, h: 0.55, fontSize: 13, bold: true, valign: "top" }); T(s, d, { x: x + 0.2, y: 2.62, w: 1.8, h: 0.9, fontSize: 11, valign: "top", color: MUTE }); });
card(s, 0.5, 3.85, 9, 1.1, "FDE8EE");
T(s, [{ text: "Causa raíz: ", options: { bold: true, color: ROJO } }, { text: "las decisiones se toman \"a ojo\". Si había 10, se vendieron 2 y hay 7… hoy nadie se entera del par que falta." }], { x: 0.8, y: 3.95, w: 8.4, h: 0.9, fontSize: 15, valign: "middle" });
pie(s);
s.addNotes("(45 s) Manaco enfrenta cuatro problemas: importados baratos, costos altos, inventario sin control y datos dispersos. Pero la causa raíz es una sola: deciden sin información confiable. Ejemplo: había 10 pares, se vendieron 2, deberían quedar 8, pero quedan 7. Ese par perdido hoy no se detecta; multiplicado por todas las tiendas, es dinero que se va.");

// 3 Datos
s = pres.addSlide(); s.background = { color: BL }; titulo(s, "Los datos dicen: competir en cuero, no en precio");
s.addImage({ path: G("3_valor_por_par.png"), x: 0.4, y: 1.2, w: 5.6, h: 2.8 });
const stats = [["≈ 45 USD", "por par vale el cuero/cuero, casi el doble que el resto (≈ 25)"], ["3×", "más importación que exportación en deportivo"], ["230", "registros depurados (2020–2024), sin nulos ni doble conteo"]];
stats.forEach(([n, d], i) => { const y = 1.2 + i * 1.0; T(s, n, { x: 6.3, y, w: 3.2, h: 0.5, fontFace: "Poppins", fontSize: 28, bold: true, color: ROJO }); T(s, d, { x: 6.3, y: y + 0.48, w: 3.2, h: 0.45, fontSize: 11, color: MUTE }); });
T(s, "Fuente: base de comercio exterior de calzado (país reportante: España). Es referencia de mercado, no son ventas de Manaco. El valor por par es valor en aduana, no precio al consumidor.", { x: 0.5, y: 4.4, w: 9, h: 0.5, fontSize: 10, color: MUTE, italic: true });
pie(s);
s.addNotes("(60 s) Limpiamos la base: 240 registros, sin nulos, sin registros 'Mundo', y agregamos 10 duplicados. Hallazgo clave: el calzado de cuero vale casi el doble por par. El deportivo es donde más presiona el importado barato. Conclusión: Manaco no debe pelear por precio, sino por su fortaleza, el cuero. Limitación honesta: son datos de España, una referencia externa, y el valor es en aduana.");

// 4 Solución: un sistema, tres roles + dos fuentes de datos
s = pres.addSlide(); s.background = { color: BL }; titulo(s, "Manaco Vision: un sistema, tres roles");
const roles = [["👟", "Vendedor", "Escanea el zapato, ve precio y stock, y vende", "Escáner · Ventas"],
  ["🏬", "Encargado", "Repone y cierra el día: detecta faltantes", "Inventario · Cierre"],
  ["📊", "Gerente", "Decide con datos de las 3 tiendas y del mercado", "Resumen · Mercado"]];
roles.forEach(([ic, h, d, p], i) => { const x = 0.5 + i * 3.05; card(s, x, 1.2, 2.85, 1.95);
  s.addShape(pres.shapes.OVAL, { x: x + 0.2, y: 1.38, w: 0.55, h: 0.55, fill: { color: BL }, line: { color: BL } });
  T(s, ic, { x: x + 0.2, y: 1.38, w: 0.55, h: 0.55, align: "center", valign: "middle", fontSize: 18 });
  T(s, h, { x: x + 0.9, y: 1.43, w: 1.85, h: 0.45, fontSize: 16, bold: true, valign: "middle" });
  T(s, d, { x: x + 0.2, y: 2.05, w: 2.5, h: 0.6, fontSize: 11, color: MUTE, valign: "top" });
  T(s, p, { x: x + 0.2, y: 2.68, w: 2.5, h: 0.3, fontSize: 10, bold: true, color: ROJO });
  if (i < 2) T(s, "›", { x: x + 2.85, y: 1.95, w: 0.2, h: 0.4, align: "center", fontSize: 20, bold: true, color: ROJO }); });
T(s, "Dos fuentes de datos", { x: 0.5, y: 3.35, w: 9, h: 0.3, fontSize: 13, bold: true });
card(s, 0.5, 3.7, 4.4, 1.25, "FDE8EE"); card(s, 5.1, 3.7, 4.4, 1.25, GRIS);
T(s, [{ text: "Excel del caso → Mercado", options: { bold: true, breakLine: true } }, { text: "230 registros de comercio de calzado (España, 2020–2024). Sirve para la estrategia: el cuero vale casi el doble por par." }], { x: 0.7, y: 3.8, w: 4.0, h: 1.05, fontSize: 11, valign: "top" });
T(s, [{ text: "Catálogo de la tienda en línea → IA e inventario", options: { bold: true, breakLine: true } }, { text: "725 modelos reales con fotos y precios. El Excel no trae modelos; ventas y stock son simulados." }], { x: 5.3, y: 3.8, w: 4.0, h: 1.05, fontSize: 11, valign: "top" });
pie(s);
s.addNotes("(75 s) Manaco Vision es un solo sistema con tres roles. El VENDEDOR escanea el zapato con el celular, ve precio y stock, y vende. El ENCARGADO repone y, al cierre, el sistema compara lo esperado con lo contado y detecta faltantes. El GERENTE ve el resumen de las 3 tiendas y el mercado para decidir. Usamos dos fuentes: el Excel del caso para la estrategia de mercado, y el catálogo real de la tienda en línea para la IA, porque el Excel no trae modelos de zapatos. Las ventas y el stock son simulados porque no tenemos los datos internos.");

// 5 Demo
s = pres.addSlide(); s.background = { color: BL }; titulo(s, "Prototipo real: 725 modelos del catálogo");
const cat = JSON.parse(fs.readFileSync(path.join(P, "dataset", "catalogo.json")));
cat.filter((_, i) => i % 72 === 5).slice(0, 10).forEach((c, i) => { const x = 0.5 + (i % 5) * 1.25, y = 1.25 + Math.floor(i / 5) * 1.55; card(s, x, y, 1.12, 1.4, BL); s.addImage({ path: path.join(P, "app", c.imagen), x: x + 0.06, y: y + 0.05, w: 1.0, h: 1.0, sizing: { type: "contain", w: 1.0, h: 1.0 } }); T(s, c.nombre.split(" - ")[0].replace(/^(DEPORTIVO|ZAPATO DE VESTIR|ZAPATO FORMAL|ZAPATO|CASUAL CORDONES|ZAPATILLAS|BOTIN)\s*/i, "") || c.nombre, { x, y: y + 1.07, w: 1.12, h: 0.3, align: "center", fontSize: 9, bold: true }); });
card(s, 6.9, 1.25, 2.6, 3.0, GRIS);
T(s, "95 %", { x: 6.9, y: 1.35, w: 2.6, h: 0.7, align: "center", fontFace: "Poppins", fontSize: 40, bold: true, color: ROJO });
T(s, "el modelo correcto está entre las 3 opciones · 82 % exacto", { x: 7.0, y: 2.05, w: 2.4, h: 0.55, align: "center", fontSize: 11, color: MUTE });
s.addImage({ path: G("qr_app.png"), x: 7.6, y: 2.7, w: 1.2, h: 1.2 });
T(s, "Demo en vivo", { x: 6.9, y: 3.9, w: 2.6, h: 0.3, align: "center", fontSize: 12, bold: true });
T(s, "Todo el calzado de la tienda en línea: 725 modelos y 2.740 fotos reales, ampliadas a unas 22.000 imágenes. Además, un explorador con los 230 registros de la base de mercado.", { x: 0.5, y: 4.45, w: 6.2, h: 0.5, fontSize: 10, color: MUTE, italic: true });
pie(s);
s.addNotes("(45 s) DEMO: abrir la app en el celular, apuntar a la foto de un zapato, mostrar que lo reconoce, tocar Vender, ir a Cierre del día, poner un par menos y mostrar la alerta de faltante; luego el Dashboard. Si la cámara falla, usar 'Subir foto'. Entrenamos con los 725 modelos del catálogo: 82 % de acierto exacto y 95 % con el correcto entre las 3 opciones; si duda, el vendedor elige con un toque. Mostrar también la pestaña Mercado con los 230 registros filtrables.");

// 6 Metas
s = pres.addSlide(); s.background = { color: BL }; titulo(s, "Metas a 3 años y cómo las mediremos");
const kpis = [["≥ 98 %", "Exactitud de inventario", "en 12 meses · KPI: sistema vs. conteo físico"], ["−20 %", "Sobrestock", "en 24 meses · KPI: rotación de inventario"], ["+15 %", "Ventas línea cuero", "en 36 meses · KPI: % de ventas en Bs"]];
kpis.forEach(([n, h, d], i) => { const x = 0.5 + i * 3.05; card(s, x, 1.3, 2.85, 1.85); T(s, n, { x: x + 0.25, y: 1.45, w: 2.4, h: 0.65, fontFace: "Poppins", fontSize: 32, bold: true, color: ROJO }); T(s, h, { x: x + 0.25, y: 2.1, w: 2.45, h: 0.35, fontSize: 13, bold: true }); T(s, d, { x: x + 0.25, y: 2.5, w: 2.4, h: 0.55, fontSize: 11, color: MUTE }); });
T(s, "Riesgos y mitigación", { x: 0.5, y: 3.4, w: 9, h: 0.35, fontSize: 15, bold: true });
T(s, [{ text: "Resistencia del personal → ", options: { bold: true } }, { text: "piloto en 1 tienda, capacitación, 1 toque por venta", options: { breakLine: true } },
  { text: "Errores de reconocimiento → ", options: { bold: true } }, { text: "entrenar con fotos de tienda y usar código de barras como respaldo" }], { x: 0.5, y: 3.8, w: 9, h: 0.9, fontSize: 13, paraSpaceAfter: 6 });
pie(s);
s.addNotes("(30 s) Tres metas SMART: 98 % de exactitud de inventario en un año, 20 % menos de sobrestock en dos, y 15 % más de ventas de cuero en tres. Los riesgos: resistencia al cambio, que mitigamos con un piloto, y errores de la IA, que mitigamos entrenando con fotos de tienda y con código de barras como respaldo.");

// 7 Recomendación
s = pres.addSlide(); s.background = { color: OSC };
T(s, "Recomendación", { x: 0.6, y: 0.4, w: 9, h: 0.7, fontFace: "Poppins", fontSize: 30, bold: true, color: BL });
card(s, 0.6, 1.3, 4.2, 2.1, "2A2A2A");
T(s, "A · Solo dashboard", { x: 0.85, y: 1.45, w: 3.8, h: 0.4, fontSize: 16, bold: true, color: "D9D9D9" });
T(s, "Más barato, pero con datos manuales y atrasados. Muestra el problema, no lo resuelve.", { x: 0.85, y: 1.9, w: 3.8, h: 1.3, fontSize: 13, color: "BDBDBD" });
card(s, 5.2, 1.3, 4.2, 2.1, ROJO);
T(s, "B · Manaco Vision  ✓", { x: 5.45, y: 1.45, w: 3.8, h: 0.4, fontSize: 16, bold: true, color: BL });
T(s, "Datos en tiempo real, detección de faltantes y base para el pronóstico de demanda. Resuelve la causa raíz.", { x: 5.45, y: 1.9, w: 3.8, h: 1.3, fontSize: 13, color: BL });
T(s, "\"Manaco no debe competir en precio con el importado: debe competir en calidad y decidir con datos.\"", { x: 0.6, y: 3.75, w: 8.8, h: 0.8, fontFace: "Poppins", fontSize: 18, italic: true, color: BL });
T(s, "Próximo paso: piloto de 3 meses en 1 tienda de La Paz", { x: 0.6, y: 4.65, w: 8.8, h: 0.35, fontSize: 13, bold: true, color: "FF8FAE" });
s.addNotes("(30 s) Comparamos dos alternativas: un dashboard solo muestra el problema; Manaco Vision lo resuelve. Recomendamos la B, empezando con un piloto de 3 meses en una tienda. Manaco no debe competir en precio: debe competir en calidad y decidir con datos. Gracias, quedamos atentos a sus preguntas.");

pres.writeFile({ fileName: path.join(P, "entregables", "Presentacion_Manaco_Vision.pptx") }).then(f => console.log("ok", f));
