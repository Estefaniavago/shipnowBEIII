export const USER_ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  USER: 'USER', // cliente
  COURIER: 'COURIER', // repartidor
});

export const PRODUCT_STATUS = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  DISCONTINUED: 'DISCONTINUED',
});

export const ORDER_STATUS = Object.freeze({
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
});

export const ORDER_PRIORITY = Object.freeze({
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
});

export const DELIVERY_STATUS = Object.freeze({
  PENDING: 'PENDING',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
});

// Qué estado de entrega le corresponde a cada estado de pedido.
// Los pedidos PENDING y CANCELLED no tienen entrega.
export const ORDER_TO_DELIVERY_STATUS = Object.freeze({
  [ORDER_STATUS.CONFIRMED]: DELIVERY_STATUS.PENDING,
  [ORDER_STATUS.IN_TRANSIT]: DELIVERY_STATUS.IN_TRANSIT,
  [ORDER_STATUS.DELIVERED]: DELIVERY_STATUS.DELIVERED,
});

export const NODE_ENVS = Object.freeze({
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test',
});

export const RESPONSE_STATUS = Object.freeze({
  SUCCESS: 'success',
  ERROR: 'error',
});

export const MOCK = Object.freeze({
  DEFAULT_QTY: 10,
  MAX_QTY: 100,
  EMAIL_DOMAIN: 'test.com',
  DEFAULT_PASSWORD: 'Test1234',
});

export const MOCK_TYPES = Object.freeze({
  USERS: 'users',
  COURIERS: 'couriers',
  ORDERS: 'orders',
  DELIVERIES: 'deliveries',
  ALL: 'all',
});

// Nombres de colección que se devuelven en las respuestas.
export const MOCK_COLLECTIONS = Object.freeze({
  [MOCK_TYPES.USERS]: 'usuarios',
  [MOCK_TYPES.COURIERS]: 'repartidores',
  [MOCK_TYPES.ORDERS]: 'pedidos',
  [MOCK_TYPES.DELIVERIES]: 'entregas',
  [MOCK_TYPES.ALL]: 'todas',
});

export const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
});

// Niveles de log (de más a menos severo).
export const LOG_LEVELS = Object.freeze({
  FATAL: 'fatal',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  HTTP: 'http',
  DEBUG: 'debug',
});

// Prioridad numérica de Winston: menor número = más severo.
export const LOG_PRIORITIES = Object.freeze({
  [LOG_LEVELS.FATAL]: 0,
  [LOG_LEVELS.ERROR]: 1,
  [LOG_LEVELS.WARNING]: 2,
  [LOG_LEVELS.INFO]: 3,
  [LOG_LEVELS.HTTP]: 4,
  [LOG_LEVELS.DEBUG]: 5,
});

// Nivel mínimo que se registra según el entorno.
export const LOG_LEVEL_BY_ENV = Object.freeze({
  [NODE_ENVS.DEVELOPMENT]: LOG_LEVELS.DEBUG,
  [NODE_ENVS.PRODUCTION]: LOG_LEVELS.INFO,
  [NODE_ENVS.TEST]: LOG_LEVELS.FATAL,
});

export const LOG_DEFAULTS = Object.freeze({
  DIR: 'logs',
  DATE_PATTERN: 'YYYY-MM-DD',
  MAX_SIZE: '20m',
  MAX_FILES: '14d',
  TIMESTAMP_FORMAT: 'YYYY-MM-DD HH:mm:ss',
});

export const DOCS_ROUTE = '/api/docs';

// ---------- Carga de archivos ----------
export const DOCUMENT_TYPES = Object.freeze({
  ID_CARD: 'ID_CARD',
  DRIVER_LICENSE: 'DRIVER_LICENSE',
  PROOF_OF_ADDRESS: 'PROOF_OF_ADDRESS',
  OTHER: 'OTHER',
});

// Tipo con el que se registran los comprobantes de entrega (no lo elige el cliente).
export const RECEIPT_DOCUMENT_TYPE = 'DELIVERY_RECEIPT';

// Subcarpetas dentro de la carpeta de uploads.
export const UPLOAD_FOLDERS = Object.freeze({
  USER_DOCUMENTS: 'user-documents',
  LICENSES: 'licenses',
  DELIVERY_RECEIPTS: 'delivery-receipts',
});

// Nombre del campo de archivo que espera cada endpoint (multipart/form-data).
export const UPLOAD_FIELDS = Object.freeze({
  USER_DOCUMENT: 'document',
  DELIVERY_RECEIPT: 'receipt',
});

// Tipos de archivo aceptados y la extensión con la que se guardan.
export const ALLOWED_FILE_TYPES = Object.freeze({
  'application/pdf': Object.freeze({ extension: '.pdf' }),
  'image/jpeg': Object.freeze({ extension: '.jpg' }),
  'image/png': Object.freeze({ extension: '.png' }),
});

export const UPLOAD_DEFAULTS = Object.freeze({
  DIR: 'uploads',
  MAX_FILE_SIZE_MB: 5,
});
