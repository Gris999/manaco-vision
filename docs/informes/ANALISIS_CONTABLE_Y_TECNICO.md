# Manaco Vision — Análisis contable, flujos, datos y herramientas (v19)

---

## 1. Cómo se leen los gráficos del Resumen (Gerente)

| Bloque | Qué mide | Cómo se lee | ¿Está bien contablemente? |
|---|---|---|---|
| **Bloque rojo (hero)** | Facturación **con IVA**, pares vendidos, variación contra el periodo anterior, utilidad bruta y margen, ticket promedio y precio promedio por par | "En 30 días completos se facturaron Bs X". La flecha compara con los 30 días anteriores del **mismo largo** | ✅ Ventanas exactas de días completos (sin el día en curso). Utilidad sobre **venta neta** (sin IVA) |
| **Semáforo: Ventas** | Variación de la facturación | Verde ≥ 0 %, ámbar hasta −10 %, rojo peor | ✅ |
| **Semáforo: ¿El inventario cuadra?** | Exactitud de inventario (IRA) = modelos contados que coinciden ÷ modelos contados | 99 % = de cada 100 conteos, 99 coinciden. Meta: 98 % | ✅ Indicador estándar de auditoría de inventarios |
| **Semáforo: Merma** | Pares faltantes en los conteos, **valorizados a costo**, y su % sobre la venta neta | Meta ≤ 0,5 % (referencia de retail) | ✅ La merma es pérdida de activo, por eso va a costo y no a precio de venta |
| **Semáforo: Por reponer** | Modelos con menos de 5 pares en alguna tienda y cobertura (días de stock) | Cobertura = stock ÷ venta diaria promedio | ✅ Umbral fijo (mejorable con punto de reorden por modelo) |
| **¿Qué hacer hoy?** | Acciones derivadas de los datos | Pedir reposición, avisar faltantes, asegurar el más vendido | ✅ |
| **Los más vendidos** | Pares por modelo y su facturación (Bs con IVA) | Ranking por unidades | ✅ Ahora aclara "con IVA" |
| **¿Qué tienda vende más?** | Facturación por tienda (Bs con IVA) y % del total | Barras comparativas | ✅ Ahora aclara "con IVA" |
| **¿Qué tipo de zapato se vende más?** | Parte de la **facturación** por tipo | La dona muestra el % de ingresos | ⚠️→✅ **Corregido**: antes decía "¿deja más dinero?", pero mide facturación, no ganancia |
| **¿Cuánto ganamos? (utilidad bruta)** | Venta neta, utilidad bruta, margen e inventario a costo, más la cascada "¿Cómo se calcula?" | Bruto − IVA 13 % = neto; − costo = **utilidad bruta**; − IT 3 % = margen de contribución | ⚠️→✅ **Corregido**: ahora aclara que es **antes** de sueldos, alquiler y gastos (no es la ganancia final) |
| **Cajas de las tiendas** | Estado de hoy y arqueos del periodo | Cuántos arqueos cuadraron | ⚠️→✅ **Corregido**: los faltantes y sobrantes ahora van **por separado**; sumarlos ocultaba faltantes |
| **Ventas día a día** | Facturación diaria contra el promedio | Rojo = día sobre el promedio | ✅ Sin el día en curso; aclara "con IVA" |
| **Metas** | Exactitud (meta 98 %), participación de casual + formal (no deportivo) y merma sobre la venta neta (≤ 0,5 %) | Barra = avance hacia la meta | ✅ Etiqueta aclarada ("casual y formal") |
| **Mercado** | Comercio exterior de España: valor CIF/FOB en USD y pares | "Valor por par" = valor de aduana ÷ pares | ✅ No es el precio al consumidor (sin aranceles, flete ni margen) |

### Notas del contador
- **IVA**: se muestra solo el **débito fiscal** (13 % de las ventas). El IVA a pagar = débito − **crédito fiscal** (13 % de las compras con factura). Como no hay módulo de compras, no se puede calcular el IVA a pagar.
- **IT 3 %**: se calcula sobre la venta bruta, como gasto.
- **Costos simulados** (≈ 52 % del precio en formal, 58 % en casual y 62 % en deportivo). En un sistema real: costo promedio ponderado o FIFO, según las compras.
- **Ticket promedio**: cada venta es de un solo modelo (no hay carrito), así que el ticket es cercano al precio por línea.
- **Categorías**: se asignan por reglas sobre el nombre del producto; algunas "casuales" pueden no ser de cuero. Esto es aproximado.

---

## 2. Revisión de flujos

### Vendedor (venta)
| Paso | Estado |
|---|---|
| Caja abierta obligatoria antes de vender | ✅ |
| Reconocer el modelo con IA (con top-3 si duda) o buscarlo por nombre | ✅ |
| Validar stock suficiente; bloquear el doble toque | ✅ |
| Método de pago: efectivo, QR o tarjeta | ✅ |
| N° de venta correlativo por tienda | ✅ |
| Movimiento en el kardex (salida) | ✅ |
| **Anulación / devolución** con reverso de stock | ✅ **Nuevo** (la hace el Encargado desde Caja, con motivo) |
| Factura / NIT del cliente (SIN) | ❌ Pendiente (facturación electrónica) |
| Descuentos y promociones | ❌ Pendiente |
| Cálculo de vuelto (recibido − total) | ❌ Pendiente |
| Venta de varios modelos en un solo ticket (carrito) | ❌ Pendiente |
| N° de operación de QR o tarjeta para conciliar | ❌ Pendiente |

### Encargado (caja e inventario)
| Paso | Estado |
|---|---|
| Apertura de caja con fondo | ✅ |
| Ingresos y retiros de efectivo con motivo | ✅ |
| Anular ventas de la sesión (motivo, reverso en kardex y caja) | ✅ **Nuevo** |
| Conteo cíclico del día (~35 modelos) | ✅ |
| **Conteo ciego** (no ve el sistema, para no contar de memoria) | ✅ **Nuevo** |
| Ajuste por conteo en el kardex y merma a costo | ✅ |
| Arqueo por denominaciones; no se puede cerrar sin arqueo | ✅ |
| Reporte Z con estado de resultados | ✅ |
| Recibir pedidos de reposición del Gerente | ✅ |
| Recepción de mercadería con proveedor, guía y costo | ❌ Pendiente |
| Transferencias entre tiendas | ❌ Pendiente |
| Motivo por cada diferencia de conteo (robo, daño, error) | ❌ Pendiente |
| Conciliación de QR y tarjeta contra el extracto bancario | ❌ Pendiente |

### Gerente (control y decisión)
| Paso | Estado |
|---|---|
| Resumen por periodo y tienda, semáforo, metas y acciones | ✅ |
| Pedir reposición y avisar faltantes | ✅ |
| Kardex por modelo en las 3 tiendas | ✅ |
| Mercado (Excel del caso) | ✅ |
| Aprobación de ajustes grandes de inventario y de anulaciones | ❌ Pendiente |
| Historial de Reportes Z y exportar a Excel o PDF | ❌ Pendiente (el Z se imprime o se guarda en PDF) |
| Estado de resultados completo (con gastos operativos) y libro de ventas IVA | ❌ Pendiente |
| Presupuesto contra real | ❌ Pendiente |

---

## 3. ¿Dónde se guardan los datos? ¿Qué base de datos usa?

**No hay servidor ni base de datos externa.** Es un prototipo *offline-first* (una PWA):

| Dato | Dónde vive | Formato |
|---|---|---|
| Stock, ventas, kardex, cajas, conteos, pedidos | **`localStorage` del navegador** de cada celular, clave `manacoVision_v6` (esquema versión 7) | Un objeto JSON (~1,8 MB) con `stock`, `ventas`, `movs` (kardex), `cajas`, `sesionActiva`, `cierres`, `conteos`, `pedidos`, `nroVenta` |
| Rol elegido | `localStorage`, clave `mv_rol` | Texto |
| Catálogo (725 modelos) | `app/catalogo.json` | JSON estático |
| Base de mercado (Excel depurado) | `app/mercado.json` | JSON estático (230 filas) |
| IA (MobileNetV2 + clasificador) | `app/mobilenet/` y `app/modelo/` | TensorFlow.js |
| Copia sin internet | **Cache Storage** del service worker (`sw.js`) | Archivos |
| Fotos de entrenamiento | `dataset/originales` (2.738) y `dataset/aumentado` (22.150), solo en la Mac | JPG |

**Implicancias:** cada celular tiene sus propios datos (no se sincronizan entre tiendas) y, si se borran los datos del navegador, se pierden. **Para producción** se recomienda una API (FastAPI) con **PostgreSQL**, como el proyecto faith-style del autor. Las reglas de `js/dominio.js` se reutilizan tal cual.

---

## 4. Herramientas usadas y para qué

### La app (lo que corre en el celular)
| Herramienta | Para qué |
|---|---|
| **HTML + JavaScript** (sin framework) | Interfaz y lógica de las 7 pantallas |
| **Tailwind CSS 3.4.16** | Estilos y diseño responsivo |
| **TensorFlow.js 4.22 + MobileNetV2** | IA que reconoce el zapato en el propio celular |
| **Chart.js 4.4.1** | Gráficos del Resumen y de Mercado |
| **Poppins** (Google Fonts, guardada localmente) | Tipografía de la marca |
| **Service Worker + Web App Manifest** | App instalable que funciona sin internet |
| **localStorage** | Base de datos local (ver punto 3) |
| **`js/dominio.js`** | Reglas contables y de inventario puras (IVA, IT, kardex, caja, KPIs) |

### Datos e IA (en la Mac)
| Herramienta | Para qué |
|---|---|
| **whisper-cli + ffmpeg** | Transcribir los 3 audios del docente |
| **Python: pandas, openpyxl** | Leer y depurar el Excel (240 → 230 filas) |
| **Python: matplotlib** | Gráficos del análisis (Word y diapositivas) |
| **Python: Pillow** | Generar las 22.000 imágenes de entrenamiento, los íconos y la imagen para compartir |
| **Python: qrcode** | QR de la app en las diapositivas |
| **API pública VTEX de bata.com.bo** | Descargar el catálogo real (725 modelos y fotos) |
| **Node.js + @tensorflow/tfjs-node** | Entrenar el clasificador (82 % top-1 y 95 % top-3 en validación) |
| **node:test** | 15 pruebas unitarias de la contabilidad (`npm test`) |

### Documentos
| Herramienta | Para qué |
|---|---|
| **docx (Node)** | Generar el Word del proyecto |
| **pptxgenjs (Node)** | Generar las 7 diapositivas |
| **Pages y Keynote** (vía AppleScript) | Exportar a PDF y revisar visualmente |

### Publicación y QA
| Herramienta | Para qué |
|---|---|
| **Git + GitHub + GitHub CLI (`gh`)** | Repositorio `Gris999/manaco-vision` e historial de versiones |
| **GitHub Pages** | Publicar la app con HTTPS (necesario para la cámara) |
| **Navegador integrado (Chromium)** | QA en tamaños de celular y escritorio |
| **Simulador de iPhone 17 (Xcode)** | QA en Safari real de iOS |
| **Visual Studio Code** | Ver y editar el código |
| **Engram + PROGRESO.md** | Memoria del proyecto entre sesiones |

### Referencias consultadas (código abierto)
- **Odoo** (`point_of_sale/models/pos_session.py`, `stock/models/stock_move.py`, `stock_quant.py`): sesiones de caja, *cash in/out* y movimientos de stock.
- **ERPNext** (`POS Closing Entry`, `Stock Ledger Entry`, `Stock Reconciliation`): cierre de caja, kardex y conciliación de inventario.
- Sitios de **Nike, Adidas, Puma, FairPlay y Manaco**: análisis de identidad visual.
