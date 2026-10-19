# Servidor y base de datos

## ¿Dónde está la base de datos?

| Entorno | Dónde | Motor |
|---|---|---|
| **Producción (en internet)** | **Render**: servicio `manaco-vision-db` en el panel de Render (dashboard.render.com → manaco-vision-db). La API está en **https://manaco-vision-api.onrender.com** | **PostgreSQL** (columna `estado` y `datos` en JSONB) |
| Desarrollo / respaldo en la Mac | `app/server/datos/manaco.db` | SQLite (`node:sqlite`) |
| Copia en cada celular | IndexedDB del navegador, base `manacoVision` (estado, borradores y cola sin enviar) | IndexedDB |

El servidor elige el motor solo: si existe la variable `DATABASE_URL` usa PostgreSQL; si no, SQLite (`server/almacen.js`, patrón *Repository*). Ninguna base se sube a GitHub.

**Ver la base de Render**: en el panel → `manaco-vision-db` → *Connect* → copiar el *External Database URL* y abrirlo con `psql` o con la extensión *PostgreSQL* de VS Code. Desde la app, el Gerente ve la auditoría en `GET /api/acciones`.

### Tablas
| Tabla | Contenido |
|---|---|
| `usuarios` | usuario, nombre, rol, tienda, **sal + hash scrypt** de la contraseña (nunca la contraseña en texto) |
| `acciones` | **Registro de auditoría**: cada operación aceptada (quién, qué, tienda, fecha, hora, datos) |
| `rechazos` | Operaciones que el servidor rechazó y por qué (permiso, stock, etc.) |
| `instantanea` | Estado actual del negocio (stock, ventas, cajas, conteos, pedidos, kardex) y su número de versión `rev` |
| `config` | Clave secreta con la que se firman los tokens de sesión |

### Cómo verla
- **Terminal**: `sqlite3 -readonly app/server/datos/manaco.db "SELECT seq, tipo, usuario, tienda, hora FROM acciones;"`
- **VS Code**: instalar la extensión *SQLite Viewer* y abrir `manaco.db`.
- **Desde la app**: un usuario Gerente puede consultar `GET /api/acciones` (auditoría).

## ¿Cómo está publicado?

### Opción principal: Render (no depende de la Mac)
```
Celular (https://gris999.github.io/manaco-vision)
        │  HTTPS + token
        ▼
https://manaco-vision-api.onrender.com  (Node 22, servicio web gratis)
        │
        ▼
PostgreSQL de Render (manaco-vision-db)
```
- Se despliega solo con cada `git push` a `main` (Blueprint `render.yaml`).
- Varias instancias a la vez (por ejemplo, durante un despliegue) no se pisan: **concurrencia optimista** con `rev` y `SELECT … FOR UPDATE` (`tests/concurrencia.test.js`).
- Plan gratis: se duerme tras 15 min sin uso (la primera petición tarda ~50 s) y la base gratis dura 30 días.

### Opción de respaldo: túnel ngrok a la Mac

```
Celular (https://gris999.github.io/manaco-vision)
        │  HTTPS + token
        ▼
https://copartner-compactly-dubbed.ngrok-free.dev   ← túnel ngrok (cuenta del equipo)
        │
        ▼
Mac: node server/servidor.js (puerto 8787) ──▶ app/server/datos/manaco.db
```

- **Encender**: `npm run publico` (en la carpeta `app`). Levanta el servidor y el túnel con el dominio fijo.
- **Requisito**: la Mac encendida y con internet. Si se apaga, los celulares siguen funcionando y guardan las operaciones en cola; se envían solas al volver el servidor.
- **Alternativa en la nube** (sin depender de la Mac): `render.yaml` permite desplegar en Render con una cuenta del equipo.
- **Usuarios de demostración**: `server/usuarios.semilla.json`. Cambiar las claves si el servidor queda público mucho tiempo.
