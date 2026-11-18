import { MOCK, MOCK_TYPES } from '../../constants/index.js';

export const parameters = {
  IdPath: {
    name: 'id',
    in: 'path',
    required: true,
    description: 'Id del recurso (ObjectId de 24 caracteres hexadecimales).',
    schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
    example: '6650a1f2c3d4e5f607182930',
  },
  Page: {
    name: 'page',
    in: 'query',
    required: false,
    description: 'Número de página (entero ≥ 1). Por defecto 1. Un valor inválido responde `400 VALIDATION_ERROR`.',
    schema: { type: 'integer' },
    example: 1,
  },
  Limit: {
    name: 'limit',
    in: 'query',
    required: false,
    description: 'Resultados por página (entero entre 1 y 100). Por defecto 20. Un valor inválido responde `400 VALIDATION_ERROR`.',
    schema: { type: 'integer' },
    example: 20,
  },
  IncludeOutOfStock: {
    name: 'includeOutOfStock',
    in: 'query',
    required: false,
    description: 'Con `true` también lista productos `OUT_OF_STOCK`. Por defecto se excluyen. Los `DISCONTINUED` nunca se listan.',
    schema: { type: 'boolean', default: false },
  },
  MockQty: {
    name: 'qty',
    in: 'query',
    required: false,
    description: `Cantidad de datos a generar: entero entre 1 y ${MOCK.MAX_QTY} (por defecto ${MOCK.DEFAULT_QTY}). `
      + 'Valores no numéricos o 0 → `MOCK_QTY_INVALID`; negativos → `MOCK_QTY_NEGATIVE`; mayores al máximo → `MOCK_QTY_OUT_OF_RANGE`.',
    schema: { type: 'integer', default: MOCK.DEFAULT_QTY },
    example: 2,
  },
  MockSeedType: {
    name: 'type',
    in: 'query',
    required: false,
    description: 'Qué se inserta. `orders` necesita usuarios existentes; `deliveries` necesita pedidos sin entrega y repartidores; `all` inserta todo el conjunto ya relacionado.',
    schema: { type: 'string', enum: Object.values(MOCK_TYPES), default: MOCK_TYPES.USERS },
  },
};
