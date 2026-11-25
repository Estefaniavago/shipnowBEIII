import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'));

export const buildInfo = () => ({
  title: 'ShipNow API',
  version,
  description: [
    'API REST de **ShipNow**: gestión de usuarios, productos, pedidos y entregas, con un módulo de **mocks** para generar datos de prueba y un endpoint interno para validar el **logger**.',
    '',
    '**Propósito:** servir como backend de una plataforma de envíos con arquitectura por capas (Controller → Service → Repository), manejo centralizado de errores y logging con Winston.',
    '',
    '### Convenciones',
    '- **Respuesta exitosa:** `{ "status": "success", "payload": ... }`. Excepciones: los `GET /api/mocks/...` devuelven los datos directamente, y los `DELETE` exitosos responden `204` sin cuerpo.',
    '- **Respuesta de error (siempre la misma estructura):** `{ "status": "error", "code", "message", "details", "path", "timestamp" }`. El `code` identifica el error y sale del diccionario de errores de la API.',
    '- **Ids:** son ObjectId de MongoDB (24 caracteres hexadecimales). Un id con otro formato responde `400 INVALID_ID`.',
    '- **Carga de archivos:** los endpoints de documentos y comprobantes usan `multipart/form-data` (PDF, JPG o PNG). En la base solo se guardan los metadatos.',
    '- **Autenticación:** la API no usa autenticación, por eso no se documentan errores 401/403.',
    '- Una ruta inexistente responde `404 ROUTE_NOT_FOUND`, un JSON inválido responde `400 INVALID_JSON` y un body de más de 100 kb responde `413 PAYLOAD_TOO_LARGE`.',
    '- **Paginación:** todos los listados paginan con `page` y `limit` (por defecto 20, máximo 100) y admiten filtros opcionales.',
    '- **Endpoints internos:** los mocks y el logger test solo existen cuando están habilitados (por defecto, apagados en producción). Esta documentación muestra únicamente lo que está activo.',
  ].join('\n'),
});

export const buildServers = (port, publicUrl = null) => [
  ...(publicUrl ? [{ url: publicUrl, description: 'Servidor público (PUBLIC_URL)' }] : []),
  { url: `http://localhost:${port}`, description: 'Servidor local' },
];

export const TAGS = Object.freeze({
  HEALTH: 'Health',
  USERS: 'Users',
  PRODUCTS: 'Products',
  ORDERS: 'Orders',
  DELIVERIES: 'Deliveries',
  MOCKS: 'Mocks',
  LOGGER: 'Logger',
});

export const tags = [
  { name: TAGS.HEALTH, description: 'Estado de la API (health check). Público y sin información sensible.' },
  { name: TAGS.USERS, description: 'Usuarios del sistema: clientes (`USER`), repartidores (`COURIER`) y administradores (`ADMIN`).' },
  { name: TAGS.PRODUCTS, description: 'Catálogo de productos. El estado se calcula según el stock.' },
  { name: TAGS.ORDERS, description: 'Pedidos de los clientes, con items, estado y prioridad.' },
  { name: TAGS.DELIVERIES, description: 'Entregas asociadas a un pedido y, cuando corresponde, a un repartidor.' },
  { name: TAGS.MOCKS, description: 'Datos simulados: los `GET` no guardan nada; `POST /api/mocks/seed` inserta datos de prueba en MongoDB.' },
  { name: TAGS.LOGGER, description: 'Herramienta interna para validar la configuración del logger. **No es una funcionalidad de negocio.**' },
];
