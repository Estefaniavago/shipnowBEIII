# ShipNow API

API REST de ShipNow con arquitectura por capas **Controller → Service → Repository** y configuración de entorno validada.

## Correr el proyecto localmente

1. Requisitos: Node.js 18+ y una instancia de MongoDB (local o Atlas).
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Crear el archivo de entorno a partir del ejemplo y completar los valores:
   ```bash
   cp .env.example .env
   ```
   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/shipnow
   NODE_ENV=development
   # LOG_LEVEL=   (opcional, ver sección Logging)
   ```
4. Iniciar:
   ```bash
   npm run dev     # desarrollo (watch)
   npm start       # normal
   ```
5. Correr los tests (no necesitan base de datos):
   ```bash
   npm test
   ```

Si falta `PORT`, `MONGODB_URI` o `NODE_ENV`, la app **no arranca** y muestra un error con las variables faltantes.

## Testing funcional (Módulo 6)

La suite funcional usa **Mocha** para organizar/ejecutar, **Chai** para aserciones y **Supertest** para realizar peticiones HTTP contra la aplicación Express sin abrir un puerto manualmente.

### Preparar el entorno de testing

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Copiar `.env.test.example` como `.env.test` y verificar que `MONGODB_URI` apunte a una base exclusiva para pruebas (por defecto `shipnow_test`):
   ```env
   PORT=3001
   MONGODB_URI=mongodb://127.0.0.1:27017/shipnow_test
   NODE_ENV=test
   LOG_LEVEL=fatal
   ```
3. Asegurarse de que MongoDB esté iniciado y ejecutar:
   ```bash
   npm test
   ```

**Importante:** la suite conecta a MongoDB y elimina los documentos de las colecciones User, Order, Delivery y Product antes de cada prueba. Usá exclusivamente una base descartable de testing. Nunca configures `.env.test` con la URI de desarrollo o producción. Al finalizar también se limpian los datos y se cierra la conexión.

### Cobertura

Los tests están en `tests/` y validan status HTTP, estructura del body, propiedades relevantes y códigos de error:

- **Users:** listado, alta, datos incompletos y usuario inexistente.
- **Orders:** listado, creación, consulta por ID, pedido inexistente y estado inválido/actualización.
- **Deliveries:** listado, creación y datos obligatorios.
- **Mocks:** generación de users/orders, cantidad inválida y carga/limpieza de datos.
- **Logger:** respuesta de la herramienta de validación.
- **Swagger:** interfaz `/api/docs/` y especificación `/api/docs/openapi.json`.
- **Errores generales:** ruta inexistente y formato estructurado de error.

La aplicación se importa desde `src/app.js`; el levantamiento del puerto queda en `src/server.js`, por lo que Supertest puede probar Express directamente.

### Aclaraciones

- Se requiere una instancia MongoDB local o accesible por la URI de `.env.test`.
- `.env.test` no se versiona; el repositorio incluye `.env.test.example`.
- Las pruebas crean datos controlados y limpian las colecciones entre casos para no depender del orden de ejecución.
- El comando `npm test` ejecuta la suite funcional de `tests/`. Los tests de servicios existentes en `test/` corresponden a pruebas previas y no se mezclan con esta suite.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/products` | Lista productos con stock (`?includeOutOfStock=true` para incluir los sin stock) |
| GET / PUT / DELETE | `/api/products/:id` | Detalle / actualizar / eliminar |
| POST | `/api/products` | Crear producto |
| GET | `/api/users` | Lista usuarios (sin password) |
| GET / PUT / DELETE | `/api/users/:id` | Detalle / actualizar / eliminar |
| POST | `/api/users` | Crear usuario (password hasheado) |
| GET / POST | `/api/orders` | Lista pedidos / crear pedido (`customer`, `items`, `shippingAddress`, `priority` opcional) |
| GET | `/api/orders/:id` | Detalle de pedido |
| PATCH | `/api/orders/:id/status` | Cambiar el estado de un pedido (`{ "status": "CONFIRMED" }`) |
| GET / POST | `/api/deliveries` | Lista entregas / crear la entrega de un pedido (`order`, `courier` y `scheduledAt` opcionales) |
| GET / PATCH | `/api/deliveries/:id` | Detalle / cambiar estado y/o asignar repartidor (`status`, `courier`) |
| GET | `/api/logger/test` | Endpoint interno para probar el logger (emite un log por nivel) |
| GET / POST / DELETE | `/api/mocks/...` | Mocking y datos de prueba (ver sección siguiente) |

## Documentación de la API (Swagger / OpenAPI)

Con el servidor corriendo (`npm run dev`), la documentación interactiva está en:

- **Swagger UI:** http://localhost:3000/api/docs (cambiá el puerto si definiste otro `PORT`)
- **Especificación en JSON (OpenAPI 3.0.3):** http://localhost:3000/api/docs/openapi.json (sirve para importarla en Postman)

### Cómo usarla

1. Abrí `/api/docs`. Los endpoints están agrupados por tag.
2. Desplegá un endpoint, apretá **Try it out**, completá parámetros o body (ya vienen con ejemplos) y **Execute**.
3. Debajo de cada endpoint ves las respuestas posibles: la exitosa y todos los errores, con el **código** de error real (`USER_NOT_FOUND`, `MOCK_QTY_NEGATIVE`, etc.) y un ejemplo de la respuesta.

### Módulos documentados

| Tag | Endpoints |
|---|---|
| **Users** | listar, crear, consultar, actualizar y eliminar usuarios |
| **Products** | listar, crear, consultar, actualizar y eliminar productos |
| **Orders** | listar, crear, consultar y cambiar el estado de un pedido |
| **Deliveries** | listar, crear la entrega de un pedido, consultar, y cambiar estado / asignar repartidor |
| **Mocks** | usuarios, repartidores, pedidos, entregas y dataset simulados (`GET`), carga de datos de prueba (`POST /seed`) y limpieza (`DELETE /seed`) |
| **Logger** | `GET /api/logger/test`: herramienta interna de validación, **no es funcionalidad de negocio** |

Son 26 operaciones. Schemas reutilizables: `User`, `Product`, `Order`, `OrderItem`, `Delivery`, `ErrorResponse`, `SuccessResponse` (más los de entrada: `UserCreate`, `OrderCreate`, `DeliveryUpdate`, etc.).

### Cómo está armada

La configuración de Swagger está **separada de las rutas de negocio**, en `src/docs/`:

```
src/docs/
├── index.js              Router de Swagger UI (se monta en /api/docs desde app.js)
└── openapi/
    ├── index.js          Arma la especificación completa
    ├── info.js           Nombre, versión, descripción, servidor local y tags
    ├── schemas.js        Schemas reutilizables
    ├── parameters.js     Parámetros reutilizables (id, page, limit, qty, type...)
    ├── helpers.js        Respuestas exitosas y de error
    └── paths/            Un archivo por módulo (users, products, orders, deliveries, mocks, logger)
```

La documentación **no puede contradecir a la API**: los enums (roles, estados, prioridades) salen de `src/constants`, y los códigos, status y mensajes de error salen del diccionario `src/errors/error.dictionary.js`. Además, `npm test` incluye tests que verifican que las rutas documentadas son exactamente las que existen en `src/routes/`, que todos los `$ref` resuelven y que cada error documentado existe en el diccionario con su status real.

### Aclaraciones para probar los endpoints

- **No hay autenticación**, por eso no se documentan errores 401/403.
- **Ids:** son ObjectId de 24 caracteres hexadecimales. Otro formato responde `400 INVALID_ID`.
- **Orden recomendado para probar el flujo completo:**
  1. `POST /api/users` (cliente) y `POST /api/users` con `"role": "COURIER"` (repartidor). Guardá los dos `_id`.
  2. `POST /api/orders` con el `_id` del cliente como `customer`.
  3. `POST /api/deliveries` con el `_id` del pedido como `order` (y opcionalmente el del repartidor como `courier`).
  4. `PATCH /api/deliveries/:id` con `{"status": "IN_TRANSIT", "courier": "<id del repartidor>"}`. Sin repartidor asignado responde `409 DELIVERY_COURIER_REQUIRED`.
  5. `PATCH /api/orders/:id/status` con `{"status": "DELIVERED"}`.
- **Atajo con datos de prueba:** `POST /api/mocks/seed?qty=5&type=all` carga usuarios, repartidores, pedidos y entregas relacionados. Después podés copiar los ids con los `GET`. `DELETE /api/mocks/seed` los elimina.
- **Mocks:** `POST /api/mocks/seed` **no recibe body**; `qty` y `type` van por query. Los `GET /api/mocks/...` devuelven los datos directamente (sin `status`/`payload`) y no los guardan.
- **Probar errores de `qty`:** `qty=abc` o `0` → `MOCK_QTY_INVALID`; `qty=-5` → `MOCK_QTY_NEGATIVE`; `qty=500` → `MOCK_QTY_OUT_OF_RANGE`. Si Swagger UI no te deja enviar un valor inválido, probalo directo en el navegador o con curl.
- **Estados inválidos:** `PATCH /api/orders/:id/status` con `{"status":"VOLANDO"}` → `400 INVALID_STATUS`. Lo mismo en `PATCH /api/deliveries/:id`.
- Los `DELETE` exitosos responden `204` sin cuerpo.
- `GET /api/logger/test` es una herramienta interna: en un sistema real conviene deshabilitarla o protegerla en producción.

## Mocking y datos de prueba (`/api/mocks`)

Genera usuarios, repartidores, pedidos y entregas simulados. Los endpoints `GET` **no guardan nada**; el `POST /seed` sí inserta en MongoDB.

### Roles, estados y prioridades (constantes en `src/constants/index.js`)

| Constante | Valores |
|---|---|
| `USER_ROLES` | `ADMIN`, `USER` (cliente), `COURIER` (repartidor) |
| `ORDER_STATUS` | `PENDING`, `CONFIRMED`, `IN_TRANSIT`, `DELIVERED`, `CANCELLED` |
| `ORDER_PRIORITY` | `LOW`, `NORMAL`, `HIGH`, `URGENT` |
| `DELIVERY_STATUS` | `PENDING`, `IN_TRANSIT`, `DELIVERED`, `FAILED` |

### Datos simulados (no se guardan)

`qty` es opcional (por defecto 10, máximo 100; fuera de rango devuelve 400).

| Endpoint | Devuelve |
|---|---|
| `GET /api/mocks/users?qty=2` | Clientes (rol `USER`) |
| `GET /api/mocks/couriers?qty=2` | Repartidores (rol `COURIER`) |
| `GET /api/mocks/orders?qty=2` | Pedidos con cliente, items, total, estado y prioridad |
| `GET /api/mocks/deliveries?qty=2` | Entregas asociadas a un pedido y a un repartidor |
| `GET /api/mocks/dataset?qty=5` | Todo junto, con relaciones coherentes entre sí |

Ejemplo (`GET /api/mocks/users?qty=2`):
```json
[
  { "_id": "6650...", "name": "Ana Pérez", "email": "ana.perez.4821@test.com", "role": "USER", "isMock": true },
  { "_id": "6650...", "name": "Luis Gómez", "email": "luis.gomez.307@test.com", "role": "USER", "isMock": true }
]
```

### Cargar datos de prueba en MongoDB

`POST /api/mocks/seed?qty=10&type=users`

| `type` | Qué inserta |
|---|---|
| `users` (por defecto) | `qty` clientes |
| `couriers` | `qty` repartidores |
| `orders` | `qty` pedidos asociados a clientes que ya existen en la base |
| `deliveries` | Entregas para pedidos que aún no tienen una, con repartidores existentes |
| `all` | Todo el conjunto a la vez, con las relaciones ya resueltas |

Respuesta de `POST /api/mocks/seed?qty=10`:
```json
{ "insertados": 10, "coleccion": "usuarios" }
```
Con `type=all` la respuesta suma el total y agrega un `detalle` por colección. Si falta una dependencia (por ejemplo `type=orders` sin clientes) responde 409 con un mensaje que indica qué sembrar primero.

Los usuarios de prueba se guardan con el password `Test1234` (hasheado) y el dominio `@test.com`.

**Limpieza:** todo lo generado queda marcado con `isMock: true`. `DELETE /api/mocks/seed` borra solo esos registros y no toca datos reales.

### Reglas de coherencia

- Cada pedido apunta a un usuario con rol `USER`.
- Los repartidores son usuarios con rol `COURIER`.
- Pedidos `PENDING` o `CANCELLED` no tienen entrega. `CONFIRMED` genera una entrega `PENDING` sin repartidor. `IN_TRANSIT` y `DELIVERED` generan una entrega con repartidor, y `deliveredAt` solo si fue entregada.

### Cómo se reparte la lógica por capas

- **Router** (`mock.routes.js`): solo conecta paths con métodos del controller.
- **Controller** (`mock.controller.js`): lee `qty` y `type` de la query y devuelve el status code.
- **Service** (`mock.service.js`): valida `qty` y `type`, arma datasets coherentes, aplica las reglas de arriba y decide qué insertar.
- **Generador** (`utils/mock.generator.js`): funciones puras que fabrican cada entidad con las constantes (sin base de datos).
- **Repositories**: únicos que usan Mongoose (`insertMany`, búsqueda de ids por rol y borrado de mocks).

## Manejo de errores

Todos los errores pasan por una capa común. Cada capa tiene su rol:

- **Service**: detecta el problema y lanza un error de dominio (por ejemplo `UserNotFoundError`, `NegativeValueError`, `InvalidMockQuantityError`).
- **Controller**: no responde errores. Está envuelto en `asyncHandler`, que deriva cualquier excepción al middleware.
- **Middleware global** (`error.middleware.js`): es el **único** lugar que arma la respuesta de error. También traduce errores externos (JSON roto, `CastError`, clave duplicada, caída de MongoDB) al mismo formato.
- **Diccionario** (`src/errors/error.dictionary.js`): define el status HTTP y el mensaje de cada código en un solo lugar.

### Logging y monitoreo

Se usa **Winston** (con `winston-daily-rotate-file` para la rotación). Hay un único logger centralizado (`src/config/logger.js`) que se inyecta en los services y middlewares; no quedan `console.log` en el código.

Formato de cada línea (consola y archivos): `fecha hora [nivel] mensaje {metadata}`

```
2026-11-17 10:12:03 [info]    Servidor ShipNow escuchando en el puerto 3000 (development)
2026-11-17 10:12:03 [info]    Conexión a MongoDB establecida
2026-11-17 10:14:21 [warning] Usuario no encontrado {"code":"USER_NOT_FOUND","method":"GET","path":"/api/users/aaaa..."}
2026-11-17 10:15:09 [error]   Falló la carga de datos de prueba en la colección pedidos {"code":"MOCK_SEED_FAILED",...}
```

### Niveles

De más a menos severo (definidos en `src/constants/index.js`):

| Nivel | Se usa para |
|---|---|
| `fatal` | La app no puede seguir: configuración inválida, falla de conexión inicial a MongoDB, puerto ocupado, excepciones no capturadas |
| `error` | Errores inesperados del servidor (5xx): fallas de MongoDB, bugs, `MOCK_SEED_FAILED` |
| `warning` | Errores esperados o de negocio (4xx): recurso no encontrado, datos inválidos, ruta inexistente, `qty` inválida en mocks, pérdida de conexión a MongoDB |
| `info` | Eventos importantes: servidor iniciado, MongoDB conectado, pedido/producto/usuario creado o modificado, seed de mocks |
| `http` | Cada petición HTTP: método, url, status y duración |
| `debug` | Detalle para desarrollo: conexión a MongoDB, generación de datos simulados |

### Comportamiento según el entorno

| `NODE_ENV` | Nivel mínimo | Consola | Archivos |
|---|---|---|---|
| `development` | `debug` (todo) | Con colores | Sí |
| `production` | `info` (sin `http` ni `debug`) | Sin colores | Sí |
| `test` | `fatal` | Silenciosa | No |

Opcionalmente, `LOG_LEVEL` en el `.env` fuerza otro nivel (por ejemplo `LOG_LEVEL=warning`). Si se deja vacío, manda `NODE_ENV`.

### Dónde se guardan los logs

En la carpeta `logs/` (se crea sola al arrancar):

| Archivo | Contenido |
|---|---|
| `logs/combined-AAAA-MM-DD.log` | Todos los niveles desde el nivel activo del entorno |
| `logs/error-AAAA-MM-DD.log` | **Solo `error` y `fatal`** |

**Rotación:** se crea un archivo nuevo por día, o antes si supera los 20 MB. Los archivos viejos se comprimen (`.gz`) y se conservan 14 días; los más antiguos se borran solos.

**Git:** `logs/*` está en el `.gitignore`, así que los archivos generados no se suben. La carpeta se conserva en el repo con un `logs/.gitkeep`.

### Cómo probar el endpoint del logger

1. Arrancá la API con `npm run dev` (`NODE_ENV=development`).
2. Pedí `GET http://localhost:3000/api/logger/test`.
3. Respuesta esperada: `200` con los niveles emitidos y el nivel activo.
4. En la consola vas a ver una línea por cada nivel (`debug`, `http`, `info`, `warning`, `error`, `fatal`) más la línea `http` de la propia petición.
5. Abrí `logs/combined-<fecha>.log`: están todos los niveles. Abrí `logs/error-<fecha>.log`: **solo** `error` y `fatal`.
6. Cambiá a `NODE_ENV=production`, reiniciá y repetí: ya no aparecen `debug` ni `http`.

Otras pruebas útiles:

| Acción | Log esperado |
|---|---|
| `GET /api/mocks/users?qty=-5` | `warning` con `MOCK_QTY_NEGATIVE` |
| `GET /api/orders/aaaaaaaaaaaaaaaaaaaaaaaa` | `warning` con `ORDER_NOT_FOUND` |
| `GET /api/cosas` | `warning` con `ROUTE_NOT_FOUND` |
| `POST /api/orders` con datos válidos | `info` "Pedido creado: ..." |
| `POST /api/mocks/seed?qty=5` | `info` "Seed de mocks (users): 5 documentos..." |
| Quitar `MONGODB_URI` del `.env` y arrancar | `fatal` y la app no inicia (queda también en `error-<fecha>.log`) |
| Usar una URI de MongoDB inalcanzable | `fatal` "No se pudo conectar a MongoDB" y la app termina |

> El endpoint `/api/logger/test` es una herramienta interna de verificación. En un sistema real conviene deshabilitarlo o protegerlo en producción.

## Estructura de la respuesta de error

Todos los errores, sin excepción, responden así:

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

`details` es siempre un array (puede estar vacío). En errores 5xx el mensaje es genérico; fuera de producción se agrega la causa técnica en `details` para facilitar el debug.

### Códigos de error

| Código | HTTP | Cuándo |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Datos con formato inválido (por ejemplo `price: "abc"`, `page=0`) |
| `MISSING_FIELDS` | 400 | Faltan campos obligatorios |
| `INVALID_ID` | 400 | El id no tiene formato de ObjectId |
| `INVALID_JSON` | 400 | El body no es un JSON válido |
| `NEGATIVE_VALUE` | 400 | Precio o stock negativo |
| `INVALID_STATUS` / `INVALID_ROLE` | 400 | Estado o rol fuera de las constantes |
| `INVALID_PRIORITY` | 400 | Prioridad de pedido fuera de las constantes |
| `USER_NOT_FOUND` / `PRODUCT_NOT_FOUND` / `ORDER_NOT_FOUND` / `DELIVERY_NOT_FOUND` | 404 | El recurso no existe |
| `ROUTE_NOT_FOUND` | 404 | La ruta no existe |
| `EMAIL_ALREADY_EXISTS` / `DUPLICATE_KEY` | 409 | Dato único repetido |
| `DELIVERY_ALREADY_EXISTS` | 409 | El pedido ya tiene una entrega |
| `DELIVERY_COURIER_REQUIRED` | 409 | Pasar una entrega a `IN_TRANSIT` o `DELIVERED` sin repartidor asignado |
| `MOCK_QTY_INVALID` | 400 | `qty` no es un entero mayor a 0 (`abc`, `1.5`, `0`) |
| `MOCK_QTY_NEGATIVE` | 400 | `qty` negativa |
| `MOCK_QTY_OUT_OF_RANGE` | 400 | `qty` mayor a 100 |
| `MOCK_TYPE_INVALID` | 400 | `type` de seed inválido |
| `MOCK_DEPENDENCY_MISSING` | 409 | Falta sembrar datos previos (por ejemplo pedidos sin usuarios) |
| `MOCK_SEED_FAILED` | 500 | Falló la inserción en MongoDB (informa qué se alcanzó a insertar) |
| `DATABASE_ERROR` | 503 | MongoDB no disponible |
| `INTERNAL_ERROR` | 500 | Error inesperado |

### Cómo probar los casos inválidos

Con la API corriendo (`npm run dev`), en Postman o con `curl`:

| Caso | Petición | Respuesta esperada |
|---|---|---|
| Usuario inexistente | `GET /api/users/aaaaaaaaaaaaaaaaaaaaaaaa` | 404 `USER_NOT_FOUND` |
| Pedido inexistente | `GET /api/orders/aaaaaaaaaaaaaaaaaaaaaaaa` | 404 `ORDER_NOT_FOUND` |
| Id con formato inválido | `GET /api/products/123` | 400 `INVALID_ID` |
| Ruta inexistente | `GET /api/cosas` | 404 `ROUTE_NOT_FOUND` |
| Faltan campos | `POST /api/products` con body `{}` | 400 `MISSING_FIELDS` |
| Valor negativo | `POST /api/products` con `{"name":"X","price":-5}` | 400 `NEGATIVE_VALUE` |
| Estado inválido | `PUT /api/products/:id` con `{"status":"ROTO"}` | 400 `INVALID_STATUS` |
| Rol inválido | `POST /api/users` con `"role":"HACKER"` | 400 `INVALID_ROLE` |
| Email repetido | `POST /api/users` dos veces con el mismo email | 409 `EMAIL_ALREADY_EXISTS` |
| JSON roto | `POST /api/products` con body `{"name":` | 400 `INVALID_JSON` |
| Paginación inválida | `GET /api/products?page=0` | 400 `VALIDATION_ERROR` |
| Mock: qty inválida | `GET /api/mocks/users?qty=abc` | 400 `MOCK_QTY_INVALID` |
| Mock: qty negativa | `GET /api/mocks/users?qty=-5` | 400 `MOCK_QTY_NEGATIVE` |
| Mock: qty excedida | `GET /api/mocks/orders?qty=500` | 400 `MOCK_QTY_OUT_OF_RANGE` |
| Mock: type inválido | `POST /api/mocks/seed?qty=5&type=cosas` | 400 `MOCK_TYPE_INVALID` |
| Mock: falta dependencia | `POST /api/mocks/seed?type=orders` con la base sin usuarios | 409 `MOCK_DEPENDENCY_MISSING` |
| Mock: falla en MongoDB | Cortar la conexión a MongoDB (por ejemplo detener el servicio) y hacer `POST /api/mocks/seed?qty=5` | 500 `MOCK_SEED_FAILED` o 503 `DATABASE_ERROR` |

Los tests automáticos (`npm test`) cubren el diccionario, los errores de dominio, el normalizador, el middleware y las validaciones de products y mocks, incluida la falla de inserción simulada.

## Estructura

```
src/
├── config/        env.config.js (validación), index.js (re-export), db.config.js,
│                  logger.factory.js (arma Winston), logger.js (instancia única)
├── constants/     USER_ROLES, PRODUCT_STATUS, NODE_ENVS, RESPONSE_STATUS (Object.freeze)
├── docs/          Swagger/OpenAPI (spec + router de Swagger UI)
├── errors/        Diccionario de errores, AppError, errores de dominio y normalizador
├── controllers/   Solo req/res y status codes (errores: se derivan con asyncHandler)
├── services/      Lógica de negocio (reciben el repository por constructor; index.js los cablea)
├── repositories/  Único lugar que usa Mongoose para consultas
├── models/        Solo esquemas
├── routes/        Solo conectan path -> método del controller
├── middlewares/   error.middleware.js (único que responde errores), not-found.middleware.js
logs/              Archivos de log generados (ignorados por Git, salvo .gitkeep)
└── utils/         log.format.js, noop.logger.js, shutdown.js, validators.js, async.handler.js, mock.generator.js (generador puro de datos simulados)
test/              Tests de services con un repository falso
```

## ¿Por qué separé la lógica entre Service y Repository?

- **Repository**: es el único que consulta Mongoose. No es un "pasamanos": encapsula decisiones de acceso a datos como
  proyecciones por defecto (nunca devuelve `password` ni `__v`), filtros por defecto (nunca lista productos
  `DISCONTINUED`), paginación, orden y `lean()`. Si mañana cambio de base de datos, solo toco esta capa.
- **Service**: contiene las reglas de negocio, que no dependen de cómo se guardan los datos: el estado del producto se
  calcula según el stock, por defecto no se muestran productos sin stock, se hashea el password, se valida el rol y se
  evitan emails duplicados.
- **Controller**: traduce HTTP ↔ Service (parsea query/params, elige el status code) y delega los errores al middleware.
  Nunca importa Mongoose.

Así cada capa se puede testear y cambiar de forma independiente, y la lógica de negocio no queda mezclada con consultas ni con HTTP.

Los services reciben el repository por constructor (inyección de dependencias). Por eso se pueden probar con un
repository falso en memoria, sin levantar MongoDB (ver `test/product.service.test.js`).
