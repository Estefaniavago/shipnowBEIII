import { ERROR_CODES as E } from '../../../errors/index.js';
import { HTTP_STATUS as H } from '../../../constants/index.js';
import { TAGS } from '../info.js';
import { ref, paramRef, operation, success, noContent, jsonBody, DB_ERRORS, BODY_ERRORS } from '../helpers.js';

const tag = TAGS.PRODUCTS;
const ID_PATH = '/api/products/6650a1f2c3d4e5f607182934';

export const productsPaths = {
  '/api/products': {
    get: operation({
      tag, id: 'listProducts', summary: 'Listar productos',
      description: 'Lista productos paginados. Por defecto excluye los `OUT_OF_STOCK`; los `DISCONTINUED` nunca se listan.',
      parameters: [paramRef('IncludeOutOfStock'), paramRef('Page'), paramRef('Limit')],
      responses: success(H.OK, 'Lista de productos', { type: 'array', items: ref('Product') }),
      errors: [E.VALIDATION_ERROR, ...DB_ERRORS], examplePath: '/api/products?page=0',
    }),
    post: operation({
      tag, id: 'createProduct', summary: 'Crear producto',
      description: 'Crea un producto. El `status` se calcula solo: `AVAILABLE` si hay stock, `OUT_OF_STOCK` si no.',
      requestBody: jsonBody('ProductCreate', { name: 'Caja mediana', price: 2500, stock: 40 }),
      responses: success(H.CREATED, 'Producto creado', ref('Product')),
      errors: [E.MISSING_FIELDS, E.VALIDATION_ERROR, E.NEGATIVE_VALUE, ...BODY_ERRORS, ...DB_ERRORS],
      examplePath: '/api/products',
    }),
  },
  '/api/products/{id}': {
    get: operation({
      tag, id: 'getProductById', summary: 'Obtener un producto por id',
      description: 'Devuelve un producto.',
      parameters: [paramRef('IdPath')],
      responses: success(H.OK, 'Producto encontrado', ref('Product')),
      errors: [E.INVALID_ID, E.PRODUCT_NOT_FOUND, ...DB_ERRORS], examplePath: ID_PATH,
    }),
    put: operation({
      tag, id: 'updateProduct', summary: 'Actualizar un producto',
      description: 'Actualiza los campos enviados. Si cambia el stock y no se envía `status`, el estado se recalcula (un producto `DISCONTINUED` mantiene su estado).',
      parameters: [paramRef('IdPath')],
      requestBody: jsonBody('ProductUpdate', { stock: 0 }),
      responses: success(H.OK, 'Producto actualizado', ref('Product')),
      errors: [E.INVALID_ID, E.VALIDATION_ERROR, E.NEGATIVE_VALUE, E.INVALID_STATUS, ...BODY_ERRORS, E.PRODUCT_NOT_FOUND, ...DB_ERRORS],
      examplePath: ID_PATH,
    }),
    delete: operation({
      tag, id: 'deleteProduct', summary: 'Eliminar un producto',
      description: 'Elimina el producto. Responde `204` sin cuerpo.',
      parameters: [paramRef('IdPath')],
      responses: noContent('Producto eliminado'),
      errors: [E.INVALID_ID, E.PRODUCT_NOT_FOUND, ...DB_ERRORS], examplePath: ID_PATH,
    }),
  },
};
