# Plan de pruebas

## 1. Estrategia (pirámide de pruebas)

| Nivel | Qué prueba | Herramienta | Cuándo |
|---|---|---|---|
| **Unitarias** | Reglas de dominio y del reductor de acciones: permisos, día completo, idempotencia, reproducción | `node:test` (`npm test`) | En cada *push* (CI) |
| **Integración (API)** | Servidor real con una base de datos temporal: login, 401, rutas privadas, rol impuesto, atomicidad, límite de intentos | `node:test` + `fetch` | En cada *push* (CI) |
| **Tipos** | Dominio, acciones y servidor | `tsc` sobre JSDoc (`npm run tipos`) | En cada *push* (CI) |
| **E2E** | Modo demo (3 roles, día completo) y modo servidor (2 celulares) | Playwright (`npm run test:e2e`) | En cada *push* (CI) |
| **Dispositivo** | Cámara, fotos, instalación y gestos en Safari | Simulador iPhone 17 (Xcode) | Si cambia algo de iOS, cámara o PWA |
| **Exploratorias (QA)** | Usabilidad, densidad, mensajes y casos raros | Revisión manual por rol | Antes de cada publicación |
| **Modelo de IA** | Precisión top-1 y top-3 | Conjunto de validación (20 %) | Al reentrenar |

## 2. Pruebas unitarias (17, todas pasan)

| # | Caso | Verifica |
|---|---|---|
| 1 | Desglose de Bs 100 | IVA 13, neto 87, IT 3 |
| 2 | Resumen de ventas | Utilidad sobre la venta **neta**, ticket y precio por par, pagos |
| 3 | 10 × Bs 181,30 | Sin error de coma flotante |
| 4 | Lista vacía | No divide entre cero |
| 5–6 | Ventanas de 30 y 1 día | Días exactos y periodo anterior del mismo largo |
| 7 | Caja | Esperado = fondo + efectivo + ingresos − retiros |
| 8 | Arqueo | Denominaciones con centavos |
| 9–11 | Kardex | Saldos, bloqueo de stock negativo, detección de stock alterado |
| 12 | Conteos | Exactitud (IRA) y merma **a costo** |
| 13 | Cobertura | Días de stock y venta cero = ∞ |
| 14 | Migración v6 → v7 | Idempotente; el kardex cuadra |
| 15 | Anuladas | No suman ingreso, costo ni transacciones |
| 16 | Calidad | Devolución por tipo, tasa de defectos y plazo de entrega |
| 17 | Validación de entradas | Cantidades y montos inválidos se rechazan (null) |

## 3. Casos de prueba E2E

| ID | Rol | Pasos | Resultado esperado | Estado |
|---|---|---|---|---|
| CP-01 | Vendedor | Vender con la caja cerrada | Bloqueado con mensaje | ✅ |
| CP-02 | Encargado | Abrir caja → vender en efectivo y QR → arqueo con faltante → cerrar | El Reporte Z muestra solo la sesión y el faltante aparte | ✅ |
| CP-03 | Encargado | Cerrar sin arqueo | Bloqueado | ✅ |
| CP-04 | Vendedor | Doble toque en Vender | Una sola venta | ✅ |
| CP-05 | Encargado | Conteo de hoy: 35 modelos en páginas de 10; ir al final | La barra "Cerrar conteo" queda bajo la paginación, sin tapar tarjetas | ✅ |
| CP-06 | Encargado | Escribir texto en el conteo | Se rechaza (no guarda 0) | ✅ |
| CP-07 | Encargado | Cerrar el conteo dos veces el mismo día | Reemplaza, no duplica | ✅ |
| CP-08 | Encargado | Anular una venta "defecto: suela despegada" | Stock +1 en el kardex; caja revertida; el Resumen suma un defecto | ✅ |
| CP-09 | Gerente → Encargado | Pedir reposición → Recibir | +10 pares; se registra la fecha y entra al plazo de entrega | ✅ |
| CP-10 | Todos | Recorrer 9 combinaciones de rol × vista en 375 y 1366 px | Sin errores de consola ni scroll horizontal | ✅ |
| CP-11 | Todos | Apagar el servidor y recargar | La app y la IA funcionan | ✅ |
| CP-12 | Vendedor | IA con confianza baja | Muestra "¿Es alguno de estos?" con 3 opciones | ✅ |

## 4. Resultados de la IA
- 726 clases (725 modelos + "no es zapato"), 2.738 fotos originales y 22.150 aumentadas.
- Validación: **82 % top-1** y **95 % top-3**. Modo prueba: 90 % con el correcto en el top-3.
- Error típico: el mismo modelo en otro color (mitigado con el top-3).

## 4b. Suite automática v22 (29 + 2)
- `tests/dominio.test.js` (18): contabilidad, fechas, caja, kardex, KPIs, calidad, validación de entradas y agregaciones del Resumen.
- `tests/acciones.test.js` (6): permisos por rol; día completo (abrir → vender → retiro → anular por defecto → contar → cerrar con faltante); pedido sin duplicar y recibido solo por la tienda destino; idempotencia; reproducción del registro de acciones; estado inicial determinista.
- `tests/servidor.test.js` (5): salud pública y 401; rutas privadas; dos usuarios donde el servidor impone rol y tienda; atomicidad; límite de intentos de login.
- `e2e/flujos.spec.js` (2): por la interfaz real en un celular emulado (Pixel 7).

Pruebas manuales adicionales en el navegador (v22): migración desde `localStorage`; venta de otro celular visible en la caja del encargado; **servidor apagado → la venta queda en cola → al reiniciar el servidor se envía sola** (rev 2 → 3).

## 5. Criterios de salida
- 100 % de las pruebas unitarias pasan.
- Los CP Must pasan en el navegador y en el iPhone.
- `verificarKardex()` sin errores.
- Sin hallazgos de severidad Alta abiertos ([informes/INFORME_QA.md](informes/INFORME_QA.md)).

## 6. Ejecución E2E completa (v21, 19/10/2026)

Datos borrados, celular de 375 px, acciones por la interfaz real (botones y campos), los 3 roles en secuencia. Todo excepto la cámara.

| Flujo | Funciones ejercitadas | Resultado |
|---|---|---|
| Vendedor sin caja | Aviso, botón Vender bloqueado | ✅ |
| Encargado abre la caja | Fondo, ingreso con y sin motivo, retiro mayor al efectivo | ✅ tras corregir **B1** |
| Vendedor vende | Búsqueda, efectivo y tarjeta, doble toque, cantidades inválidas, más que el stock, N° correlativo | ✅ tras corregir **B2** |
| Encargado anula y repone | Anulación con motivo (no dos veces), +5 desde la ficha, kardex visible | ✅ |
| Conteo cíclico | 35 modelos en páginas de 10, ciego, texto rechazado, "esta página cuadra", diferencia −1, cierre parcial con aviso, ajuste en kardex | ✅ |
| Cierre de caja | Bloqueo sin arqueo, arqueo con sobrante, Reporte Z, segunda sesión con id propio y Z en 0 | ✅ |
| Gerente | Periodos Hoy/7/30, filtro por tienda, Pedir, top 15, calidad, Mercado con filtros y estado vacío, inventario total sin "reponer" | ✅ tras corregir **B3** |
| Encargado de la tienda destino | Recibir pedido (+10 y fecha de recepción) | ✅ |
| Persistencia | Recargar la página conserva ventas, pedidos y sesión abierta | ✅ |
| Integridad | `verificarKardex` = 0 errores al final | ✅ |

### Fallas encontradas y corregidas
| # | Capa | Falla | Corrección |
|---|---|---|---|
| B1 | Lógica (caja) | Un fondo vacío o no numérico abría la caja con Bs 0 sin avisar | `D.leerMonto()`; se rechaza con mensaje |
| B2 | Lógica (venta) | Cantidad 0, −3, vacía o 1,5 se convertía en **1 par** sin avisar | `D.leerCantidad()` en la vista **y** en `vender()` (defensa en dos capas) |
| B3 | Lógica + interfaz (Gerente) | Se podía pedir la misma reposición infinitas veces; el botón "Pedir" volvía a aparecer | `pedidoPendiente()`; el botón queda en "Pedido ✓" deshabilitado |
| B4 | Despliegue | Al cambiar código sin subir `VERSION`, el service worker sigue sirviendo la versión anterior | Ya estaba en la Definición de Terminado; v21. Pendiente: chequeo automático en CI |

### Observaciones (no son fallas, son decisiones a explicar)
- El Resumen de 7 y 30 días excluye el día en curso (comparación justa). Una devolución de hoy solo se ve en "Hoy".
- La búsqueda del Inventario se mantiene al cambiar de rol.
