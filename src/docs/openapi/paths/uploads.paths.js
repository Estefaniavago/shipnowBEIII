import { ERROR_CODES as E } from '../../../errors/index.js';
import { HTTP_STATUS as H, USER_DOCUMENT_TYPES, UPLOAD, ALLOWED_UPLOAD_MIME_TYPES } from '../../../constants/index.js';
import { TAGS } from '../info.js';
import { ref, paramRef, operation, success, DB_ERRORS } from '../helpers.js';

const accepted = Object.values(ALLOWED_UPLOAD_MIME_TYPES).join(', ');
const documentTypes = Object.values(USER_DOCUMENT_TYPES);

const fileField = {
  type: 'string',
  format: 'binary',
  description: `Archivo en el campo \`${UPLOAD.FIELD_NAME}\`. Tipos aceptados: ${accepted}. Tamaño máximo: 5 MB.`,
};

const multipart = (properties, required) => ({
  required: true,
  content: {
    'multipart/form-data': {
      schema: { type: 'object', required, properties },
    },
  },
});

const uploadErrors = [
  E.FILE_REQUIRED,
  E.FILE_TYPE_INVALID,
  E.FILE_TOO_LARGE,
  E.UPLOAD_FIELD_INVALID,
  E.INVALID_ID,
  E.FILE_SAVE_ERROR,
];

const created = success(H.CREATED, 'Archivo guardado y metadatos asociados a la entidad', ref('UploadResult'));

export const uploadsPaths = {
  '/api/uploads/users/{id}/documents': {
    post: operation({
      tag: TAGS.USERS,
      id: 'uploadUserDocument',
      summary: 'Subir documento de usuario',
      description: [
        `Recibe multipart/form-data. Campo de archivo: \`${UPLOAD.FIELD_NAME}\`. Campo adicional obligatorio: \`documentType\` (${documentTypes.join(', ')}).`,
        `Tipos aceptados: ${accepted}. Tamaño máximo: 5 MB.`,
        'IDENTITY y OTHER se guardan en `uploads/users/documents`. DRIVER_LICENSE se guarda en `uploads/users/licenses`.',
        'MongoDB guarda solo metadatos: nombre original, nombre generado, ruta, tipo, tamaño, tipo de documento y fecha de carga.',
      ].join(' '),
      parameters: [paramRef('IdPath')],
      requestBody: multipart({
        file: fileField,
        documentType: {
          type: 'string',
          enum: documentTypes,
          description: 'Tipo de documento. Obligatorio.',
        },
      }, ['file', 'documentType']),
      responses: created,
      errors: [...uploadErrors, E.DOCUMENT_TYPE_INVALID, E.USER_NOT_FOUND, ...DB_ERRORS],
      examplePath: '/api/uploads/users/6650a1f2c3d4e5f607182930/documents',
    }),
  },
  '/api/uploads/orders/{id}/receipts': {
    post: operation({
      tag: TAGS.ORDERS,
      id: 'uploadOrderReceipt',
      summary: 'Adjuntar comprobante a un pedido',
      description: [
        `Recibe multipart/form-data. Campo de archivo: \`${UPLOAD.FIELD_NAME}\`.`,
        `Tipos aceptados: ${accepted}. Tamaño máximo: 5 MB.`,
        'El archivo se guarda en `uploads/orders/receipts` y sus metadatos quedan en el pedido.',
      ].join(' '),
      parameters: [paramRef('IdPath')],
      requestBody: multipart({ file: fileField }, ['file']),
      responses: created,
      errors: [...uploadErrors, E.ORDER_NOT_FOUND, ...DB_ERRORS],
      examplePath: '/api/uploads/orders/6650a1f2c3d4e5f607182932/receipts',
    }),
  },
  '/api/uploads/deliveries/{id}/receipts': {
    post: operation({
      tag: TAGS.DELIVERIES,
      id: 'uploadDeliveryReceipt',
      summary: 'Adjuntar comprobante a una entrega',
      description: [
        `Recibe multipart/form-data. Campo de archivo: \`${UPLOAD.FIELD_NAME}\`.`,
        `Tipos aceptados: ${accepted}. Tamaño máximo: 5 MB.`,
        'El archivo se guarda en `uploads/deliveries/receipts` y sus metadatos quedan en la entrega.',
      ].join(' '),
      parameters: [paramRef('IdPath')],
      requestBody: multipart({ file: fileField }, ['file']),
      responses: created,
      errors: [...uploadErrors, E.DELIVERY_NOT_FOUND, ...DB_ERRORS],
      examplePath: '/api/uploads/deliveries/6650a1f2c3d4e5f607182933/receipts',
    }),
  },
};
