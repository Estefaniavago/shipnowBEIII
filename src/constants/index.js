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
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
});
