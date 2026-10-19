# Auditoría de estructura y escalabilidad (revisión senior, v21)

Veredicto corto: **el código es adecuado para un prototipo académico y está bien separado en su núcleo (dominio), pero NO es escalable tal como está.** Pasar a 50 tiendas, a varios usuarios por tienda o a datos centralizados exige los cambios de la §4. Esto se dice tal cual en la defensa: reconocer los límites es parte del criterio de ingeniería.

## 1. Cómo está estructurado hoy

| Capa | Archivos | Calidad |
|---|---|---|
| Dominio | `js/dominio.js` (≈200 líneas) | **Buena.** Funciones puras, sin DOM; dinero en centavos; 17 pruebas unitarias; reutilizable en un backend Node tal cual |
| Presentación | `js/ui/*.js` (8 archivos, ≈810 líneas) + `index.html` | **Regular.** Separada por módulo funcional, pero son *scripts clásicos* que comparten **52 variables globales** y mutan el estado `S` directamente (98 accesos) |
| Persistencia | `guardar()` y `cargar()` sobre `localStorage` | **Débil para escalar.** Un único documento JSON de ≈1,8 MB; límite del navegador ≈5 MB |
| Infraestructura | `sw.js`, `manifest.json` | **Buena.** Caché versionada y aviso de actualización |

## 2. Lo que está bien (y por qué)
1. **Separación dominio / vista**: las reglas de dinero y stock no dependen de la pantalla; por eso se pueden probar en Node.
2. **Kardex como única puerta del stock**: `moverStock()` garantiza trazabilidad; `verificarKardex()` detecta inconsistencias.
3. **Validación de entradas en el dominio** (`leerCantidad`, `leerMonto`), no repartida en la vista.
4. **Migración de esquema versionada** (`VERSION_ESQUEMA`, `migrar()` idempotente).
5. **Sin dependencias de compilación**: se abre y se audita en cualquier navegador.

## 3. Deuda técnica (encontrada y medida)

| # | Problema | Evidencia | Riesgo | Corrección propuesta |
|---|---|---|---|---|
| D1 | Estado global mutable | 52 globales; `S` se modifica desde 6 archivos | Un módulo puede romper a otro; difícil de probar la vista | *Store* único con acciones (`dispatch("VENDER", …)`), estilo Redux o Zustand |
| D2 | Vista por *template strings* + `innerHTML` | 54 asignaciones `innerHTML`; 36 líneas de más de 300 caracteres | Riesgo de XSS si falta `esc()`; difícil de mantener | Componentes (Preact, Lit o Vue) o, al menos, funciones de plantilla pequeñas |
| D3 | Cálculos en la vista | 17 `reduce()` en `js/ui/` (totales, rankings) | Reglas duplicadas sin pruebas | Moverlos a `dominio.js` (por ejemplo `rankingModelos`, `ventasPorTienda`) |
| D4 | Persistencia en `localStorage` | 1 documento por dispositivo | Sin sincronización entre tiendas; tope de ≈5 MB (≈15.000 ventas) | API + PostgreSQL; IndexedDB como caché offline |
| D5 | Sin autenticación | El rol se elige libremente | Cualquiera puede anular ventas | Login + JWT; permisos por rol en el servidor |
| D6 | Sin pruebas automáticas de la interfaz | El E2E se corrió con scripts en el navegador, no en CI | Regresiones visuales | Playwright en GitHub Actions |
| D7 | `prompt()` y `confirm()` nativos | Anulación y cierres | Mala experiencia en móvil | Modales propios |
| D8 | Carga entera del catálogo en memoria | `catalogo.json` con 725 modelos | Con 10.000 modelos sería lento | Paginación desde la API e índices |

## 4. Ruta para hacerlo escalable (en orden)
1. **Backend**: API REST (FastAPI o Node/Express) + PostgreSQL. Tablas: `modelo`, `stock`, `movimiento` (kardex), `venta`, `sesion_caja`, `conteo`, `pedido`, `usuario`. El dominio actual se reutiliza en Node o se traduce 1:1.
2. **Sincronización offline**: cola de operaciones en IndexedDB que se envía al volver la conexión; el servidor es la fuente de verdad del kardex.
3. **Seguridad**: login, roles validados en el servidor, auditoría de anulaciones.
4. **Frontend**: TypeScript + *bundler* (Vite) + componentes; estado con acciones.
5. **Calidad**: CI con `npm test` + Playwright en cada *push*; medición de cobertura.
6. **IA**: reentrenamiento periódico con fotos tomadas en tienda; modelo versionado.

## 5. Escalabilidad en números (estimación)

| Escenario | ¿Funciona hoy? |
|---|---|
| 3 tiendas, 1 celular por tienda, demo | ✅ |
| 3 tiendas, varios vendedores por tienda | ❌ Cada celular tiene su propio stock (no se comparte) |
| 1 año de ventas (~60.000) | ❌ Supera el límite de `localStorage` |
| 725 → 5.000 modelos | ⚠️ Funciona, pero conviene paginar desde un servidor |
| 50 tiendas | ❌ Requiere backend (§4) |
