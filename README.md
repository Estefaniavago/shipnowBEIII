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

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/products` | Lista productos con stock (`?includeOutOfStock=true` para incluir los sin stock) |
| GET / PUT / DELETE | `/api/products/:id` | Detalle / actualizar / eliminar |
| POST | `/api/products` | Crear producto |
| GET | `/api/users` | Lista usuarios (sin password) |
| GET / PUT / DELETE | `/api/users/:id` | Detalle / actualizar / eliminar |
| POST | `/api/users` | Crear usuario (password hasheado) |
| GET | `/api/orders`, `/api/orders/:id` | Lista / detalle de pedidos |
| GET / POST / DELETE | `/api/mocks/...` | Mocking y datos de prueba (ver sección siguiente) |

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

### Estructura de la respuesta de error

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
| `USER_NOT_FOUND` / `PRODUCT_NOT_FOUND` / `ORDER_NOT_FOUND` | 404 | El recurso no existe |
| `ROUTE_NOT_FOUND` | 404 | La ruta no existe |
| `EMAIL_ALREADY_EXISTS` / `DUPLICATE_KEY` | 409 | Dato único repetido |
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
├── config/        env.config.js (validación), index.js (re-export), db.config.js
├── constants/     USER_ROLES, PRODUCT_STATUS, NODE_ENVS, RESPONSE_STATUS (Object.freeze)
├── errors/        Diccionario de errores, AppError, errores de dominio y normalizador
├── controllers/   Solo req/res y status codes (errores: se derivan con asyncHandler)
├── services/      Lógica de negocio (reciben el repository por constructor; index.js los cablea)
├── repositories/  Único lugar que usa Mongoose para consultas
├── models/        Solo esquemas
├── routes/        Solo conectan path -> método del controller
├── middlewares/   error.middleware.js (único que responde errores), not-found.middleware.js
└── utils/         validators.js, async.handler.js, mock.generator.js (generador puro de datos simulados)
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
