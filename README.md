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

## Estructura

```
src/
├── config/        env.config.js (validación), index.js (re-export), db.config.js
├── constants/     USER_ROLES, PRODUCT_STATUS, NODE_ENVS, RESPONSE_STATUS (Object.freeze)
├── controllers/   Solo req/res y status codes
├── services/      Lógica de negocio (reciben el repository por constructor; index.js los cablea)
├── repositories/  Único lugar que usa Mongoose para consultas
├── models/        Solo esquemas
├── routes/        Solo conectan path -> método del controller
├── middlewares/   Manejo de errores
└── utils/         AppError
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
