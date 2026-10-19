const fs = require("fs"), path = require("path");
const D = require("docx");
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ShadingType,
  AlignmentType, ImageRun, PageBreak, LevelFormat, BorderStyle, ExternalHyperlink, Footer, PageNumber } = D;
const P = process.argv[2];
const TR = o => new TextRun(typeof o === "string" ? { text: o, font: "Poppins" } : { font: "Poppins", ...o });
const ROJO = "E40140", GRIS = "F2F2F2", W = 9026; // A4 con márgenes de 2,54 cm

const p = (t, o = {}) => new Paragraph({ spacing: { after: 120 }, ...o, children: [].concat(t).map(x => typeof x === "string" ? TR(x) : x) });
const b = t => TR({ text: t, bold: true });
const h1 = t => [new Paragraph({ children: [new PageBreak()] }), new Paragraph({ heading: HeadingLevel.HEADING_1, children: [TR(t)] })];
const h2 = t => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [TR(t)] });
const li = (t, ref = "vin") => new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 60 }, children: [].concat(t).map(x => typeof x === "string" ? TR(x) : x) });
const img = (f, w, h) => new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: "png", data: fs.readFileSync(path.join(P, "graficos", f)), transformation: { width: w, height: h } })] });
const cap = t => p(TR({ text: t, italics: true, size: 18, color: "555555" }), { alignment: AlignmentType.CENTER, spacing: { after: 240 } });

function tabla(cols, filas, opts = {}) {
  const tot = cols.reduce((a, c) => a + c[1], 0), k = W / tot, cw = cols.map(c => Math.round(c[1] * k));
  cw[cw.length - 1] += W - cw.reduce((a, x) => a + x, 0);
  const cell = (t, i, head) => new TableCell({
    width: { size: cw[i], type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 90, right: 90 },
    shading: head ? { type: ShadingType.CLEAR, fill: ROJO, color: "auto" } : undefined,
    children: [].concat(t).map(x => new Paragraph({ children: [TR({ text: String(x), bold: head, color: head ? "FFFFFF" : undefined, size: opts.size || 20 })] }))
  });
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: cw,
    rows: [new TableRow({ tableHeader: true, children: cols.map((c, i) => cell(c[0], i, true)) }),
      ...filas.map(f => new TableRow({ children: f.map((t, i) => cell(t, i, false)) }))]
  });
}
const esp = () => p("");

// ---------- CONTENIDO ----------
const portada = [
  new Paragraph({ spacing: { before: 2400 }, alignment: AlignmentType.CENTER, children: [TR({ text: "CASO DE ESTUDIO EMPRESARIAL · MANACO", size: 24, color: "555555" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 300 }, children: [TR({ text: "MANACO VISION", bold: true, size: 64, color: ROJO })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [TR({ text: "Inventario inteligente con visión artificial y analítica de datos para la toma de decisiones", size: 28 })] }),
  p("Carrera: Ingeniería de Sistemas, Ciencia de Datos e Inteligencia de Negocios", { alignment: AlignmentType.CENTER }),
  p("Nivel: 6.º semestre · Modalidad: Aprendizaje Basado en Retos (ABR)", { alignment: AlignmentType.CENTER }),
  p("Equipo consultor: ______________________  /  ______________________", { alignment: AlignmentType.CENTER, spacing: { before: 600 } }),
  p("Docente: ______________________", { alignment: AlignmentType.CENTER }),
  p("Fecha: 20 de octubre de 2026", { alignment: AlignmentType.CENTER }),
  p([b("Prototipo en línea: "), new ExternalHyperlink({ link: "https://gris999.github.io/manaco-vision/", children: [TR({ text: "https://gris999.github.io/manaco-vision/", style: "Hyperlink" })] })], { alignment: AlignmentType.CENTER, spacing: { before: 400 } }),
];

const resumen = [
  h1("Resumen ejecutivo"),
  p("Manaco enfrenta calzado importado de bajo costo, presión sobre sus costos de producción, almacenamiento y distribución, y una baja integración de sus datos internos. La causa raíz que identificamos es que la empresa toma decisiones comerciales y operativas sin información confiable ni en tiempo real sobre lo que tiene, lo que vende y lo que pierde."),
  p([b("Nuestra propuesta es Manaco Vision: "), "un sistema web que reconoce el modelo de zapato con la cámara del celular, muestra el stock por tienda, registra la venta, concilia el inventario al cierre del día detectando faltantes y consolida todo en un dashboard de KPIs para la Gerencia."]),
  p([b("El análisis de mercado lo respalda: "), "en la base de comercio exterior (2020–2024), el calzado de cuero con suela de cuero tiene un valor aproximado de 45 USD por par frente a unos 25 USD de las demás categorías, mientras que el calzado deportivo se importa unas 3 veces más de lo que se exporta. Manaco no debe competir por precio, sino por calidad (cuero) y por eficiencia basada en datos."]),
  p([b("Ya construimos el prototipo funcional: "), "reconoce 725 modelos reales del catálogo de la empresa (todo el calzado de su tienda en línea). En validación acierta el modelo exacto el 82 % de las veces, y en el 95 % de los casos el correcto está entre las 3 opciones que muestra al vendedor. Además, el sistema incluye un explorador con los 230 registros de la base de mercado."]),
];

const est1 = [
  h1("1. Comprensión del caso empresarial"),
  h2("1.1 Factores internos y externos"),
  tabla([["Factores internos", 1], ["Factores externos", 1]], [
    ["Datos de ventas, inventario, calidad y clientes dispersos y sin integrar", "Incremento de importaciones de calzado de bajo costo"],
    ["Costos altos de producción, almacenamiento y distribución", "Cambio en las preferencias del consumidor"],
    ["Control de inventario manual, con faltantes que no se detectan", "Crecimiento de los canales digitales de búsqueda y compra"],
    ["Poco conocimiento del comportamiento de clientes por región", "Diferencias de demanda entre regiones del país"],
  ]),
  esp(),
  h2("1.2 Problemas prioritarios"),
  tabla([["N.º", 0.5], ["Problema prioritario", 2.2], ["Justificación", 3], ["Datos necesarios", 2.6]], [
    ["1", "Inventario sin control en tiempo real (faltantes y sobrestock)", "Afecta directamente la rentabilidad: capital inmovilizado y pérdidas que nadie detecta", "Stock por tienda y modelo, ventas diarias, conteos físicos"],
    ["2", "Datos internos no integrados", "Impide decidir con evidencia; cada área trabaja con su propia versión de los datos", "Ventas, inventario, calidad, devoluciones y clientes en una sola base"],
    ["3", "Competencia de calzado importado barato", "Presiona precios y participación, sobre todo en deportivo", "Precios de la competencia, importaciones por categoría (base externa)"],
    ["4", "Costos de almacenamiento y distribución", "Producir lo que no se vende eleva costos logísticos", "Rotación por modelo, costos logísticos, tiempos de entrega"],
    ["5", "Bajo conocimiento del cliente y de la demanda regional", "No se puede segmentar ni pronosticar", "Ventas por región, segmento, temporada y canal"],
  ]),
  esp(),
  h2("1.3 Preguntas de análisis"),
  li("¿Qué categorías tienen mayor valor y volumen de comercio, y cambia la conclusión al medir valor frente a cantidad? (base externa)"),
  li("¿Cuál es el valor comercial aproximado por par y por qué no equivale al precio al consumidor? (base externa)"),
  li("¿Qué modelos y tiendas de Manaco concentran faltantes y baja rotación? (requiere datos internos: lo resuelve Manaco Vision)"),
  li("¿Qué decisiones mejorarían si la empresa tuviera stock y ventas en tiempo real? (requiere datos internos)"),
  p([b("Riesgo de decidir sin datos: "), "producir modelos que no se venden, quedarse sin los que sí se venden, y perder mercadería sin saberlo."]),
];

const est2 = [
  h1("2. Diagnóstico empresarial mediante Ciencia de Datos"),
  h2("2.1 Inspección y limpieza de la base"),
  tabla([["Revisión", 2], ["Resultado", 3], ["Acción", 2.4]], [
    ["Estructura", "240 registros, 10 variables (país, flujo, año, código SA6, categoría, socio, valor, cantidad, valor por par)", "Diccionario de datos revisado"],
    ["Valores faltantes", "0 en todas las columnas", "Ninguna"],
    ["Registros \"Mundo\" (agregados)", "No existen en esta base", "Se verificó; no hay riesgo de doble conteo"],
    ["Claves repetidas", "10 combinaciones repetidas de año, flujo, categoría y socio", "Se agregaron: quedan 230 registros depurados"],
    ["Consistencia de valores", "Valor_USD frente a Valor_miles_USD × 1000: diferencias de 5 USD como máximo", "Es redondeo, no un error"],
    ["País reportante", "Solo España", "Se usa como referencia externa de mercado, no como ventas de Manaco"],
  ]),
  esp(),
  h2("2.2 Indicadores por flujo y categoría (2020–2024)"),
  tabla([["Categoría", 2.4], ["Flujo", 1.2], ["Valor (MM USD)", 1.3], ["Pares (MM)", 1.1], ["USD/par", 1]], [
    ["Casual cuero (suela caucho)", "Importación", "11.710", "497,5", "23,5"],
    ["Casual cuero (suela caucho)", "Exportación", "8.514", "320,8", "26,5"],
    ["Deportivo", "Importación", "6.447", "245,9", "26,2"],
    ["Deportivo", "Exportación", "2.174", "84,5", "25,7"],
    ["Formal cuero/cuero", "Importación", "349", "7,7", "45,2"],
    ["Formal cuero/cuero", "Exportación", "229", "5,5", "41,4"],
  ]),
  esp(),
  h2("2.3 Visualizaciones"),
  img("1_import_vs_export.png", 560, 280), cap("Gráfico 1. Importaciones frente a exportaciones por categoría."),
  img("2_socios.png", 600, 245), cap("Gráfico 2. Principales socios comerciales dentro de los registros disponibles."),
  img("3_valor_por_par.png", 560, 280), cap("Gráfico 3. Valor comercial aproximado por par."),
  h2("2.4 Síntesis ejecutiva"),
  p(b("Tres hallazgos")),
  li([b("La categoría casual de cuero con suela de caucho domina en valor y volumen "), "(unos 11.700 MM USD importados)."], "num1"),
  li([b("El deportivo es el segmento con más presión importadora: "), "se importa unas 3 veces lo que se exporta. Es justamente donde compite el producto asiático barato."], "num1"),
  li([b("El formal de cuero/cuero vale casi el doble por par "), "(unos 45 USD contra unos 25 USD). Medido en cantidad es pequeño; medido en valor es el más rentable por unidad. La conclusión cambia según se mida valor o cantidad."], "num1"),
  p(b("Dos limitaciones")),
  li([b("Los datos son de España, no de Bolivia ni de Manaco: "), "sirven como referencia externa y no reflejan las ventas de la empresa."], "num2"),
  li([b("El valor por par es valor en aduana: "), "no incluye aranceles, transporte ni margen del retail, por lo que no equivale al precio al consumidor. Además, los años tienen distinta cantidad de registros (28 en 2020 y 82 en 2024), así que no es válido concluir una tendencia temporal."], "num2"),
  p([b("Pregunta estratégica: "), "¿Debe Manaco dejar de competir por precio en deportivo y concentrar su producción y marketing en la línea de cuero, donde el valor por par casi se duplica?"]),
];

const est3 = [
  h1("3. Propuesta estratégica: Manaco Vision"),
  h2("3.1 Ficha de propuesta"),
  tabla([["Elemento", 1.3], ["Descripción", 4]], [
    ["Problema", "Inventario sin control en tiempo real y datos internos no integrados, que llevan a faltantes, sobrestock y decisiones sin evidencia."],
    ["Solución analítica", "Sistema web con visión artificial: la cámara reconoce el modelo, muestra el stock, registra la venta, concilia al cierre del día y alimenta un dashboard de KPIs. En una segunda fase, pronóstico de demanda con el historial generado."],
    ["Datos que necesita", "Catálogo con fotos por modelo, stock por tienda, ventas, conteos físicos, precios y, más adelante, devoluciones y clientes."],
    ["Decisión que apoya", "Qué producir, cuánto reponer y en qué tienda; dónde se pierde mercadería; qué líneas impulsar."],
  ], { size: 20 }),
  esp(),
  h2("3.2 Cómo funciona"),
  li("El vendedor apunta la cámara del celular al zapato.", "num3"),
  li("La IA (red MobileNetV2 más un clasificador entrenado con el catálogo) identifica el modelo.", "num3"),
  li("El sistema muestra el stock en la tienda y en las otras sucursales.", "num3"),
  li("El vendedor registra la venta y el stock se descuenta automáticamente.", "num3"),
  li("Al cierre del día se compara el stock esperado con el conteo físico y se reportan los faltantes en pares y en Bs.", "num3"),
  li("La Gerencia ve los KPIs consolidados de todas las tiendas.", "num3"),
  h2("3.3 Objetivos SMART y KPI (2027–2029)"),
  tabla([["Objetivo SMART", 3.2], ["KPI", 2], ["Meta", 1.3]], [
    ["Elevar la exactitud del inventario en todas las tiendas en un plazo de 12 meses", "% de coincidencia entre sistema y conteo físico", "≥ 98 %"],
    ["Reducir el sobrestock de modelos de baja rotación en un 20 % en 24 meses", "Rotación de inventario (ventas/stock)", "+20 %"],
    ["Aumentar en un 15 % la participación de la línea de cuero en ventas en 36 meses", "% de ventas en Bs de la línea de cuero", "+15 %"],
  ]),
  esp(),
  h2("3.4 Responsables y coordinación"),
  tabla([["Área", 1.3], ["Responsabilidad", 4]], [
    ["Gerencia General", "Patrocinio del proyecto y decisiones basadas en el dashboard"],
    ["Sistemas / TI", "Desarrollo, base de datos, integración con el ERP y soporte"],
    ["Ventas y tiendas", "Uso diario del escáner y registro de ventas"],
    ["Almacén y logística", "Cierre del día, reposición y transferencias entre tiendas"],
    ["Ciencia de datos", "Entrenamiento del modelo con todo el catálogo, KPIs y pronóstico de demanda"],
  ]),
  esp(),
  h2("3.5 Riesgos y mitigación"),
  tabla([["Riesgo", 2], ["Mitigación", 3]], [
    ["Resistencia al cambio del personal de tienda", "Piloto en 1 tienda, capacitación corta, interfaz simple de 1 toque"],
    ["Errores de reconocimiento con modelos parecidos o ángulos no entrenados", "Entrenar con fotos tomadas en tienda, confirmación manual y código de barras como respaldo"],
    ["Mala calidad de los datos iniciales", "Conteo físico inicial completo y gobierno de datos con responsable por tienda"],
  ]),
];

const est4 = [
  h1("4. Análisis financiero, mercado y toma de decisiones"),
  h2("4.1 Comparación de alternativas"),
  tabla([["Criterio", 1.4], ["A: solo dashboard (BI)", 2.2], ["B: Manaco Vision completo", 2.2]], [
    ["Qué incluye", "Reportes con datos cargados manualmente", "Cámara, inventario, ventas, cierre y dashboard"],
    ["Costo estimado*", "Bajo (licencia de BI y analista)", "Medio (desarrollo, celulares existentes, nube)"],
    ["Beneficio", "Visibilidad parcial y con retraso", "Datos en tiempo real, detección de faltantes, base para pronóstico"],
    ["Riesgo", "Datos manuales poco confiables", "Adopción en tiendas (mitigable con un piloto)"],
    ["KPI de seguimiento", "Uso de reportes", "Exactitud de inventario, rotación y faltantes en Bs"],
  ]),
  p(TR({ text: "*Estimación cualitativa: se requieren costos internos de Manaco para cuantificar.", italics: true, size: 18 })),
  p([b("Recomendación: Alternativa B. "), "Resuelve la causa raíz (falta de datos confiables) y no solo la muestra. Además, genera el historial necesario para un futuro pronóstico de demanda."]),
  h2("4.2 Segmento y acción comercial"),
  p([b("Segmento: "), "hombres y mujeres adultos que trabajan y buscan calzado formal o casual de cuero duradero."]),
  p([b("Acción: "), "campaña \"Cuero boliviano que dura\", con vitrina y canal digital enfocados en la línea de cuero, sustentada en el mayor valor por par de esa categoría (unos 45 USD) y en que es donde el importado barato compite menos. Manaco Vision mide la respuesta en ventas por modelo y por tienda."]),
  h2("4.3 Indicadores de seguimiento"),
  li([b("Ventas en Bs de la línea de cuero "), "(mensual, por tienda)."]),
  li([b("Exactitud de inventario "), "(% de coincidencia en el cierre del día)."]),
  li([b("Faltantes detectados "), "(pares y Bs por mes)."]),
  h2("4.4 Información que falta"),
  p("Para estimar costos y rentabilidad con precisión se necesitan: costo de producción por modelo, márgenes, costos logísticos, tasas de defectos y devoluciones, tiempos de entrega y ventas históricas reales por tienda. El prototipo usa datos de operación simulados para demostrar el funcionamiento."),
];

const prot = [
  h1("5. Prototipo funcional"),
  p([b("Enlace: "), new ExternalHyperlink({ link: "https://gris999.github.io/manaco-vision/", children: [TR({ text: "https://gris999.github.io/manaco-vision/", style: "Hyperlink" })] }), " (se abre en el celular; la cámara requiere HTTPS)."]),
  tabla([["Componente", 1.6], ["Detalle", 4]], [
    ["Catálogo", "725 modelos reales de la tienda en línea de la empresa (360 de dama, 191 de hombre y 174 infantiles; marcas Bata, North Star, Bubble Gummers, Power, Manaco, entre otras), más la clase \"no es Manaco\""],
    ["Dataset", "2.740 fotos originales, ampliadas a unas 22.000 imágenes (30 por modelo) con variaciones de fondo, luz, giro y escala"],
    ["Modelo de IA", "MobileNetV2 (transfer learning) más una red densa; corre en el navegador con TensorFlow.js"],
    ["Resultado", "Validación con 4.430 imágenes no vistas: 82 % de acierto exacto (top-1) y 95 % con el modelo correcto entre las 3 primeras opciones (top-3). Si la IA duda, el vendedor elige con un toque."],
    ["Módulos", "Escáner, Inventario, Ventas, Cierre del día, Dashboard en lenguaje simple (semáforo y \"¿qué hacer hoy?\") y Mercado: explorador con filtros de los 230 registros de la base"],
    ["Roles", "Pantalla de inicio por rol: Vendedor (Escáner y Ventas), Encargado de tienda (Caja: apertura, arqueo y Reporte Z; Conteo de inventario; Inventario y Escáner) y Gerente (Resumen, Mercado e Inventario). Cada rol ve solo lo que necesita"],
    ["Fuentes de datos", "1) Excel del caso: 230 registros de mercado para la estrategia. 2) Catálogo público de la tienda en línea: 725 modelos reales para la IA y el inventario (el Excel no contiene modelos). Ventas y stock simulados"],
    ["Instalación", "App web instalable (PWA): ícono en la pantalla de inicio y funcionamiento sin internet"],
    ["Caja y contabilidad", "Ciclo tipo punto de venta (Odoo pos.session): apertura con fondo, ventas numeradas por método de pago, ingresos y retiros de efectivo, arqueo por billetes y Reporte Z con estado de resultados: venta bruta − IVA 13 % = venta neta; − costo = utilidad bruta; − IT 3 % = margen de contribución (costos simulados)"],
    ["Inventario (kardex)", "Libro de movimientos como el Stock Ledger Entry de ERPNext: cada venta, reposición y ajuste por conteo deja su saldo; la merma se valora a costo. Reglas de negocio en un módulo con pruebas unitarias"],
    ["Limitación", "Con 725 modelos, los parecidos (mismo modelo en otro color) se confunden más; reconoce ángulos parecidos a los del catálogo. En producción se entrenaría con fotos tomadas en tienda y se usaría código de barras como respaldo"],
  ]),
  h2("Conclusión"),
  p("Manaco no necesita competir por precio contra el importado: necesita conocer con exactitud qué tiene, qué vende y qué pierde, y apostar por su fortaleza en cuero. Manaco Vision convierte cada venta en un dato y cada dato en una decisión."),
];

function rubrica(titulo, quien) {
  const fases = [["N.º", 0.5], ["Nombre completo", 2.5], ["Fase 1 – Comprensión del caso", 1.3], ["Fase 2 – Diagnóstico empresarial", 1.3], ["Fase 3 – Propuesta estratégica", 1.3], ["Fase 4 – Análisis financiero y marketing", 1.3]];
  const filas = n => Array.from({ length: n }, (_, i) => [String(i + 1), "", "", "", "", ""]);
  return [
    h1(titulo),
    p("Escala: 0 (no se presentó) · 25 (muy poco desarrollado) · 50 (poco desarrollado) · 75 (aceptable) · 100 (óptimo)"),
    tabla(fases, filas(5), { size: 18 }), esp(),
    p(b(quien)),
    tabla([["N.º", 0.5], ["Nombre completo", 2.5], ["Fortalezas", 3], ["Debilidades", 3]], filas(5).map(f => f.slice(0, 4)), { size: 18 }),
  ];
}

const doc = new Document({
  creator: "Equipo consultor", title: "Manaco Vision — Caso Manaco",
  styles: {
    default: { document: { run: { font: "Poppins", size: 20 } } },
    paragraphStyles: [
      { id: "Normal", name: "Normal", quickFormat: true, run: { font: "Poppins", size: 20, color: "111111" }, paragraph: { spacing: { after: 120, line: 276 } } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: "Poppins", size: 32, bold: true, color: ROJO }, paragraph: { spacing: { after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: "Poppins", size: 24, bold: true, color: "111111" }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
    ]
  },
  numbering: { config: [
    { reference: "vin", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
    ...["num1", "num2", "num3"].map(r => ({ reference: r, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] })),
  ] },
  sections: [{
    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [TR({ text: "Manaco Vision · ", size: 16, color: "888888" }), TR({ children: [PageNumber.CURRENT], size: 16, color: "888888" })] })] }) },
    children: [...portada, ...resumen, ...est1, ...est2, ...est3, ...est4, ...prot,
      ...rubrica("Rúbrica de autoevaluación por grupo de los estudiantes", "Indicar sus fortalezas y debilidades en este proceso"),
      ...rubrica("Rúbrica de evaluación por grupo del docente", "Indicar las fortalezas y debilidades del estudiante en este proceso"),
      p("Nombre del docente: ……………………………………………………………", { spacing: { before: 400 } })].flat(3)
  }]
});
Packer.toBuffer(doc).then(buf => { fs.writeFileSync(path.join(P, "entregables", "Proyecto_Manaco_Vision.docx"), buf); console.log("ok"); });
