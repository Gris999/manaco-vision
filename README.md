# Manaco Vision

Prototipo académico (caso de estudio **Manaco**, 6.º semestre de Ingeniería de Sistemas, Ciencia de Datos e Inteligencia de Negocios) que propone un **inventario inteligente con visión artificial** para las tiendas de calzado de Manaco (Bata Bolivia).

**Demo en vivo:** https://gris999.github.io/manaco-vision/

> Los datos de operación (stock, ventas y cierres) son **simulados** y se guardan solo en el navegador. Las fotos y precios del catálogo vienen de la tienda en línea pública de la empresa y se usan con fines académicos.

---

## 1. Problema que resuelve

- Manaco decide "a ojo": no sabe en tiempo real qué tiene, qué vende ni qué pierde.
- Ejemplo del docente: había 10 pares, se vendieron 2, deberían quedar 8, pero quedan 7. Ese faltante hoy nadie lo detecta.
- En el contexto externo, el calzado importado barato (sobre todo deportivo) presiona los precios.

## 2. Qué hace la app (6 vistas)

| Vista | Para quién | Función |
|---|---|---|
| **Escáner** | Vendedor | La cámara reconoce el modelo entre 725, muestra precio y stock por tienda, permite vender o reponer, y ofrece un top-3 tocable si la IA duda |
| **Inventario** | Almacén | 725 modelos con búsqueda, filtros (Dama, Hombre, Infantil, tipo, stock bajo) y stock por tienda |
| **Ventas** | Vendedor | Registro manual con buscador y resumen del día |
| **Cierre del día** | Encargado | Conteo físico contra lo esperado (inicio − ventas) y detección de faltantes en pares y Bs |
| **Resumen** | Gerencia | Dashboard en lenguaje simple: periodo (hoy, 7 o 30 días), filtro de tienda, semáforo, "¿qué hacer hoy?" con acciones, ranking, tiendas, categorías, ventas diarias contra el promedio y avance de metas SMART |
| **Mercado** | Gerencia | Explorador de los **230 registros** depurados de la base de comercio exterior (Excel del caso): filtros, frase-resumen, gráfico por año, socios, valor contra cantidad y tabla ordenable |

## 3. Arquitectura

```
index.html            Una sola página (HTML + Tailwind CDN + JS vanilla). Sin build.
catalogo.json         725 modelos: id, nombre, marca, categoría, sección, precio, imagen
mercado.json          230 registros: f(I/E), a(año), c(categoría), s(socio), v(USD), q(pares)
img/                  Miniatura por modelo (320 px)
mobilenet/            MobileNetV2 (TF.js GraphModel) servido localmente, inputRange [0,1]
modelo/               Cabeza clasificadora (Dense 512 → 726 clases) + clases.json
herramientas/         Scripts del pipeline (datos, entrenamiento, Word, PPT)
```

- **IA:** se extrae el embedding de MobileNetV2 (1280-d) y se clasifica con una red densa entrenada con transfer learning. Todo corre en el navegador del celular; no hay servidor.
- **Estado:** `localStorage` (clave `manacoVision_v5`). El botón "Reiniciar datos de demostración" regenera los datos simulados de 60 días.
- **Librerías (CDN, versiones fijas):** Tailwind 3.4.16, TensorFlow.js 4.22.0, @tensorflow-models/mobilenet 2.1.1, Chart.js 4.4.1 y Google Fonts (Poppins).

## 4. Pipeline de datos y modelo (`herramientas/`)

1. `analisis.py`: limpia el Excel (240 → 230 filas; agrega 10 claves duplicadas; no hay filas "Mundo"), calcula indicadores y genera los gráficos.
2. `catalogo_completo.py`: lee el catálogo público VTEX de bata.com.bo (834 productos). Se quedan los 725 calzados con 2 o más fotos (2.740 fotos).
3. `aumentar.py`: 30 variaciones por modelo (fondo, giro, escala, luz, desenfoque) más 400 imágenes de la clase "otro". Total ≈ 22.000.
4. `entrenar.js`: calcula los embeddings con tfjs-node, entrena la cabeza densa y guarda en caché los embeddings para reentrenar en ~1 minuto.

**Métricas (validación aleatoria 20 %, 4.430 imágenes no vistas):** top-1 **82,3 %** y top-3 **94,7 %** (`herramientas/metricas_validacion.json`).
El modelo publicado se reentrenó con el 100 % de los datos.

## 5. Sistema visual

Lo definí a partir de un análisis de Nike, Adidas, Puma, FairPlay y el sitio oficial de Manaco:

| Token | Valor | Origen |
|---|---|---|
| Marca | `#E40140` (hover `#C40036`) | Rojo oficial del sitio manaco.com.bo |
| Tinta | `#111111` | Patrón Nike (casi negro) |
| Gris de texto | `#575756` / `#707072` | Manaco / Nike |
| Superficie | `#F5F5F5` | Fondo de producto, patrón Nike |
| Línea | `#E5E5E5` | Bordes de tarjetas |
| Estados | ok `#007D48`, aviso `#B45309`, error `#B91C1C` | Semáforo del dashboard |
| Tipografía | Poppins 400–800 | Manaco usa Poppins + Arlon |
| Botones | Píldora (radio 999 px), mínimo 46 px de alto | Patrón Nike/Puma; objetivo táctil ≥ 44 px |

Principios: base neutra, **un solo color de marca** como acento (CTA principal y alertas), fotos de producto sobre gris claro, titulares pesados con tracking negativo.

## 6. QA realizado

- [x] Responsivo en 375 px (celular) y 1366 px (escritorio): sin scroll horizontal en las 6 vistas.
- [x] Navegación inferior en celular y lateral en escritorio; deep links por hash (`#dashboard`, `#mercado`…).
- [x] Accesibilidad: `lang="es"`, enlace "saltar al contenido", `aria-label` en botones de ícono, `aria-live` en resultados y avisos, `aria-pressed` y `aria-current`, foco visible, `prefers-reduced-motion`.
- [x] Seguridad: los nombres del catálogo externo se escapan (`esc()`) antes de insertarlos en el HTML.
- [x] Validaciones: no deja vender más que el stock, cantidades enteras ≥ 1, conteos ≥ 0.
- [x] Fechas en hora local (antes en UTC: desde las 20:00 en Bolivia las ventas caían en el día siguiente).
- [x] Errores manejados: cámara denegada o no soportada, falla al cargar la IA o el catálogo, `localStorage` lleno.
- [x] Rendimiento: imágenes con `loading="lazy"`, paginación ("Mostrar más"), búsqueda con debounce, la cámara se apaga al salir del escáner.

## 7. Limitaciones conocidas

- La IA confunde más el **mismo modelo en otro color** y los ángulos no vistos (por ejemplo, la suela). En producción se entrenaría con fotos tomadas en tienda y se usaría código de barras como respaldo.
- La categoría (Deportivo, Casual, Formal) se asigna por reglas sobre el nombre; es aproximada.
- La base de mercado es de **España**: es una referencia externa, no son ventas de Manaco.
- No hay backend: los datos no se comparten entre dispositivos.

## 8. Preguntas para un revisor

1. ¿Cómo mejorarías la jerarquía visual del dashboard para un gerente no técnico?
2. ¿Qué flujo de escáner reduciría más los errores en tienda (confirmación, código de barras, multi-foto)?
3. ¿Qué backend mínimo recomendarías para sincronizar las 3 tiendas (Supabase, Firebase…)?
4. ¿Qué otros KPI aportarían a la decisión "competir en cuero, no en precio"?
