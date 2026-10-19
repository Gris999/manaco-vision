# Auditoría senior — Manaco Vision (v10 → v11)

**Alcance:** código (`index.html`, ~1.030 líneas), lógica contable, KPIs, inventario, caja y arquitectura.
**Referencias:** Odoo 17+ (`point_of_sale/models/pos_session.py`, `stock/models/stock_move.py`, `stock/models/stock_quant.py`) y ERPNext (`POS Closing Entry`, `Stock Ledger Entry`, `Stock Reconciliation`).

---

## 1. Cómo lo resuelven los sistemas de referencia

| Concepto | Odoo | ERPNext | Manaco Vision v10 |
|---|---|---|---|
| Sesión de caja | `pos.session` con estados `opening_control → opened → closing_control → closed`; no depende de la fecha | `POS Opening Entry` / `POS Closing Entry` | Atada a la **fecha** (`hoy()+tienda`) → **se pierde a medianoche** ❌ |
| Movimientos de efectivo | `try_cash_in_out()` (ingresos y retiros con motivo) y se incluyen en el esperado | Payment reconciliation | **No existen**: un gasto o retiro descuadra la caja ❌ |
| Inventario | Cada cambio es un `stock.move` (origen → destino, estado) y el saldo sale de los movimientos | **Stock Ledger Entry**: `actual_qty`, `qty_after_transaction`, `voucher_type/no` | El stock se **sobrescribe** sin historial: no hay kardex ni trazabilidad ❌ |
| Ajuste por conteo | `stock.quant.inventory_quantity` → `inventory_diff_quantity` → `action_apply_inventory` (genera un move) | `Stock Reconciliation` (borra filas sin cambio y crea entradas en el ledger) | Cambia el stock directo; la diferencia no queda como movimiento ❌ |
| Impuestos | `net_total`, `taxes` y `grand_total` separados | `net_total`, `total_taxes_and_charges` y `grand_total` | **Todo con IVA**: la ganancia se calcula sobre el precio con impuestos ❌ |
| Valoración | Costo (`valuation_rate`, `stock_value_difference`) | Costo | Faltantes valorados a **precio de venta** ❌ |

---

## 2. Hallazgos

### A. Contabilidad (los más graves)
| # | Severidad | Hallazgo | Por qué está mal | Corrección |
|---|---|---|---|---|
| A1 | **Crítica** | La "ganancia bruta" se calcula sobre el precio **con IVA** | En Bolivia el precio al público incluye **IVA 13 %** (débito fiscal, no es ingreso de la empresa) y la venta paga **IT 3 %**. Se infla la utilidad unos 13 puntos | Venta bruta → IVA 13 % → **venta neta** → costo → **utilidad bruta** → IT 3 % → **margen de contribución** |
| A2 | Alta | Faltantes valorados a **precio de venta** | Una merma es una pérdida de **activo** y se valora a costo (igual que `stock_value_difference`) | Merma a costo |
| A3 | Alta | "Ticket por par" es en realidad el **precio promedio por par** | El ticket promedio es facturación ÷ nº de ventas (transacciones) | Dos KPIs separados y bien nombrados |
| A4 | Alta | Caja sin **ingresos ni retiros de efectivo** | Si se paga un taxi o se deposita al banco, el arqueo da faltante falso | Movimientos de caja con motivo (como `try_cash_in_out`) incluidos en el esperado |
| A5 | Media | Ventas sin **número correlativo** | No hay trazabilidad venta ↔ Reporte Z | N° de venta por tienda; el Reporte Z muestra el rango |
| A6 | Media | Montos con **coma flotante** (181,30 + 181,30…) | Errores de centavos acumulados | Cálculo en **centavos enteros** |

### B. KPIs
| # | Severidad | Hallazgo | Corrección |
|---|---|---|---|
| B1 | **Alta** | "Últimos 30 días" sumaba **31 días** (desde `hoy−30` hasta hoy) y se comparaba con 30 → la tendencia sale sesgada | Ventana de N días exactos (incluye hoy) contra los N días anteriores |
| B2 | Alta | Periodo **"Hoy"**: compara un día a medias contra ayer completo → siempre da "▼" | En "Hoy" no se muestra tendencia engañosa |
| B3 | Alta | Exactitud y faltantes usaban `max(periodo, 3 días)`: en "Hoy" mostraban 3 días | Usar el mismo periodo que el resto |
| B4 | Media | Meta "Faltantes" con fórmula arbitraria (`100 − v×4`) y "Participación del cuero" sin línea base | Metas con valor actual, meta y regla explícita |
| B5 | Media | Faltaba **cobertura de inventario** (días de stock) para decidir reposición | Cobertura = stock ÷ venta diaria promedio |

### C. Inventario
| # | Severidad | Hallazgo | Corrección |
|---|---|---|---|
| C1 | **Crítica** | No hay **kardex / libro de movimientos**: no se sabe por qué cambió un stock | Libro de movimientos (venta, reposición, ajuste por conteo, saldo inicial) con saldo después de cada uno; el stock solo cambia por `moverStock()` |
| C2 | Alta | El ajuste del conteo no genera movimiento | Ajuste = movimiento tipo "ajuste" con la diferencia |
| C3 | Media | Umbral de stock bajo fijo (5) para todo | Se agrega la cobertura en días; queda como recomendación usar un punto de reorden por modelo |

### D. Código y arquitectura
| # | Severidad | Hallazgo | Corrección |
|---|---|---|---|
| D1 | **Alta** | Lógica de negocio mezclada con la vista dentro de un solo `index.html`; **cero pruebas** | Módulo `js/dominio.js` con funciones **puras** (contabilidad, KPIs, caja, kardex) y **pruebas unitarias** (`node --test`) |
| D2 | Alta | La sesión de caja depende de la fecha → abierta a las 23:50, desaparece a las 00:00 | Sesión activa por tienda, independiente de la fecha |
| D3 | Media | Cambiar el esquema de datos **borraba todo** (cambio de `KEY`) | Versión de esquema + migración (crea el saldo inicial en el kardex) |
| D4 | Media | Handlers `onclick` en texto: frágil y no permite CSP | Documentado como deuda técnica (requiere framework o delegación de eventos completa) |
| D5 | Baja | Se reescribe todo el `localStorage` (~1,8 MB) en cada acción | Aceptable para un prototipo; en producción, backend o IndexedDB |

---

## 3. Qué queda fuera (deuda técnica documentada)
- **Backend y multiusuario** (hoy cada celular tiene sus datos). Recomendado: API + PostgreSQL, como en el proyecto faith-style del autor.
- Login por rol, devoluciones y notas de crédito, descuentos, transferencias entre tiendas, compras a proveedor con costo real (promedio ponderado o FIFO).
- Facturación electrónica SIN (Bolivia).
