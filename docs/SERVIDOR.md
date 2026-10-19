# Servidor y base de datos

## ¿Dónde está la base de datos?

| Qué | Dónde |
|---|---|
| **Archivo de la base de datos (SQLite)** | `app/server/datos/manaco.db` en la Mac (más `manaco.db-wal` y `manaco.db-shm`, que son el diario de escritura de SQLite) |
| Motor | SQLite, integrado en Node 22 (`node:sqlite`); no requiere instalar un servidor de base de datos |
| ¿Se sube a GitHub? | **No**: está en `.gitignore` porque contiene datos y contraseñas cifradas |
| Copia en cada celular | IndexedDB del navegador, base `manacoVision` (estado, borradores y cola sin enviar) |

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
