# Informe de QA — Manaco Vision (v10, 19/10/2026)

Revisión de funcionalidad, datos, diseño, accesibilidad y rendimiento. Probado en 375 px (celular) y 1366 px (escritorio), con los 3 roles.

## Hallazgos y estado

| # | Severidad | Área | Hallazgo | Estado |
|---|---|---|---|---|
| 1 | **Alta** | Conteo | Mostraba 30 de 725 modelos con "Mostrar más" y **al cerrar solo conciliaba los visibles**; los demás quedaban sin contar y sin aviso | ✅ Rediseñado: paginado (20 por página, 37 páginas), borrador que se guarda solo, progreso "Contados X de 725", filtros (Vendidos hoy, Pendientes, Con diferencia, sección), "Marcar página como correcta", "✓ Hay N", "Deshacer", y aviso al cerrar con modelos sin contar |
| 2 | **Alta** | Conteo / Resumen | El conteo se podía cerrar varias veces el mismo día y se **duplicaban** los registros (inflaba exactitud y faltantes) | ✅ Un solo conteo vigente por día y tienda; un nuevo conteo reemplaza al anterior |
| 3 | **Alta** | Roles / Caja | Vendedor y Encargado podían **cambiar de tienda** desde la barra y vender fuera de su caja | ✅ Tienda fija por rol; solo se cambia desde la pantalla de roles |
| 4 | Media | Caja | El Reporte Z mezclaba ventas de sesiones anteriores del mismo día | ✅ Cada sesión cuenta solo sus ventas |
| 5 | Media | Caja | Montos redondeados sin centavos y faltaban monedas de 0,20 y 0,10 | ✅ Montos con centavos y denominaciones completas |
| 6 | Media | Inventario | El Encargado no podía reponer desde Inventario | ✅ Botón "+5 reponer aquí" |
| 7 | Media | Resumen | El Gerente "reponía" directamente (no es su función) | ✅ Ahora "Pedir": el pedido aparece al Encargado con "Recibir" |
| 8 | Baja | Ventas | "Registrar venta" se habilitaba con la caja cerrada al cambiar de modelo | ✅ Corregido |
| 9 | Baja | Diseño | Tarjetas del conteo apretadas en celular (nombres cortados) | ✅ Controles en segunda línea, texto más corto |
| 10 | Baja | Diseño | Los avisos tapaban el botón fijo "Cerrar conteo" | ✅ En celular los avisos salen arriba |
| 11 | Baja | Diseño | "Encargado de tienda" ocupaba 2 líneas; el botón Instalar se montaba sobre el logo | ✅ Corregido |
| 12 | Baja | Inventario | El Gerente veía "aquí" sin tener tienda | ✅ Ve el total |

## Pruebas automatizadas en el navegador (todas pasan)
- Venta sin caja → bloqueada con mensaje · Abrir caja → vender (efectivo y QR) → arqueo con faltante → Reporte Z correcto (solo ventas de la sesión) → venta tras cierre bloqueada.
- Conteo: 37 páginas, filtros, marcar página, diferencia −1, cierre parcial (20 de 725), nuevo conteo reemplaza (20 → 1 registro), stock ajustado.
- Pedido del Gerente → aparece al Encargado → "Recibir" suma 10 pares.
- 9 combinaciones rol × vista sin errores ni scroll horizontal (375 y 1366 px).
- Sin internet: la app y la IA funcionan con el servidor apagado (service worker).
- Rendimiento: cada vista se dibuja en 1–31 ms con 725 modelos y ~5.400 ventas.

## Limitaciones conocidas (decirlas en la defensa)
- Datos de operación y **costos simulados**; sin backend (los datos viven en cada celular).
- Sin usuarios ni contraseñas (prototipo); en producción, login por rol.
- La IA confunde más el mismo modelo en otro color (82 % exacto, 95 % en top-3).
- Fuera de alcance: devoluciones, descuentos, transferencias entre tiendas, historial completo de sesiones.
