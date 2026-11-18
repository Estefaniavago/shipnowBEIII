import { ERROR_CODES as E } from '../../../errors/index.js';
import { HTTP_STATUS as H, MOCK, MOCK_TYPES } from '../../../constants/index.js';
import { TAGS } from '../info.js';
import { ref, paramRef, operation, successRaw, DB_ERRORS } from '../helpers.js';

const tag = TAGS.MOCKS;
const QTY_ERRORS = [E.MOCK_QTY_INVALID, E.MOCK_QTY_NEGATIVE, E.MOCK_QTY_OUT_OF_RANGE];
const NOT_SAVED = 'Los datos **no se guardan** en la base. La respuesta es el array directamente (sin `status`/`payload`).';

const mockList = (id, summary, description, schemaName, path) =>
  operation({
    tag, id, summary, description: `${description} ${NOT_SAVED}`,
    parameters: [paramRef('MockQty')],
    responses: successRaw(H.OK, 'Datos simulados', { type: 'array', items: ref(schemaName) }),
    errors: [...QTY_ERRORS, E.INTERNAL_ERROR], examplePath: `${path}?qty=-5`,
  });

export const mocksPaths = {
  '/api/mocks/users': {
    get: mockList('mockUsers', 'Usuarios simulados (clientes)', 'Genera clientes con rol `USER`.', 'User', '/api/mocks/users'),
  },
  '/api/mocks/couriers': {
    get: mockList('mockCouriers', 'Repartidores simulados', 'Genera usuarios con rol `COURIER`.', 'User', '/api/mocks/couriers'),
  },
  '/api/mocks/orders': {
    get: mockList('mockOrders', 'Pedidos simulados', 'Genera pedidos con estado y prioridad válidos, asociados a un cliente simulado.', 'Order', '/api/mocks/orders'),
  },
  '/api/mocks/deliveries': {
    get: mockList('mockDeliveries', 'Entregas simuladas', 'Genera entregas asociadas a un pedido y, cuando el estado lo requiere, a un repartidor.', 'Delivery', '/api/mocks/deliveries'),
  },
  '/api/mocks/dataset': {
    get: operation({
      tag, id: 'mockDataset', summary: 'Conjunto completo y coherente de datos simulados',
      description: `Devuelve usuarios, repartidores, pedidos y entregas relacionados entre sí (los ids coinciden). ${NOT_SAVED}`,
      parameters: [paramRef('MockQty')],
      responses: successRaw(H.OK, 'Dataset simulado', ref('MockDataset')),
      errors: [...QTY_ERRORS, E.INTERNAL_ERROR], examplePath: '/api/mocks/dataset?qty=500',
    }),
  },
  '/api/mocks/seed': {
    post: operation({
      tag, id: 'seedMocks', summary: 'Insertar datos de prueba en MongoDB',
      description: `**No requiere body**: la cantidad y el tipo se envían por query (\`qty\` y \`type\`). Se inserta como máximo ${MOCK.MAX_QTY} documentos por llamada. `
        + 'Los datos quedan marcados con `isMock: true` y los usuarios se guardan con el password `Test1234` (hasheado). '
        + `Orden recomendado: \`type=${MOCK_TYPES.USERS}\` y \`${MOCK_TYPES.COURIERS}\` → \`${MOCK_TYPES.ORDERS}\` → \`${MOCK_TYPES.DELIVERIES}\`, o directamente \`type=${MOCK_TYPES.ALL}\`.`,
      parameters: [paramRef('MockQty'), paramRef('MockSeedType')],
      responses: successRaw(H.CREATED, 'Datos insertados', ref('MockSeedResult')),
      errors: [
        ...QTY_ERRORS, E.MOCK_TYPE_INVALID, E.MOCK_DEPENDENCY_MISSING,
        E.MOCK_SEED_FAILED, ...DB_ERRORS,
      ],
      examplePath: '/api/mocks/seed?qty=10&type=orders',
    }),
    delete: operation({
      tag, id: 'clearMocks', summary: 'Eliminar los datos de prueba',
      description: 'Borra solo los documentos marcados con `isMock: true` (entregas, pedidos y usuarios). No toca datos reales.',
      responses: successRaw(H.OK, 'Datos de prueba eliminados', ref('MockClearResult')),
      errors: [...DB_ERRORS], examplePath: '/api/mocks/seed',
    }),
  },
};
