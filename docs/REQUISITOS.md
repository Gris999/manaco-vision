# Requisitos

## 1. Problema y objetivo
Manaco no integra los datos de mercado con los datos internos de ventas, inventario, calidad y clientes (caso, problemas de referencia). En tienda, saber "¿cuántos pares hay de este modelo?" exige buscar a mano entre 725 modelos.

**Objetivo del sistema**: identificar un zapato con la cámara en menos de 2 segundos, ver su stock en las 3 tiendas y convertir cada operación (venta, caja, conteo, devolución, pedido) en indicadores para Gerencia.

## 2. Actores
| Actor | Objetivo |
|---|---|
| Vendedor | Atender rápido: identificar el modelo, ver stock y vender |
| Encargado de tienda | Que la caja y el inventario cuadren cada día |
| Gerente | Decidir con datos de las 3 tiendas y del mercado |

## 3. Historias de usuario (backlog priorizado, MoSCoW)

| ID | Como… | quiero… | para… | Prioridad | Criterio de aceptación | Estado |
|---|---|---|---|---|---|---|
| HU-01 | Vendedor | apuntar la cámara a un zapato | saber qué modelo es | Must | Top-3 con confianza en < 2 s; si la confianza es < 55 %, mostrar 3 opciones | ✅ |
| HU-02 | Vendedor | ver el stock del modelo en las 3 tiendas | ofrecerlo aunque no esté aquí | Must | Stock por tienda visible en la ficha | ✅ |
| HU-03 | Vendedor | registrar la venta con su método de pago | que el stock baje solo | Must | Bloquea si la caja está cerrada o no hay stock; N° correlativo; ignora el doble toque | ✅ |
| HU-04 | Encargado | abrir la caja con un fondo | empezar el día | Must | No se vende sin caja abierta | ✅ |
| HU-05 | Encargado | registrar ingresos y retiros con motivo | justificar el efectivo | Should | El motivo es obligatorio; entra al esperado | ✅ |
| HU-06 | Encargado | contar el efectivo por billetes y monedas | detectar faltantes | Must | No se cierra sin arqueo; diferencia = contado − esperado | ✅ |
| HU-07 | Encargado | ver el Reporte Z | cerrar el día con un resumen contable | Must | Solo ventas de la sesión; IVA, IT, utilidad | ✅ |
| HU-08 | Encargado | contar ≈35 modelos sugeridos por día | mantener el inventario exacto sin contar 725 | Must | Lista: vendidos hoy + stock bajo + top + rotación; paginada; la barra no tapa nada | ✅ |
| HU-09 | Encargado | contar "a ciegas" | no copiar la cifra del sistema | Should | Oculta el stock del sistema | ✅ |
| HU-10 | Encargado | anular una venta con motivo | registrar devoluciones y defectos | Must | Revierte el kardex y la caja; queda trazado | ✅ |
| HU-11 | Encargado | recibir los pedidos del Gerente | reponer stock | Should | Suma al kardex y registra la fecha de recepción | ✅ |
| HU-12 | Gerente | ver un resumen con semáforo | saber en 10 s si el negocio va bien | Must | Ventas, exactitud, merma y reposición con colores | ✅ |
| HU-13 | Gerente | ver devoluciones, defectos y entregas | controlar calidad y logística (E4) | Must | Tasas por periodo y tienda, con el origen del dato | ✅ |
| HU-14 | Gerente | pedir reposición | evitar quiebres de stock | Should | El pedido llega al Encargado | ✅ |
| HU-15 | Gerente | explorar la base de mercado del Excel | entender la competencia importada | Must | Filtros de flujo, categoría, año y país; valor por par | ✅ |
| HU-16 | Gerente | exportar el Reporte Z y las ventas a Excel | llevarlo a contabilidad | Could | — | Pendiente |
| HU-17 | Vendedor | emitir factura con NIT | cumplir con el SIN | Could | — | Fuera de alcance |
| HU-18 | Gerente | segmentar clientes por compras | dirigir campañas | Could | Requiere registrar cliente en la venta | Pendiente |

## 4. Requisitos no funcionales

| ID | Atributo (ISO/IEC 25010) | Requisito | Cómo se verifica |
|---|---|---|---|
| RNF-01 | Rendimiento | Reconocimiento < 2 s en un celular medio; cada pantalla se dibuja en < 100 ms | Medido: 1–31 ms por vista con 725 modelos y ~5.400 ventas |
| RNF-02 | Disponibilidad | Funciona sin internet tras la primera visita | Servidor apagado: la app y la IA siguen funcionando |
| RNF-03 | Usabilidad | Lenguaje simple, guía en cada flujo, botones ≥ 44 px | QA en iPhone y 375 px |
| RNF-04 | Portabilidad | Android, iPhone y escritorio; instalable | Chrome, Safari iOS 17+ y Edge |
| RNF-05 | Exactitud contable | Sin errores de redondeo; IVA incluido en el precio | 17 pruebas unitarias |
| RNF-06 | Mantenibilidad | Dominio separado y probado; un módulo por función | `js/dominio.js` + `js/ui/*` |
| RNF-07 | Seguridad y privacidad | Las fotos no salen del celular; HTTPS | IA local; GitHub Pages con HTTPS |
| RNF-08 | Trazabilidad | Todo cambio de stock queda en el kardex | `verificarKardex()` = 0 errores |

## 5. Restricciones y supuestos
- **Supuesto**: los costos son simulados (52–62 % del precio según la línea), igual que las ventas históricas y el stock inicial.
- **Supuesto**: 3 tiendas de referencia (La Paz, Cochabamba y Santa Cruz).
- **Restricción**: sin servidor; los datos viven en cada dispositivo.
- **Restricción**: catálogo e imágenes públicas de bata.com.bo, de uso académico.
