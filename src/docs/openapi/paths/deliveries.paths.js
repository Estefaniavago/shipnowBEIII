import { ERROR_CODES as E } from '../../../errors/index.js';
import { HTTP_STATUS as H, DELIVERY_STATUS } from '../../../constants/index.js';
import { TAGS } from '../info.js';
import { ref, paramRef, operation, success, jsonBody, DB_ERRORS, BODY_ERRORS } from '../helpers.js';

const tag = TAGS.DELIVERIES;
const ID_PATH = '/api/deliveries/6650a1f2c3d4e5f607182933';

export const deliveriesPaths = {
  '/api/deliveries': {
    get: operation({
      tag, id: 'listDeliveries', summary: 'Listar entregas',
      description: 'Devuelve las entregas paginadas, de la más nueva a la más antigua.',
      parameters: [paramRef('Page'), paramRef('Limit')],
      responses: success(H.OK, 'Lista de entregas', { type: 'array', items: ref('Delivery') }),
      errors: [E.VALIDATION_ERROR, ...DB_ERRORS], examplePath: '/api/deliveries?page=0',
    }),
    post: operation({
      tag, id: 'createDelivery', summary: 'Crear entrega para un pedido',
      description: 'Crea la entrega de un pedido existente (un pedido admite una sola entrega). Nace en estado `PENDING`, con código de seguimiento generado. El repartidor es opcional, pero si se envía debe ser un usuario con rol `COURIER`.',
      requestBody: jsonBody('DeliveryCreate', {
        order: '6650a1f2c3d4e5f607182932',
        courier: '6650a1f2c3d4e5f607182931',
      }),
      responses: success(H.CREATED, 'Entrega creada', ref('Delivery')),
      errors: [
        E.MISSING_FIELDS, E.INVALID_ID, E.INVALID_ROLE, E.VALIDATION_ERROR, ...BODY_ERRORS,
        E.ORDER_NOT_FOUND, E.USER_NOT_FOUND, E.DELIVERY_ALREADY_EXISTS, ...DB_ERRORS,
      ],
      examplePath: '/api/deliveries',
    }),
  },
  '/api/deliveries/{id}': {
    get: operation({
      tag, id: 'getDeliveryById', summary: 'Obtener una entrega por id',
      description: 'Devuelve una entrega.',
      parameters: [paramRef('IdPath')],
      responses: success(H.OK, 'Entrega encontrada', ref('Delivery')),
      errors: [E.INVALID_ID, E.DELIVERY_NOT_FOUND, ...DB_ERRORS], examplePath: ID_PATH,
    }),
    patch: operation({
      tag, id: 'updateDelivery', summary: 'Cambiar estado y/o asignar repartidor',
      description: `Envía \`status\` y/o \`courier\` (al menos uno). Estados permitidos: ${Object.values(DELIVERY_STATUS).join(', ')}. `
        + 'Los estados `IN_TRANSIT` y `DELIVERED` requieren un repartidor asignado (`409 DELIVERY_COURIER_REQUIRED`). Al pasar a `DELIVERED` se completa `deliveredAt`.',
      parameters: [paramRef('IdPath')],
      requestBody: jsonBody('DeliveryUpdate', { status: DELIVERY_STATUS.IN_TRANSIT, courier: '6650a1f2c3d4e5f607182931' }),
      responses: success(H.OK, 'Entrega actualizada', ref('Delivery')),
      errors: [
        E.INVALID_ID, E.INVALID_STATUS, E.INVALID_ROLE, E.VALIDATION_ERROR, ...BODY_ERRORS,
        E.DELIVERY_NOT_FOUND, E.USER_NOT_FOUND, E.DELIVERY_COURIER_REQUIRED, ...DB_ERRORS,
      ],
      examplePath: ID_PATH,
    }),
  },
};
