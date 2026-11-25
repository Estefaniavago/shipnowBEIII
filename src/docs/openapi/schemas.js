import {
  USER_ROLES, PRODUCT_STATUS, ORDER_STATUS, ORDER_PRIORITY, DELIVERY_STATUS,
  MOCK_COLLECTIONS, LOG_LEVELS, DOCUMENT_TYPES, RECEIPT_DOCUMENT_TYPE, UPLOAD_FIELDS,
} from '../../constants/index.js';
import { ERROR_DICTIONARY } from '../../errors/index.js';
import { ref } from './helpers.js';

// Los enums salen de las constantes del proyecto: no hay valores escritos a mano.
const objectId = (example) => ({ type: 'string', pattern: '^[0-9a-fA-F]{24}$', example });
const dateTime = (example) => ({ type: 'string', format: 'date-time', example });

const IDS = {
  user: '6650a1f2c3d4e5f607182930',
  courier: '6650a1f2c3d4e5f607182931',
  order: '6650a1f2c3d4e5f607182932',
  delivery: '6650a1f2c3d4e5f607182933',
  product: '6650a1f2c3d4e5f607182934',
};
const NOW = '2026-11-17T15:30:00.000Z';

export const schemas = {
  ObjectId: objectId(IDS.user),

  // ---------- Respuestas ----------
  SuccessResponse: {
    type: 'object',
    required: ['status', 'payload'],
    properties: {
      status: { type: 'string', enum: ['success'], example: 'success' },
      payload: { description: 'Datos devueltos por el endpoint (objeto o array).' },
    },
  },
  ErrorResponse: {
    type: 'object',
    required: ['status', 'code', 'message', 'details', 'path', 'timestamp'],
    properties: {
      status: { type: 'string', enum: ['error'], example: 'error' },
      code: { type: 'string', enum: Object.keys(ERROR_DICTIONARY), example: 'USER_NOT_FOUND' },
      message: { type: 'string', example: 'Usuario no encontrado' },
      details: {
        type: 'array',
        description: 'Información adicional del error (siempre es un array; puede estar vacío).',
        items: { type: 'object', additionalProperties: true },
        example: [{ field: 'id', value: IDS.user }],
      },
      path: { type: 'string', example: `/api/users/${IDS.user}` },
      timestamp: dateTime(NOW),
    },
  },

  // ---------- Archivos (solo metadatos: el archivo vive en el disco del servidor) ----------
  FileMetadata: {
    type: 'object',
    description: 'Metadatos de un archivo subido. El contenido del archivo NO se guarda en la base de datos.',
    properties: {
      _id: objectId('6650a1f2c3d4e5f607182940'),
      originalName: { type: 'string', example: 'dni-frente.pdf' },
      storedName: { type: 'string', description: 'Nombre generado por el servidor (timestamp + UUID + extensión).', example: '1731855000000-3f2b9c1e-7a4d-4e0b-9c55-1d2f8a6b7c90.pdf' },
      path: { type: 'string', description: 'Ruta relativa a la carpeta de uploads.', example: 'user-documents/1731855000000-3f2b9c1e-7a4d-4e0b-9c55-1d2f8a6b7c90.pdf' },
      mimeType: { type: 'string', enum: ['application/pdf', 'image/jpeg', 'image/png'], example: 'application/pdf' },
      size: { type: 'integer', description: 'Tamaño en bytes.', example: 48213 },
      documentType: { type: 'string', enum: [...Object.values(DOCUMENT_TYPES), RECEIPT_DOCUMENT_TYPE], example: DOCUMENT_TYPES.ID_CARD },
      uploadedAt: dateTime(NOW),
    },
  },
  UserDocumentUpload: {
    type: 'object',
    required: [UPLOAD_FIELDS.USER_DOCUMENT],
    properties: {
      [UPLOAD_FIELDS.USER_DOCUMENT]: { type: 'string', format: 'binary', description: 'Archivo PDF, JPG o PNG.' },
      documentType: {
        type: 'string',
        enum: Object.values(DOCUMENT_TYPES),
        default: DOCUMENT_TYPES.OTHER,
        description: 'Opcional. Si no se envía se usa OTHER. DRIVER_LICENSE se guarda en la carpeta licenses/.',
      },
    },
  },
  DeliveryReceiptUpload: {
    type: 'object',
    required: [UPLOAD_FIELDS.DELIVERY_RECEIPT],
    properties: {
      [UPLOAD_FIELDS.DELIVERY_RECEIPT]: { type: 'string', format: 'binary', description: 'Comprobante en PDF, JPG o PNG.' },
    },
  },

  // ---------- Usuarios ----------
  User: {
    type: 'object',
    properties: {
      _id: objectId(IDS.user),
      name: { type: 'string', example: 'Ana Pérez' },
      email: { type: 'string', format: 'email', example: 'ana.perez@test.com' },
      role: { type: 'string', enum: Object.values(USER_ROLES), example: USER_ROLES.USER },
      documents: { type: 'array', description: 'Metadatos de los documentos cargados.', items: ref('FileMetadata') },
      isMock: { type: 'boolean', description: 'true si fue generado por el módulo de mocks.', example: false },
      createdAt: dateTime(NOW),
      updatedAt: dateTime(NOW),
    },
  },
  UserCreate: {
    type: 'object',
    required: ['name', 'email', 'password'],
    properties: {
      name: { type: 'string', example: 'Ana Pérez' },
      email: { type: 'string', format: 'email', example: 'ana.perez@test.com' },
      password: { type: 'string', minLength: 6, example: 'secreto123' },
      role: { type: 'string', enum: Object.values(USER_ROLES), default: USER_ROLES.USER },
    },
  },
  UserUpdate: {
    type: 'object',
    description: 'Todos los campos son opcionales. Los documentos no se editan por acá: se cargan con POST /api/users/{id}/documents.',
    properties: {
      name: { type: 'string', example: 'Ana P. Gómez' },
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 6 },
      role: { type: 'string', enum: Object.values(USER_ROLES) },
    },
  },

  // ---------- Productos ----------
  Product: {
    type: 'object',
    properties: {
      _id: objectId(IDS.product),
      name: { type: 'string', example: 'Caja mediana' },
      description: { type: 'string', example: 'Caja de cartón 30x30' },
      price: { type: 'number', minimum: 0, example: 2500 },
      stock: { type: 'number', minimum: 0, example: 40 },
      status: { type: 'string', enum: Object.values(PRODUCT_STATUS), example: PRODUCT_STATUS.AVAILABLE },
      createdAt: dateTime(NOW),
      updatedAt: dateTime(NOW),
    },
  },
  ProductCreate: {
    type: 'object',
    required: ['name', 'price'],
    properties: {
      name: { type: 'string', example: 'Caja mediana' },
      description: { type: 'string', example: 'Caja de cartón 30x30' },
      price: { type: 'number', minimum: 0, example: 2500 },
      stock: { type: 'number', minimum: 0, default: 0, example: 40 },
    },
  },
  ProductUpdate: {
    type: 'object',
    description: 'Todos los campos son opcionales. Si no se envía `status`, se recalcula según el stock.',
    properties: {
      name: { type: 'string' },
      description: { type: 'string' },
      price: { type: 'number', minimum: 0 },
      stock: { type: 'number', minimum: 0 },
      status: { type: 'string', enum: Object.values(PRODUCT_STATUS) },
    },
  },

  // ---------- Pedidos ----------
  OrderItem: {
    type: 'object',
    required: ['name', 'quantity', 'unitPrice'],
    properties: {
      name: { type: 'string', example: 'Caja grande' },
      quantity: { type: 'integer', minimum: 1, example: 2 },
      unitPrice: { type: 'number', minimum: 0, example: 4000 },
    },
  },
  ShippingAddress: {
    type: 'object',
    required: ['street', 'city'],
    properties: {
      street: { type: 'string', example: 'Av. Argentina 1200' },
      city: { type: 'string', example: 'Neuquén' },
    },
  },
  Order: {
    type: 'object',
    properties: {
      _id: objectId(IDS.order),
      customer: { ...objectId(IDS.user), description: 'Id del usuario (rol USER) que hizo el pedido.' },
      items: { type: 'array', items: ref('OrderItem') },
      total: { type: 'number', description: 'Suma de quantity × unitPrice de cada item.', example: 8000 },
      status: { type: 'string', enum: Object.values(ORDER_STATUS), example: ORDER_STATUS.PENDING },
      priority: { type: 'string', enum: Object.values(ORDER_PRIORITY), example: ORDER_PRIORITY.NORMAL },
      shippingAddress: ref('ShippingAddress'),
      isMock: { type: 'boolean', example: false },
      createdAt: dateTime(NOW),
      updatedAt: dateTime(NOW),
    },
  },
  OrderCreate: {
    type: 'object',
    required: ['customer', 'items', 'shippingAddress'],
    properties: {
      customer: { ...objectId(IDS.user), description: 'Id de un usuario existente.' },
      items: { type: 'array', minItems: 1, items: ref('OrderItem') },
      shippingAddress: ref('ShippingAddress'),
      priority: { type: 'string', enum: Object.values(ORDER_PRIORITY), default: ORDER_PRIORITY.NORMAL },
    },
  },
  OrderStatusUpdate: {
    type: 'object',
    required: ['status'],
    properties: { status: { type: 'string', enum: Object.values(ORDER_STATUS), example: ORDER_STATUS.CONFIRMED } },
  },

  // ---------- Entregas ----------
  Delivery: {
    type: 'object',
    properties: {
      _id: objectId(IDS.delivery),
      order: { ...objectId(IDS.order), description: 'Id del pedido asociado.' },
      courier: {
        ...objectId(IDS.courier),
        nullable: true,
        description: 'Id del repartidor (usuario con rol COURIER). Es null mientras no fue asignado.',
      },
      status: { type: 'string', enum: Object.values(DELIVERY_STATUS), example: DELIVERY_STATUS.PENDING },
      trackingCode: { type: 'string', example: 'SN-2AEAC679' },
      scheduledAt: dateTime(NOW),
      deliveredAt: { ...dateTime(null), nullable: true, description: 'Solo tiene valor cuando el estado es DELIVERED.' },
      receipts: { type: 'array', description: 'Metadatos de los comprobantes cargados.', items: ref('FileMetadata') },
      isMock: { type: 'boolean', example: false },
      createdAt: dateTime(NOW),
      updatedAt: dateTime(NOW),
    },
  },
  DeliveryCreate: {
    type: 'object',
    required: ['order'],
    properties: {
      order: { ...objectId(IDS.order), description: 'Id de un pedido existente que todavía no tenga entrega.' },
      courier: { ...objectId(IDS.courier), description: 'Opcional. Debe ser un usuario con rol COURIER.' },
      scheduledAt: { ...dateTime(NOW), description: 'Opcional. Por defecto, 24 horas desde ahora.' },
    },
  },
  DeliveryUpdate: {
    type: 'object',
    minProperties: 1,
    description: 'Enviar `status` y/o `courier`. Los estados IN_TRANSIT y DELIVERED requieren repartidor asignado.',
    properties: {
      status: { type: 'string', enum: Object.values(DELIVERY_STATUS), example: DELIVERY_STATUS.IN_TRANSIT },
      courier: { ...objectId(IDS.courier), description: 'Debe ser un usuario con rol COURIER.' },
    },
  },

  // ---------- Mocks ----------
  MockSeedResult: {
    type: 'object',
    required: ['insertados', 'coleccion'],
    properties: {
      insertados: { type: 'integer', example: 10 },
      coleccion: { type: 'string', enum: Object.values(MOCK_COLLECTIONS), example: MOCK_COLLECTIONS.users },
      detalle: {
        type: 'object',
        description: 'Solo con `type=all`: cantidad insertada por colección.',
        additionalProperties: { type: 'integer' },
        example: { usuarios: 10, repartidores: 2, pedidos: 10, entregas: 6 },
      },
    },
  },
  MockClearResult: {
    type: 'object',
    properties: {
      eliminados: {
        type: 'object',
        properties: {
          entregas: { type: 'integer', example: 6 },
          pedidos: { type: 'integer', example: 10 },
          usuarios: { type: 'integer', example: 12 },
        },
      },
    },
  },
  MockDataset: {
    type: 'object',
    description: 'Conjunto coherente: los pedidos apuntan a `users` y las entregas a `orders` y `couriers`.',
    properties: {
      users: { type: 'array', items: ref('User') },
      couriers: { type: 'array', items: ref('User') },
      orders: { type: 'array', items: ref('Order') },
      deliveries: { type: 'array', items: ref('Delivery') },
    },
  },

  // ---------- Health ----------
  HealthCheck: {
    type: 'object',
    description: 'Estado de la API. No incluye información sensible (ni URI de base de datos ni variables de entorno).',
    properties: {
      status: { type: 'string', enum: ['ok'], example: 'ok' },
      service: { type: 'string', example: 'shipnow-api' },
      environment: { type: 'string', enum: ['development', 'production', 'test'], example: 'production' },
      uptime: { type: 'integer', description: 'Segundos desde que arrancó el proceso.', example: 3600 },
      timestamp: dateTime(NOW),
      database: { type: 'string', enum: ['connected'], example: 'connected' },
    },
  },

  // ---------- Logger ----------
  LoggerTestResult: {
    type: 'object',
    properties: {
      nivelesEmitidos: { type: 'array', items: { type: 'string', enum: Object.values(LOG_LEVELS) }, example: Object.values(LOG_LEVELS) },
      nivelActivo: { type: 'string', enum: Object.values(LOG_LEVELS), example: LOG_LEVELS.DEBUG },
    },
  },
};
