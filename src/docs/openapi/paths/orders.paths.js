import { ERROR_CODES as E } from '../../../errors/index.js';
import { HTTP_STATUS as H, ORDER_PRIORITY, ORDER_STATUS } from '../../../constants/index.js';
import { TAGS } from '../info.js';
import { ref, paramRef, operation, success, jsonBody, DB_ERRORS, BODY_ERRORS } from '../helpers.js';

const tag = TAGS.ORDERS;
const ID_PATH = '/api/orders/6650a1f2c3d4e5f607182932';

export const ordersPaths = {
  '/api/orders': {
    get: operation({
      tag, id: 'listOrders', summary: 'Listar pedidos',
      description: 'Devuelve los pedidos paginados, del más nuevo al más antiguo. Se puede filtrar por `status`, `priority` y `customer`.',
      parameters: [paramRef('FilterOrderStatus'), paramRef('FilterPriority'), paramRef('FilterCustomer'), paramRef('Page'), paramRef('Limit')],
      responses: success(H.OK, 'Lista de pedidos', { type: 'array', items: ref('Order') }),
      errors: [E.VALIDATION_ERROR, E.INVALID_STATUS, E.INVALID_PRIORITY, E.INVALID_ID, ...DB_ERRORS], examplePath: '/api/orders?page=0',
    }),
    post: operation({
      tag, id: 'createOrder', summary: 'Crear pedido',
      description: 'Crea un pedido para un usuario existente. El `total` se calcula (suma de cantidad × precio unitario), el estado inicial es `PENDING` y, si no se envía `priority`, se usa `NORMAL`.',
      requestBody: jsonBody('OrderCreate', {
        customer: '6650a1f2c3d4e5f607182930',
        items: [{ name: 'Caja grande', quantity: 2, unitPrice: 4000 }],
        shippingAddress: { street: 'Av. Argentina 1200', city: 'Neuquén' },
        priority: ORDER_PRIORITY.HIGH,
      }),
      responses: success(H.CREATED, 'Pedido creado', ref('Order')),
      errors: [
        E.MISSING_FIELDS, E.INVALID_ID, E.VALIDATION_ERROR, E.NEGATIVE_VALUE, E.INVALID_PRIORITY, ...BODY_ERRORS,
        E.USER_NOT_FOUND, ...DB_ERRORS,
      ],
      examplePath: '/api/orders',
    }),
  },
  '/api/orders/{id}': {
    get: operation({
      tag, id: 'getOrderById', summary: 'Obtener un pedido por id',
      description: 'Devuelve un pedido.',
      parameters: [paramRef('IdPath')],
      responses: success(H.OK, 'Pedido encontrado', ref('Order')),
      errors: [E.INVALID_ID, E.ORDER_NOT_FOUND, ...DB_ERRORS], examplePath: ID_PATH,
    }),
  },
  '/api/orders/{id}/status': {
    patch: operation({
      tag, id: 'updateOrderStatus', summary: 'Cambiar el estado de un pedido',
      description: `Actualiza el estado del pedido. Valores permitidos: ${Object.values(ORDER_STATUS).join(', ')}. Cualquier otro valor responde \`400 INVALID_STATUS\`.`,
      parameters: [paramRef('IdPath')],
      requestBody: jsonBody('OrderStatusUpdate', { status: ORDER_STATUS.CONFIRMED }),
      responses: success(H.OK, 'Pedido con el estado actualizado', ref('Order')),
      errors: [E.INVALID_ID, E.MISSING_FIELDS, E.INVALID_STATUS, ...BODY_ERRORS, E.ORDER_NOT_FOUND, ...DB_ERRORS],
      examplePath: `${ID_PATH}/status`,
    }),
  },
};
