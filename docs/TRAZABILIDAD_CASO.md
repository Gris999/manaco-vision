# Trazabilidad: qué pide el caso y dónde se cumple

Leyenda: ✅ cubierto · ⚠️ parcial (se explica) · ❌ no cubierto (se dice en la defensa)
**W** = Word del proyecto · **P** = diapositivas · **App** = Manaco Vision · **G** = guion

## Estación 1 — Comprensión del caso
| Pide | Dónde | Estado |
|---|---|---|
| Factores internos y externos | W §1 | ✅ |
| Problemas en las 6 áreas (gestión, producción e inventario, mercado, rentabilidad, clientes, datos) | W, tabla de 5 problemas prioritarios | ✅ |
| Información cuantitativa y cualitativa necesaria | W, columna "Datos necesarios" | ✅ |
| Priorizar por impacto | W, tabla ordenada | ✅ |
| Producto: tabla N.º / problema / justificación / datos | W | ✅ |

## Estación 2 — Diagnóstico con ciencia de datos
| Pide | Dónde | Estado |
|---|---|---|
| Diccionario, tipos, faltantes y agregados | W §2, `analisis.py` | ✅ |
| Separar "Mundo" de los países (doble conteo) | `analisis.py`: el total "Mundo" se excluye; `mercado.json` solo trae países | ✅ |
| Valor y cantidad por flujo y categoría; ranking de socios | W + App › Mercado | ✅ |
| Valor por par y sus limitaciones (≠ precio al consumidor) | W + App › Mercado (nota) | ✅ |
| 3 gráficos: importación vs exportación, socios, valor por par | W, P, App › Mercado | ✅ |
| 3 hallazgos, 2 limitaciones, 1 pregunta estratégica | W, síntesis ejecutiva | ✅ |
| Distinguir datos de hipótesis | W + App (etiquetas Registrado / Simulado / Falta) | ✅ (reforzado en v20) |

## Estación 3 — Propuesta estratégica
| Pide | Dónde | Estado |
|---|---|---|
| Solución de ciencia de datos: problema, datos y decisión | W, ficha de propuesta + App | ✅ |
| 3 objetivos SMART a 3 años con KPI | W + App › Resumen › Metas | ✅ |
| Coordinación de áreas y responsables | W + roles de la App | ✅ |
| 2 riesgos con mitigación | W | ✅ |
| Viabilidad con los recursos disponibles | W (costo cero: PWA y GitHub Pages) | ✅ |

## Estación 4 — Financiero, mercado y decisión
| Pide | Dónde | Estado |
|---|---|---|
| Comparar 2 alternativas (beneficio, costo, riesgo, indicador) | W, tabla de alternativas | ✅ |
| Segmento de clientes + acción comercial | W (segmento basado en el Excel: casual de cuero frente al deportivo importado) | ⚠️ La app no registra clientes; HU-18 queda pendiente |
| Indicadores de **ventas** | App › Resumen | ✅ |
| Indicadores de **devoluciones** | App › Resumen › Calidad (anulaciones con motivo) | ✅ nuevo en v20 |
| Indicadores de **defectos** | App › Resumen › Calidad (devoluciones clasificadas como "defecto") | ✅ nuevo en v20 |
| Indicadores de **entregas** | App › Resumen › Calidad (plazo pedido → recepción y % a tiempo) | ✅ nuevo en v20 |
| Indicadores de **producción** | App › Resumen › Calidad, rotulado como **Falta** | ❌ Se necesita el ERP de fábrica: se declara como dato a solicitar |
| Información que falta para costos y rentabilidad | W + App (costos simulados, sin crédito fiscal, sin gastos operativos) | ✅ |
| 3 indicadores de seguimiento | W + App › Metas (exactitud ≥ 98 %, merma ≤ 0,5 %, mezcla casual + formal) | ✅ |

## Producto final integrador
| Pide | Dónde | Estado |
|---|---|---|
| Problema prioritario + evidencia | P, diapositivas 1–2 | ✅ |
| 1–2 gráficos con interpretación | P + App | ✅ |
| Solución, objetivos e indicadores | P + demo de la App | ✅ |
| Alternativas, riesgos y recomendación | P + G | ✅ |
| Distinguir datos simulados, supuestos y conclusiones | App (etiquetas), REQUISITOS §5, G | ✅ |

## Qué sigue faltando (decirlo con honestidad en la defensa)
1. **Producción y costos reales**: requieren datos internos de Manaco (ERP de planta).
2. **Clientes**: no se registra quién compra, así que no hay segmentación con datos propios; el segmento sale del Excel de mercado.
3. **Sincronización entre tiendas**: hoy cada celular guarda sus datos; en producción, API + PostgreSQL.
4. **Facturación SIN, descuentos y carrito**: fuera del alcance del prototipo.
