# ShipNow API

API REST de **ShipNow** (plataforma de envíos) con arquitectura por capas **Controller → Service → Repository**, configuración de entorno validada, manejo centralizado de errores, logging con Winston, documentación Swagger, carga de archivos con Multer y tests funcionales.

**Autor / owner:** Ivan Passalia

## Contenido

1. [Correr el proyecto localmente](#1-correr-el-proyecto-localmente)
2. [Estructura del proyecto](#2-estructura-del-proyecto)
3. [Endpoints](#3-endpoints)
4. [Documentación de la API (Swagger)](#4-documentación-de-la-api-swagger--openapi)
5. [Carga de archivos (Multer)](#5-carga-de-archivos-documentos-y-comprobantes-multer)
6. [Mocking y datos de prueba](#6-mocking-y-datos-de-prueba-apimocks)
7. [Manejo de errores](#7-manejo-de-errores)
8. [Logging y monitoreo](#8-logging-y-monitoreo)
9. [Testing](#9-testing)
10. [Decisiones de diseño](#10-decisiones-de-diseño)

---

## 1. Correr el proyecto localmente

1. Requisitos: **Node.js 18+** y una instancia de **MongoDB** (local o Atlas).
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Crear el archivo de entorno a partir del ejemplo y completar los valores:
   ```bash
   cp .env.example .env        # en Windows: copy .env.example .env
   ```
   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/shipnow
   NODE_ENV=development
   ```
4. Iniciar:
   ```bash
   npm run dev     # desarrollo (con recarga automática)
   npm start       # normal
   ```
5. Abrir la documentación interactiva: http://localhost:3000/api/docs

### Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `PORT` | Sí | Puerto del servidor |
| `MONGODB_URI` | Sí | Cadena de conexión a MongoDB |
| `NODE_ENV` | Sí | `development`, `production` o `test` |
| `LOG_LEVEL` | No | Fuerza el nivel de log (`fatal`, `error`, `warning`, `info`, `http`, `debug`). Si se omite depende de `NODE_ENV` |
| `UPLOAD_DIR` | No | Carpeta donde se guardan los archivos subidos (por defecto `uploads`) |
| `UPLOAD_MAX_FILE_SIZE_MB` | No | Tamaño máximo por archivo en MB (por defecto `5`) |

Si falta una variable obligatoria, la app **no arranca** y muestra un error con las variables faltantes. `.env` no se sube al repositorio (usá `.env.example` como guía).

---

## 2. Estructura del proyecto

```
src/
├── app.js                 App de Express (sin listen: la importan los tests)
├── server.js              Levanta el servidor y conecta a MongoDB
├── config/                env.config.js (validación), index.js, db.config.js,
│                          logger.factory.js / logger.js (Winston),
│                          upload.rules.js (reglas de archivos) / upload.config.js (Multer)
├── constants/             USER_ROLES, ORDER_STATUS, DOCUMENT_TYPES... (Object.freeze)
├── controllers/           Solo req/res y status codes (errores: asyncHandler)
├── services/              Lógica de negocio (reciben sus dependencias por constructor)
├── repositories/          Único lugar que consulta Mongoose
├── storage/               LocalFileStorage: único lugar que escribe archivos en disco
├── models/                Solo esquemas (incluye file-metadata.schema.js)
├── routes/                Solo conectan path -> middleware/controller
├── middlewares/           error.middleware.js (único que responde errores), request-logger, not-found
├── errors/                Diccionario de errores, AppError, errores de dominio, normalizador
├── docs/                  Swagger/OpenAPI (spec + router de Swagger UI)
└── utils/                 validators, async.handler, mock.generator, log.format...
tests/
├── setup/                 env.js (fuerza NODE_ENV=test), db.hooks.js (base de datos de testing)
├── unit/                  Tests de lógica sin base de datos (repositories falsos)
└── functional/            Tests de endpoints con Supertest + Chai (base de datos real de testing)
logs/                      Logs generados (ignorados por Git, salvo .gitkeep)
uploads/                   Archivos subidos (ignorados por Git, salvo .gitkeep)
.env.example               Variables del entorno de desarrollo
.env.test                  Variables del entorno de testing (base descartable, sin credenciales)
```

---

## 3. Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET / POST | `/api/users` | Lista usuarios (sin password) / crear usuario |
| GET / PUT / DELETE | `/api/users/:id` | Detalle / actualizar / eliminar |
| POST | `/api/users/:id/documents` | **Subir un documento del usuario** (`multipart/form-data`) |
| GET / POST | `/api/products` | Lista productos (`?includeOutOfStock=true` incluye los sin stock) / crear |
| GET / PUT / DELETE | `/api/products/:id` | Detalle / actualizar / eliminar |
| GET / POST | `/api/orders` | Lista pedidos / crear pedido (`customer`, `items`, `shippingAddress`, `priority` opcional) |
| GET | `/api/orders/:id` | Detalle de pedido |
| PATCH | `/api/orders/:id/status` | Cambiar el estado (`{ "status": "CONFIRMED" }`) |
| GET / POST | `/api/deliveries` | Lista entregas / crear la entrega de un pedido |
| GET / PATCH | `/api/deliveries/:id` | Detalle / cambiar estado y/o asignar repartidor |
| POST | `/api/deliveries/:id/receipts` | **Subir un comprobante de la entrega** (`multipart/form-data`) |
| GET / POST / DELETE | `/api/mocks/...` | Mocking y datos de prueba (sección 6) |
| GET | `/api/logger/test` | Herramienta interna para probar el logger |
| GET | `/api/docs` | Swagger UI |

Los listados aceptan `?page=` y `?limit=` (máximo 100).

---

## 4. Documentación de la API (Swagger / OpenAPI)

Con el servidor corriendo:

- **Swagger UI:** http://localhost:3000/api/docs
- **Especificación OpenAPI 3.0.3 (JSON):** http://localhost:3000/api/docs/openapi.json (sirve para importarla en Postman)

### Cómo usarla

1. Abrí `/api/docs`. Los endpoints están agrupados por tag.
2. Desplegá un endpoint, apretá **Try it out**, completá parámetros o body (ya traen ejemplos) y **Execute**.
3. Debajo de cada endpoint ves la respuesta exitosa y todos los errores posibles, con su **código** real (`USER_NOT_FOUND`, `FILE_TOO_LARGE`, etc.) y un ejemplo.
4. Los endpoints de archivos aparecen como `multipart/form-data` con un selector de archivo.

### Módulos documentados (28 operaciones)

| Tag | Endpoints |
|---|---|
| **Users** | CRUD de usuarios y carga de documentos |
| **Products** | CRUD de productos |
| **Orders** | listar, crear, consultar y cambiar el estado de un pedido |
| **Deliveries** | listar, crear, consultar, cambiar estado / asignar repartidor y cargar comprobantes |
| **Mocks** | datos simulados (`GET`), carga de datos de prueba (`POST /seed`) y limpieza (`DELETE /seed`) |
| **Logger** | `GET /api/logger/test`: herramienta de validación, **no es funcionalidad de negocio** |

Schemas reutilizables: `User`, `Product`, `Order`, `OrderItem`, `Delivery`, `FileMetadata`, `ErrorResponse`, `SuccessResponse` y los de entrada (`UserCreate`, `OrderCreate`, `UserDocumentUpload`, etc.).

### Cómo está armada

La configuración de Swagger está **separada de las rutas de negocio** (`src/docs/`). Los enums salen de `src/constants` y los códigos, status y mensajes de error salen del diccionario `src/errors/error.dictionary.js`, así que la documentación no puede contradecir a la API. Además hay tests que verifican que las rutas documentadas son exactamente las que existen y que **cada error documentado tiene su test funcional** (sección 9).

### Aclaraciones para probar los endpoints

- **No hay autenticación**, por eso no se documentan errores 401/403.
- **Ids:** ObjectId de 24 caracteres hexadecimales. Otro formato responde `400 INVALID_ID`.
- **Flujo completo sugerido:**
  1. `POST /api/users` (cliente) y otro con `"role": "COURIER"` (repartidor). Guardá los `_id`.
  2. `POST /api/orders` con el `_id` del cliente como `customer`.
  3. `POST /api/deliveries` con el `_id` del pedido como `order`.
  4. `PATCH /api/deliveries/:id` con `{"status":"IN_TRANSIT","courier":"<id repartidor>"}` (sin repartidor responde `409 DELIVERY_COURIER_REQUIRED`).
  5. `POST /api/deliveries/:id/receipts` con un PDF o imagen.
  6. `PATCH /api/orders/:id/status` con `{"status":"DELIVERED"}`.
- **Atajo:** `POST /api/mocks/seed?qty=5&type=all` carga datos relacionados; `DELETE /api/mocks/seed` los elimina.
- Los `DELETE` exitosos responden `204` sin cuerpo.
- Si Swagger UI no te deja enviar un valor inválido (por ejemplo `qty=abc`), probalo en el navegador o con curl.

---

## 5. Carga de archivos: documentos y comprobantes (Multer)

### Endpoints

| Endpoint | Campo del archivo | Campos adicionales | Guarda en |
|---|---|---|---|
| `POST /api/users/:id/documents` | `document` | `documentType` (opcional, por defecto `OTHER`) | `uploads/licenses/` si es `DRIVER_LICENSE`; si no, `uploads/user-documents/` |
| `POST /api/deliveries/:id/receipts` | `receipt` | ninguno | `uploads/delivery-receipts/` |

- Formato de la petición: `multipart/form-data`.
- **Tipos de documento** (`documentType`): `ID_CARD`, `DRIVER_LICENSE`, `PROOF_OF_ADDRESS`, `OTHER`.
- **Tipos de archivo aceptados:** PDF, JPG y PNG.
- **Tamaño máximo:** 5 MB por archivo (configurable con `UPLOAD_MAX_FILE_SIZE_MB`).
- Responden `201` con la **entidad actualizada**: el usuario con su lista `documents`, o la entrega con su lista `receipts`. Una entrega o un usuario pueden tener varios archivos.

### Qué se guarda en la base (solo metadatos)

El archivo queda en el disco del servidor y en MongoDB **solo** se registra:

```json
{
  "_id": "6650a1f2c3d4e5f607182940",
  "originalName": "dni-frente.pdf",
  "storedName": "1731855000000-3f2b9c1e-7a4d-4e0b-9c55-1d2f8a6b7c90.pdf",
  "path": "user-documents/1731855000000-3f2b9c1e-7a4d-4e0b-9c55-1d2f8a6b7c90.pdf",
  "mimeType": "application/pdf",
  "size": 48213,
  "documentType": "ID_CARD",
  "uploadedAt": "2026-11-17T15:30:00.000Z"
}
```

`path` es relativo a la carpeta de uploads (no se expone la ruta real del servidor). Los comprobantes usan `documentType: "DELIVERY_RECEIPT"`.

### Configuración centralizada

Toda la configuración de Multer está en `src/config/` (los routers solo importan el middleware ya armado):

| Qué | Dónde |
|---|---|
| Dónde se guardan | `upload.rules.js` (`resolveFolder`) + `src/storage/local.file.storage.js` |
| Cómo se nombran | `upload.rules.js` (`generateStoredName`: timestamp + UUID + extensión) |
| Tipos aceptados | `constants` (`ALLOWED_FILE_TYPES`) + `fileFilter` en `upload.config.js` |
| Tamaño máximo | `env.config.js` (`UPLOAD_MAX_FILE_SIZE_MB`) → `limits` en `upload.config.js` |
| Errores de carga | `upload.rules.js` (`translateUploadError`) → errores del sistema centralizado |

### Validaciones y errores

Todos responden con el formato general de errores del proyecto (sección 7):

| Código | HTTP | Cuándo |
|---|---|---|
| `INVALID_ID` | 400 | El id no tiene formato de ObjectId |
| `USER_NOT_FOUND` / `DELIVERY_NOT_FOUND` | 404 | La entidad no existe (no se guarda el archivo) |
| `FILE_REQUIRED` | 400 | No se envió ningún archivo (o la petición no es multipart) |
| `UNEXPECTED_FILE_FIELD` | 400 | El archivo vino en otro campo (no `document`/`receipt`) o se enviaron varios |
| `DOCUMENT_TYPE_INVALID` | 400 | `documentType` fuera de los permitidos |
| `FILE_TYPE_INVALID` | 415 | El tipo no está permitido, **o el contenido no coincide con el tipo declarado** |
| `FILE_TOO_LARGE` | 413 | Supera el tamaño máximo |
| `FILE_SAVE_FAILED` | 500 | Falló la escritura en el servidor (no se registra ningún metadato) |

### Logging

- `info`: documento cargado, comprobante asociado a la entrega.
- `warning`: rechazos (tipo no permitido, archivo demasiado grande, etc.), registrados por el middleware de errores con su código; y el borrado de un archivo cuyos metadatos no se pudieron registrar.
- `error`: fallas al guardar en disco, con el stack.

### Cómo probarlo

**Con Swagger UI:** abrí `/api/docs`, entrá a `POST /api/users/{id}/documents`, **Try it out**, pegá el id de un usuario, elegí un archivo en `document`, elegí `documentType` y **Execute**.

**Con curl** (en PowerShell usá `curl.exe`):
```bash
# documento de usuario
curl -X POST http://localhost:3000/api/users/<ID_USUARIO>/documents \
  -F "document=@dni.pdf;type=application/pdf" -F "documentType=ID_CARD"

# comprobante de entrega
curl -X POST http://localhost:3000/api/deliveries/<ID_ENTREGA>/receipts \
  -F "receipt=@firma.png;type=image/png"
```

**Con Postman:** método `POST`, Body → `form-data`; el campo `document` (o `receipt`) de tipo **File** y, para usuarios, `documentType` de tipo Text.

### Decisiones de diseño

- **Multer con `memoryStorage`:** el archivo pasa por memoria y el Service **primero valida** (la entidad existe, el tipo de documento es válido, el contenido es real) y **recién después escribe** en disco. Así un pedido para un usuario inexistente nunca deja archivos huérfanos. El límite de tamaño mantiene acotado el uso de memoria.
- **El tipo se verifica por el contenido** (firma PDF/PNG/JPEG), no solo por el `Content-Type` que declara el cliente, que se puede falsificar.
- **El nombre original nunca se usa para guardar** el archivo (evita colisiones y path traversal); solo se registra, ya limpio, como metadato.
- **Si falla el registro en la base**, el archivo recién guardado se elimina.
- **Fuera de alcance:** descargar o borrar archivos, y limpiar los archivos al eliminar la entidad.

Los archivos subidos **no van al repositorio**: `uploads/*` está en el `.gitignore` (se conserva solo `uploads/.gitkeep`).

---

## 6. Mocking y datos de prueba (`/api/mocks`)

Genera usuarios, repartidores, pedidos y entregas simulados. Los `GET` **no guardan nada**; `POST /seed` inserta en MongoDB.

### Roles, estados y prioridades (`src/constants/index.js`)

| Constante | Valores |
|---|---|
| `USER_ROLES` | `ADMIN`, `USER` (cliente), `COURIER` (repartidor) |
| `ORDER_STATUS` | `PENDING`, `CONFIRMED`, `IN_TRANSIT`, `DELIVERED`, `CANCELLED` |
| `ORDER_PRIORITY` | `LOW`, `NORMAL`, `HIGH`, `URGENT` |
| `DELIVERY_STATUS` | `PENDING`, `IN_TRANSIT`, `DELIVERED`, `FAILED` |

### Datos simulados (no se guardan)

`qty` es opcional (por defecto 10, máximo 100).

| Endpoint | Devuelve |
|---|---|
| `GET /api/mocks/users?qty=2` | Clientes (rol `USER`) |
| `GET /api/mocks/couriers?qty=2` | Repartidores (rol `COURIER`) |
| `GET /api/mocks/orders?qty=2` | Pedidos con cliente, items, total, estado y prioridad |
| `GET /api/mocks/deliveries?qty=2` | Entregas asociadas a un pedido y, si corresponde, a un repartidor |
| `GET /api/mocks/dataset?qty=5` | Todo junto, con relaciones coherentes entre sí |

Los `GET` devuelven los datos directamente (un array), sin `status`/`payload`.

### Cargar datos de prueba en MongoDB

`POST /api/mocks/seed?qty=10&type=users` (**no recibe body**: `qty` y `type` van por query)

| `type` | Qué inserta |
|---|---|
| `users` (por defecto) | `qty` clientes |
| `couriers` | `qty` repartidores |
| `orders` | `qty` pedidos asociados a clientes que ya existen |
| `deliveries` | Entregas para pedidos sin entrega, con repartidores existentes |
| `all` | Todo el conjunto con las relaciones ya resueltas |

Respuesta de `POST /api/mocks/seed?qty=10`: `{ "insertados": 10, "coleccion": "usuarios" }`. Con `type=all` suma el total y agrega un `detalle` por colección. Si falta una dependencia (por ejemplo `type=orders` sin clientes) responde `409`.

Los usuarios de prueba se guardan con el password `Test1234` (hasheado) y el dominio `@test.com`. Todo lo generado queda marcado con `isMock: true`: `DELETE /api/mocks/seed` borra solo esos registros y no toca datos reales.

### Reglas de coherencia

- Cada pedido apunta a un usuario con rol `USER`; los repartidores son usuarios con rol `COURIER`.
- Pedidos `PENDING` o `CANCELLED` no tienen entrega. `CONFIRMED` genera una entrega `PENDING` sin repartidor. `IN_TRANSIT` y `DELIVERED` generan una entrega con repartidor, y `deliveredAt` solo si fue entregada.

---

## 7. Manejo de errores

Todos los errores pasan por una capa común:

- **Service**: detecta el problema y lanza un error de dominio (`UserNotFoundError`, `NegativeValueError`, `FileTooLargeError`...).
- **Controller**: no responde errores; `asyncHandler` deriva cualquier excepción al middleware.
- **Middleware global** (`error.middleware.js`): es el **único** lugar que arma la respuesta de error. También traduce errores externos (JSON roto, `CastError`, clave duplicada, caída de MongoDB) al mismo formato.
- **Diccionario** (`src/errors/error.dictionary.js`): define status HTTP y mensaje de cada código.

### Estructura de la respuesta de error

```json
{
  "status": "error",
  "code": "MOCK_QTY_NEGATIVE",
  "message": "qty no puede ser negativa",
  "details": [{ "field": "qty", "value": "-5" }],
  "path": "/api/mocks/users?qty=-5",
  "timestamp": "2026-11-17T15:30:00.000Z"
}
```

`details` es siempre un array. En errores 5xx el mensaje es genérico; fuera de producción se agrega la causa técnica en `details`.

### Códigos de error

| Código | HTTP | Cuándo |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Datos con formato inválido (`price: "abc"`, `page=0`) |
| `MISSING_FIELDS` | 400 | Faltan campos obligatorios |
| `INVALID_ID` | 400 | El id no tiene formato de ObjectId |
| `INVALID_JSON` | 400 | El body no es un JSON válido |
| `NEGATIVE_VALUE` | 400 | Precio o stock negativo |
| `INVALID_STATUS` / `INVALID_ROLE` / `INVALID_PRIORITY` | 400 | Valor fuera de las constantes |
| `USER_NOT_FOUND` / `PRODUCT_NOT_FOUND` / `ORDER_NOT_FOUND` / `DELIVERY_NOT_FOUND` | 404 | El recurso no existe |
| `ROUTE_NOT_FOUND` | 404 | La ruta no existe |
| `EMAIL_ALREADY_EXISTS` / `DUPLICATE_KEY` | 409 | Dato único repetido |
| `DELIVERY_ALREADY_EXISTS` | 409 | El pedido ya tiene una entrega |
| `DELIVERY_COURIER_REQUIRED` | 409 | `IN_TRANSIT` o `DELIVERED` sin repartidor asignado |
| `FILE_REQUIRED` / `UNEXPECTED_FILE_FIELD` / `DOCUMENT_TYPE_INVALID` | 400 | Errores de carga de archivos (sección 5) |
| `FILE_TYPE_INVALID` | 415 | Tipo de archivo no permitido |
| `FILE_TOO_LARGE` | 413 | Archivo demasiado grande |
| `FILE_SAVE_FAILED` | 500 | Falló el guardado del archivo |
| `MOCK_QTY_INVALID` / `MOCK_QTY_NEGATIVE` / `MOCK_QTY_OUT_OF_RANGE` | 400 | `qty` no entera o 0 / negativa / mayor a 100 |
| `MOCK_TYPE_INVALID` | 400 | `type` de seed inválido |
| `MOCK_DEPENDENCY_MISSING` | 409 | Falta sembrar datos previos |
| `MOCK_SEED_FAILED` | 500 | Falló la inserción en MongoDB (informa qué se alcanzó a insertar) |
| `DATABASE_ERROR` | 503 | MongoDB no disponible |
| `INTERNAL_ERROR` | 500 | Error inesperado |

### Cómo probar los casos inválidos

| Caso | Petición | Respuesta esperada |
|---|---|---|
| Usuario inexistente | `GET /api/users/aaaaaaaaaaaaaaaaaaaaaaaa` | 404 `USER_NOT_FOUND` |
| Id inválido | `GET /api/products/123` | 400 `INVALID_ID` |
| Ruta inexistente | `GET /api/cosas` | 404 `ROUTE_NOT_FOUND` |
| Faltan campos | `POST /api/products` con `{}` | 400 `MISSING_FIELDS` |
| Estado inválido | `PATCH /api/orders/:id/status` con `{"status":"VOLANDO"}` | 400 `INVALID_STATUS` |
| Email repetido | `POST /api/users` dos veces con el mismo email | 409 `EMAIL_ALREADY_EXISTS` |
| JSON roto | `POST /api/products` con body `{"name":` | 400 `INVALID_JSON` |
| Mock: qty inválida / negativa / excedida | `GET /api/mocks/users?qty=abc` / `-5` / `500` | 400 `MOCK_QTY_INVALID` / `MOCK_QTY_NEGATIVE` / `MOCK_QTY_OUT_OF_RANGE` |
| Mock: falta dependencia | `POST /api/mocks/seed?type=orders` con la base vacía | 409 `MOCK_DEPENDENCY_MISSING` |
| Archivo: falta | `POST /api/users/:id/documents` sin archivo | 400 `FILE_REQUIRED` |
| Archivo: tipo inválido | subir un `.txt` | 415 `FILE_TYPE_INVALID` |
| Archivo: demasiado grande | subir un archivo de más de 5 MB | 413 `FILE_TOO_LARGE` |

---

## 8. Logging y monitoreo

Se usa **Winston** (con `winston-daily-rotate-file`). Hay un único logger centralizado (`src/config/logger.js`) inyectado en services y middlewares; no hay `console.log` en el código.

Formato: `fecha hora [nivel] mensaje {metadata}`
```
2026-11-17 10:12:03 [info]    Servidor ShipNow escuchando en el puerto 3000 (development)
2026-11-17 10:12:03 [info]    Conexión a MongoDB establecida
2026-11-17 10:14:21 [warning] Usuario no encontrado {"code":"USER_NOT_FOUND","method":"GET","path":"/api/users/aaaa..."}
```

### Niveles

| Nivel | Se usa para |
|---|---|
| `fatal` | La app no puede seguir: configuración inválida, falla de conexión inicial, puerto ocupado |
| `error` | Errores inesperados (5xx): fallas de MongoDB, fallas al guardar archivos |
| `warning` | Errores esperados (4xx): recurso no encontrado, datos inválidos, archivo rechazado |
| `info` | Eventos importantes: servidor iniciado, entidades creadas, archivos cargados, seed de mocks |
| `http` | Cada petición HTTP: método, url, status y duración |
| `debug` | Detalle para desarrollo |

### Comportamiento según el entorno

| `NODE_ENV` | Nivel mínimo | Consola | Archivos |
|---|---|---|---|
| `development` | `debug` | Con colores | Sí |
| `production` | `info` | Sin colores | Sí |
| `test` | `fatal` | Silenciosa | No |

### Dónde se guardan

En `logs/` (se crea sola): `combined-AAAA-MM-DD.log` (todo lo que pasa el nivel activo) y `error-AAAA-MM-DD.log` (**solo `error` y `fatal`**). Rotación diaria o a los 20 MB; los archivos viejos se comprimen y se conservan 14 días. `logs/*` está en el `.gitignore`.

### Cómo probarlo

1. `npm run dev` y pedí `GET /api/logger/test`: emite un log por cada nivel.
2. Revisá `logs/combined-<fecha>.log` (todos los niveles) y `logs/error-<fecha>.log` (solo `error` y `fatal`).
3. Con `NODE_ENV=production` ya no aparecen `debug` ni `http`.

> `/api/logger/test` es una herramienta interna de verificación; en un sistema real conviene protegerla.

---

## 9. Testing

### Herramientas

| Herramienta | Para qué |
|---|---|
| **Mocha** | Organiza y ejecuta los tests |
| **Chai** | Aserciones sobre status, estructura y propiedades del body |
| **Supertest** | Peticiones HTTP a la app de Express, sin levantar el servidor a mano (`app.js` se importa directo; `server.js` es el único que hace `listen`) |

### Cómo ejecutar

```bash
npm install
npm test                  # unit + funcionales (necesita MongoDB)
npm run test:unit         # solo lógica, SIN base de datos
npm run test:functional   # solo endpoints, con base de datos de testing
```

### ¿Hace falta una base de datos de testing?

**Sí, para los tests funcionales.** Necesitás un MongoDB corriendo (por defecto `mongodb://localhost:27017`). Los tests usan una base **aparte** del desarrollo, `shipnow_test`, que se vacía antes de cada test y se **elimina al terminar**. Los tests unitarios no necesitan base.

**Protección:** si el nombre de la base o de la carpeta de uploads de testing no contiene `test`, los tests se niegan a correr. Así nunca se borran datos reales.

### Variables de entorno

Los tests leen `.env.test` (versionado: solo apunta a una base local, sin credenciales). `tests/setup/env.js` fuerza `NODE_ENV=test`, por lo que funciona igual en Windows, Linux y macOS.

| Variable | Valor en `.env.test` | Descripción |
|---|---|---|
| `PORT` | `3001` | No se usa (los tests no abren puerto) pero es obligatoria |
| `MONGODB_URI` | `mongodb://localhost:27017/shipnow_test` | Base de testing (debe contener `test`) |
| `NODE_ENV` | `test` | Entorno de testing |
| `UPLOAD_DIR` | `uploads-test` | Carpeta de archivos de testing (debe contener `test`) |
| `UPLOAD_MAX_FILE_SIZE_MB` | `1` | Límite chico para probar `FILE_TOO_LARGE` con poco peso |

**Usar otra base (por ejemplo Atlas):** no pongas credenciales en `.env.test`. Definí la variable en tu terminal antes de correr (tiene prioridad sobre el archivo); el nombre de la base debe contener `test`:
```powershell
# PowerShell
$env:MONGODB_URI="mongodb+srv://usuario:clave@cluster.mongodb.net/shipnow_test"; npm test
```
```bash
# bash
MONGODB_URI="mongodb+srv://usuario:clave@cluster.mongodb.net/shipnow_test" npm test
```

### Módulos cubiertos (`tests/functional/`, un archivo por recurso)

| Archivo | Cubre |
|---|---|
| `users.test.js` | Listar (vacío, estructura sin password, paginación), crear, consultar por id, actualizar, eliminar |
| `products.test.js` | CRUD, estado según stock, `includeOutOfStock`, validaciones |
| `orders.test.js` | Listar, **crear**, **consultar por id**, **actualizar estado** y sus validaciones |
| `deliveries.test.js` | Crear, listar, consultar, asignar repartidor y cambiar estado |
| `user-documents.test.js` | **Carga de documentos** (PDF/JPG/PNG, carpetas, metadatos, archivo en disco) y todos sus errores |
| `delivery-receipts.test.js` | **Carga de comprobantes** y todos sus errores |
| `mocks.test.js` | `GET` simulados (sin guardar), `POST /seed` (todos los `type`), `DELETE /seed` y errores de `qty` |
| `logger.test.js` | `GET /api/logger/test` y ruta inexistente |
| `docs.test.js` | Swagger UI, `openapi.json` y los endpoints de carga como `multipart/form-data` |
| `errors.test.js` | Ruta inexistente, JSON inválido, 500 y 503 (con el middleware aislado) |
| `swagger-coverage.test.js` | Coherencia: exige un test por cada error y endpoint documentado en Swagger |

`tests/unit/` cubre services, errores, logging, reglas de carga, almacenamiento en disco (carpeta temporal) y la spec de Swagger.

### Qué valida cada test

- **Éxito:** status HTTP, formato `{ status: "success", payload }`, estructura del body y valores importantes (por ejemplo total calculado, rol, rutas de archivos).
- **Error:** status HTTP **y** el formato de error completo (`status`, `code`, `message`, `details`, `path`, `timestamp`), comprobando además que el código existe en el diccionario con ese status.

### Datos de prueba y limpieza

- Los datos se **crean dentro de cada test por la API** (un usuario antes de un pedido, un pedido antes de una entrega, etc.) mediante factorías en `tests/functional/helpers/`. No hay datos cargados a mano ni archivos reales en el repo: los PDF/PNG de prueba se generan en memoria.
- **Limpieza:** el hook global `beforeEach` vacía todas las colecciones y la carpeta `uploads-test/` antes de **cada** test; `afterAll` elimina la base y los archivos. Por eso los tests no dependen del orden ni de lo que dejó otro, y la suite se puede correr dos veces seguidas sin borrar nada a mano.

### Coherencia con Swagger

`swagger-coverage.test.js` recorre la especificación y falla si algún error o endpoint documentado no tiene un test funcional. La única excepción es `MOCK_SEED_FAILED` (requiere que MongoDB falle a mitad de una inserción), que se prueba a nivel unitario con un repositorio que falla. `INTERNAL_ERROR` y `DATABASE_ERROR` se prueban en `errors.test.js` montando el middleware real en una app mínima.

---

## 10. Decisiones de diseño

### ¿Por qué separé la lógica entre Service y Repository?

- **Repository**: es el único que consulta Mongoose. No es un "pasamanos": encapsula proyecciones por defecto (nunca devuelve `password` ni `__v`), filtros por defecto (no lista productos `DISCONTINUED`), paginación, orden y `lean()`. Si cambia la base de datos, solo se toca esta capa.
- **Service**: contiene las reglas de negocio, que no dependen de cómo se guardan los datos: el estado del producto se calcula según el stock, se hashea el password, se validan roles, estados y archivos, se evitan emails duplicados.
- **Controller**: traduce HTTP ↔ Service (parsea query/params, elige el status code) y deriva los errores al middleware. Nunca importa Mongoose.

Los services reciben sus dependencias (repositories, logger, almacenamiento de archivos) por constructor. Por eso se prueban con repositories falsos en memoria, sin levantar MongoDB.
