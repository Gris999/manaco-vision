# Plan de pruebas

## 1. Estrategia (pirámide de pruebas)

| Nivel | Qué prueba | Herramienta | Cuándo |
|---|---|---|---|
| **Unitarias** | Reglas de dominio: IVA, IT, utilidad, ventanas de fechas, caja, arqueo, kardex, KPIs, calidad, migración | `node:test` (`npm test`) | En cada cambio del dominio |
| **Integración / E2E** | Flujos completos por rol en el navegador | Navegador integrado (Chromium) con scripts | En cada iteración |
| **Dispositivo** | Cámara, fotos, instalación y gestos en Safari | Simulador iPhone 17 (Xcode) | Si cambia algo de iOS, cámara o PWA |
| **Exploratorias (QA)** | Usabilidad, densidad, mensajes y casos raros | Revisión manual por rol | Antes de cada publicación |
| **Modelo de IA** | Precisión top-1 y top-3 | Conjunto de validación (20 %) | Al reentrenar |

## 2. Pruebas unitarias (16, todas pasan)

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

## 5. Criterios de salida
- 100 % de las pruebas unitarias pasan.
- Los CP Must pasan en el navegador y en el iPhone.
- `verificarKardex()` sin errores.
- Sin hallazgos de severidad Alta abiertos ([informes/INFORME_QA.md](informes/INFORME_QA.md)).
