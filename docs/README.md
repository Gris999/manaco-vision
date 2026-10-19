# Documentación de ingeniería — Manaco Vision

Equipo: **Pedro Alaca** y **Rodrigo Viveros** · Ingeniería de Sistemas, 6.º semestre (ABR).

| # | Documento | Pregunta que responde |
|---|---|---|
| 1 | [METODOLOGIA.md](METODOLOGIA.md) | ¿Cómo se trabajó? Enfoque, proceso, iteraciones y Definición de Terminado |
| 2 | [REQUISITOS.md](REQUISITOS.md) | ¿Qué hace el sistema y para quién? Historias de usuario y requisitos no funcionales |
| 3 | [ARQUITECTURA.md](ARQUITECTURA.md) | ¿Cómo está construido? Capas, módulos, datos, decisiones y diagramas |
| 4 | [PLAN_DE_PRUEBAS.md](PLAN_DE_PRUEBAS.md) | ¿Cómo sabemos que funciona? Estrategia, casos y resultados |
| 5 | [TRAZABILIDAD_CASO.md](TRAZABILIDAD_CASO.md) | ¿Qué pide el caso y dónde se cumple? Estación por estación, con lo que falta |
| 6 | [AUDITORIA_ESTRUCTURA.md](AUDITORIA_ESTRUCTURA.md) | ¿El código es escalable? Estructura real, deuda técnica medida y ruta a producción |
| — | [informes/](informes/) | Auditoría senior, QA y análisis contable (evidencia de cada iteración) |

## Mapa del código

```
app/
├── index.html            Vista (HTML + Tailwind): 7 pantallas y modales
├── js/
│   ├── dominio.js        DOMINIO: reglas de negocio puras (IVA, IT, kardex, caja, KPIs) — probado
│   └── ui/               PRESENTACIÓN, un archivo por módulo funcional
│       ├── nucleo.js       configuración, estado, persistencia, roles, navegación
│       ├── ia.js           cámara + MobileNetV2 + clasificador (726 clases)
│       ├── operaciones.js  venta, reposición, pedidos, anulación
│       ├── conteo.js       conteo cíclico de inventario
│       ├── caja.js         sesión de caja, arqueo, Reporte Z
│       ├── dashboard.js    Resumen del Gerente
│       ├── mercado.js      base del Excel del caso
│       └── pwa.js          instalación, offline, actualizaciones, arranque
├── tests/dominio.test.js Pruebas unitarias (node:test) — `npm test`
├── sw.js · manifest.json PWA
├── catalogo.json · mercado.json   Datos estáticos
├── modelo/ · mobilenet/  Modelos de IA (TensorFlow.js)
├── herramientas/         Scripts de datos, entrenamiento y documentos
└── docs/                 Esta documentación
```
