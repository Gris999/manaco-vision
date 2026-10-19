# Metodología

## 1. Enfoque elegido: iterativo e incremental (Scrum adaptado + CRISP-DM)

El proyecto combina dos marcos, porque tiene dos naturalezas:

| Parte | Marco | Por qué |
|---|---|---|
| **Análisis de datos** (Excel del caso, Estaciones 1 y 2) | **CRISP-DM**: comprensión del negocio → comprensión de los datos → preparación → modelado → evaluación → despliegue | Es el estándar para proyectos de ciencia de datos y calza con lo que pide el caso: limpieza, indicadores, gráficos e interpretación |
| **Construcción del sistema** (app Manaco Vision, Estaciones 3 y 4) | **Scrum adaptado** a un equipo de 2: iteraciones cortas (*time-box* de 1 a 2 horas), un incremento usable al final de cada una y revisión con el "cliente" (el docente o el equipo) | Los requisitos cambiaron durante el proyecto (roles, caja, conteo cíclico); un modelo en cascada no lo habría absorbido |

El **producto mínimo viable (MVP)** se definió primero: reconocer un zapato con la cámara y ver su stock en las 3 tiendas. Todo lo demás se agregó por incrementos priorizados según su valor para el caso.

### Roles Scrum en el equipo
| Rol | Quién | Responsabilidad |
|---|---|---|
| Product Owner | Pedro Alaca | Prioriza el backlog según la rúbrica del docente (presentación, entendimiento, propuesta, defensa) |
| Scrum Master / QA | Rodrigo Viveros | Revisa cada incremento contra la Definición de Terminado; registra hallazgos |
| Equipo de desarrollo | Ambos (con asistencia de IA para código y documentación) | Construye, prueba y documenta |

## 2. Iteraciones realizadas (historial real, ver `git log`)

| Sprint | Objetivo (incremento) | Resultado verificable |
|---|---|---|
| 0 | Comprensión: audios del docente, caso y Excel | Problemas priorizados (E1), tabla depurada 240 → 230 filas (E2) |
| 1 | MVP: cámara + IA + stock | Prototipo con 10 modelos, publicado en GitHub Pages |
| 2 | Experiencia de uso | Diseño responsivo, navegación móvil, dashboard en lenguaje simple |
| 3 | Escalar datos | Catálogo completo (725 modelos), IA reentrenada (82 % top-1, 95 % top-3), sección Mercado |
| 4 | Identidad de marca | Benchmark Nike/Adidas/Puma/FairPlay → paleta Manaco #E40140 + Poppins |
| 5 | App instalable | PWA: manifest, service worker, funciona sin internet |
| 6 | Separación de funciones | Roles Vendedor / Encargado / Gerente |
| 7 | Operación de tienda | Caja tipo POS: apertura, pagos, arqueo, Reporte Z |
| 8 | Calidad | QA (12 hallazgos), auditoría senior: módulo de dominio con pruebas, kardex |
| 9 | Dispositivo real | Pruebas en iPhone 17 (Safari) y correcciones iOS |
| 10 | Usabilidad | Guía de uso, modo prueba de cámara, pantallas menos cargadas |
| 11 | Realismo operativo | Conteo cíclico (≈35 modelos por día, no 725) |
| 12 | Revisión contable | Anulaciones con reverso, conteo ciego, faltantes y sobrantes separados |
| 13 | Ingeniería y cierre del caso | Código modular, documentación formal, indicadores de la Estación 4 |

## 3. Procedimientos de trabajo

### Flujo de cada iteración
1. **Planificar**: elegir historias del backlog ([REQUISITOS.md](REQUISITOS.md)) y escribir el objetivo.
2. **Construir**: primero la regla de negocio en `js/dominio.js` con su prueba; después la pantalla.
3. **Probar**: `npm test` + pruebas en el navegador (375 px y 1366 px) + iPhone simulado ([PLAN_DE_PRUEBAS.md](PLAN_DE_PRUEBAS.md)).
4. **Revisar**: QA contra la Definición de Terminado; los hallazgos van al informe de la iteración (`docs/informes/`).
5. **Publicar**: subir `VERSION` en `sw.js`, *commit* y *push* (GitHub Pages despliega solo).
6. **Registrar**: decisiones y estado en `PROGRESO.md`.

### Definición de Terminado (DoD)
Una historia está terminada solo si:
- [ ] Cumple sus criterios de aceptación.
- [ ] Toda regla de dinero o stock está en `dominio.js` y tiene prueba unitaria; `npm test` pasa.
- [ ] Todo cambio de stock pasa por `moverStock` (queda en el kardex) y `verificarKardex` no da errores.
- [ ] Sin errores de consola ni desborde horizontal en 375 px y 1366 px, con los 3 roles.
- [ ] Probado en Safari de iPhone si toca cámara, fotos o instalación.
- [ ] Textos en lenguaje simple; los datos simulados están rotulados como tales.
- [ ] `VERSION` del service worker actualizada y publicada.

### Convenciones de código
- Dinero en **centavos enteros** internamente (sin errores de coma flotante).
- Fechas `AAAA-MM-DD` en hora local de la tienda.
- Precio al público **incluye IVA** (Bolivia).
- Nombres en español, consistentes con el negocio (venta, arqueo, kardex, merma).
- *Commits* en español, en imperativo y describiendo el incremento.

## 4. Gestión de riesgos del proyecto
| Riesgo | Mitigación aplicada |
|---|---|
| Sin fotos propias de los zapatos | Catálogo público de bata.com.bo + aumento de datos (22.150 imágenes) |
| Sin zapatos físicos para probar la cámara | Modo prueba con fotos del catálogo y pantalla `?muestra` |
| Requisitos cambiantes | Iteraciones cortas y backlog repriorizado en cada revisión |
| Errores contables | Módulo de dominio aislado, con pruebas y revisado contra Odoo y ERPNext |
| Pérdida de contexto entre sesiones | `PROGRESO.md` como bitácora y control de versiones con Git |
