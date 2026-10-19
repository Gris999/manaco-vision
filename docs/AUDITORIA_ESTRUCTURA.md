# Auditoría de estructura y escalabilidad (v22)

**Veredicto (v22)**: la deuda técnica medida en v21 se corrigió. El sistema ahora tiene:
- Un **backend real** (API + SQLite + login por rol).
- **Una sola fuente de reglas** compartida entre el celular y el servidor.
- **Sincronización offline-first**.
- **Pruebas en 4 niveles con CI**.

Sigue siendo un prototipo académico. La §4 indica lo que aún falta para operar 50 tiendas en producción.

## 1. Deuda técnica de v21 y su corrección

| # | Problema en v21 | Corrección en v22 | Evidencia |
|---|---|---|---|
| D1 | Estado global mutado desde 6 archivos | **Patrón *command* / reductor**: toda operación es una acción (`VENDER`, `ANULAR`, `CERRAR_CAJA`…) que pasa por `Acciones.aplicar()`. La vista solo llama a `ejecutar(tipo, datos)`; los borradores (conteo y arqueo a medias) viven aparte, en `BORR` | `js/acciones.js`; `grep` de mutaciones de `S` en `js/ui/` = 0, salvo la carga y la sincronización |
| D2 | Riesgo de XSS con `innerHTML` | Revisados los 54 puntos: todo texto de usuario pasa por `esc()`; el reductor limpia y limita el texto libre (`texto()`, 120 caracteres); los nombres de sesión usan `textContent` | Revisión manual + prueba de rutas privadas |
| D3 | Cálculos en la vista (17 `reduce`) | Ranking, facturación por tienda, serie diaria e inventario valorizado pasaron a `dominio.js`, con pruebas | `rankingModelos`, `facturacionPor`, `serieDiaria`, `inventarioValorizado` |
| D4 | `localStorage` (≈5 MB, un dispositivo) | **IndexedDB** en el celular (cientos de MB) + **servidor con SQLite** compartido por las 3 tiendas; migración automática desde `localStorage` | `js/ui/estado.js` (`Almacen`), `server/servidor.js` |
| D5 | Sin autenticación | **Login** con contraseñas *scrypt*, token firmado HS256 de 12 h, límite de 10 intentos cada 5 min. **El servidor impone rol, usuario y tienda** desde la base de datos, no desde lo que envía el celular | Prueba: el vendedor que dice ser gerente es rechazado; la venta "en otra tienda" se registra en la suya |
| D6 | E2E solo con scripts manuales | **Playwright** con 2 flujos completos (modo demo con 3 roles y modo servidor con 2 celulares) + **GitHub Actions** en cada *push* | `e2e/flujos.spec.js`, `.github/workflows/ci.yml` |
| D7 | `prompt()` y `confirm()` nativos | Diálogos propios accesibles (`role="dialog"`, Escape, foco). La anulación pide el motivo de una lista (defecto, talla, otro), así el KPI de defectos es confiable | `dialogo()` y `confirmar()` |
| D8 | Catálogo completo en memoria | Sin cambio (725 modelos ≈ 0,4 MB). Ver §4 | — |
| B4 | VERSION del service worker olvidada | `npm run verificar-version` falla si cambian archivos en caché sin subir VERSION; corre en CI | `herramientas/verificar_version.js` (probado en positivo y negativo) |
| — | Sin tipos | `// @ts-check` + `tsc` sobre el dominio, las acciones y el servidor; encontró 2 errores reales (resta de `Date` y tupla sin tipo) | `npm run tipos` |

## 2. Estructura actual

```
Celular (PWA)                                   Servidor (Node 22)
┌───────────────────────────┐                  ┌───────────────────────────────┐
│ Presentación  js/ui/*.js  │                  │ HTTP  server/servidor.js      │
│   ↓ ejecutar(tipo, datos) │                  │   login · permisos · CORS     │
│ Aplicación   ui/estado.js │ ── acciones ──▶  │   ↓                           │
│   cola offline · IndexedDB│ ◀── estado ────  │ Acciones.aplicar (MISMA)      │
│   ↓                       │                  │   ↓                           │
│ Acciones  js/acciones.js  │ ◀─ código común ─▶│ SQLite: usuarios, acciones,   │
│ Dominio   js/dominio.js   │                  │ rechazos, instantánea         │
└───────────────────────────┘                  └───────────────────────────────┘
```

**Por qué es escalable ahora:**
- La lógica no se duplica.
- El servidor guarda **cada acción** (auditoría: quién, qué y cuándo) y una instantánea del estado.
- Cada acción tiene un id único, así que **reintentar no duplica**.
- Si una acción falla, el estado no cambia (atomicidad con `structuredClone`).

## 3. Métricas de calidad

| Métrica | v21 | v22 |
|---|---|---|
| Pruebas automáticas | 17 | **29 unitarias y de integración + 2 E2E** |
| Capas con reglas probadas | dominio | dominio, acciones y API |
| Mutaciones directas de `S` en la vista | 98 accesos | 0 |
| `prompt` / `confirm` nativos | 6 | 0 |
| Autenticación | no | sí (scrypt + token) |
| Datos compartidos entre tiendas | no | sí (servidor) |
| CI | no | sí (4 compuertas) |

## 4. Lo que falta para producción a gran escala (honesto)
1. **Base de datos**: SQLite basta para 3–10 tiendas con un servidor. Para 50 o más tiendas: PostgreSQL y tablas normalizadas de ventas y stock en vez de una instantánea JSON. La interfaz `procesarLote()` no cambia.
2. **Instantánea completa**: hoy el celular descarga el estado completo (≈2 MB) cuando cambia. A escala: deltas por `rev`.
3. **Concurrencia**: el servidor procesa las acciones en serie (un proceso Node). Basta para decenas de tiendas; más allá, colas o particionar por tienda.
4. **Presentación**: sigue en *template strings* (sin framework). Migrar a componentes con TypeScript mejoraría el mantenimiento, no la escala.
5. **Facturación SIN, gestión de usuarios desde la app, copias de seguridad automáticas** de la base.
