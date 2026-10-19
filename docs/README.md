# Documentación de ingeniería — Manaco Vision

Equipo: **Pedro Alaca** y **Rodrigo Viveros** · Ingeniería de Sistemas, 6.º semestre (ABR).

| # | Documento | Pregunta que responde |
|---|---|---|
| 1 | [METODOLOGIA.md](METODOLOGIA.md) | ¿Cómo se trabajó? Enfoque, proceso, iteraciones y Definición de Terminado |
| 2 | [REQUISITOS.md](REQUISITOS.md) | ¿Qué hace el sistema y para quién? Historias de usuario y requisitos no funcionales |
| 3 | [ARQUITECTURA.md](ARQUITECTURA.md) | ¿Cómo está construido? Capas, módulos, datos, decisiones y diagramas |
| 4 | [PLAN_DE_PRUEBAS.md](PLAN_DE_PRUEBAS.md) | ¿Cómo sabemos que funciona? Estrategia, casos y resultados |
| 5 | [TRAZABILIDAD_CASO.md](TRAZABILIDAD_CASO.md) | ¿Qué pide el caso y dónde se cumple? Estación por estación, con lo que falta |
| 6 | [AUDITORIA_ESTRUCTURA.md](AUDITORIA_ESTRUCTURA.md) | ¿El código es escalable? Deuda técnica de v21, cómo se corrigió y qué falta |
| — | [informes/](informes/) | Auditoría senior, QA y análisis contable (evidencia de cada iteración) |

## Cómo ejecutar

```bash
npm install          # solo herramientas de desarrollo (TypeScript, Playwright)
npm test             # 29 pruebas: dominio, acciones y API
npm run tipos        # verificación de tipos
npm start            # servidor + app en http://localhost:8787 (crea server/datos/manaco.db)
npm run test:e2e     # flujos completos en un navegador (levanta su propio servidor)
```

- **Modo demo** (GitHub Pages o cualquier servidor estático): eliges el rol y los datos quedan en el celular.
- **Modo servidor**: en la pantalla de inicio, "Iniciar sesión" con un usuario de `server/usuarios.semilla.json` (claves de demostración).

## Mapa del código

```
app/
├── index.html              Vista (HTML + Tailwind)
├── js/
│   ├── dominio.js          DOMINIO: reglas puras (IVA, IT, kardex, caja, KPIs) — @ts-check, probado
│   ├── acciones.js         ACCIONES: reductor compartido celular/servidor (permisos + 11 operaciones)
│   └── ui/
│       ├── estado.js         APLICACIÓN: ejecutar(), IndexedDB, cola offline, sincronización, diálogos
│       ├── nucleo.js         configuración, roles, navegación, inicio de sesión
│       ├── ia.js             cámara + MobileNetV2 + clasificador
│       ├── operaciones.js    venta, reposición, pedidos, anulación (vista)
│       ├── conteo.js         conteo cíclico (vista + borrador)
│       ├── caja.js           caja, arqueo, Reporte Z (vista)
│       ├── dashboard.js      Resumen del Gerente
│       ├── mercado.js        base del Excel
│       └── pwa.js            instalación, offline, arranque
├── server/
│   ├── servidor.js         API REST + SQLite + login (Node 22, sin dependencias)
│   └── usuarios.semilla.json  usuarios de demostración
├── tests/                  dominio, acciones y servidor (node:test)
├── e2e/                    Playwright
├── .github/workflows/ci.yml   CI: pruebas, tipos, VERSION del service worker y E2E
├── render.yaml             despliegue del servidor en Render
└── docs/                   esta documentación
```
