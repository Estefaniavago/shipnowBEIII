import { ERROR_CODES as E } from '../../../errors/index.js';
import {
  HTTP_STATUS as H, DOCUMENT_TYPES, UPLOAD_FIELDS, UPLOAD_FOLDERS, ALLOWED_FILE_TYPES,
} from '../../../constants/index.js';
import { TAGS } from '../info.js';
import { ref, paramRef, operation, success, multipartBody, DB_ERRORS } from '../helpers.js';

const ALLOWED = Object.keys(ALLOWED_FILE_TYPES).join(', ');

// Endpoints de carga de archivos (multipart/form-data).
export const buildDocumentsPaths = ({ maxFileSizeMb = 5 } = {}) => ({
  '/api/users/{id}/documents': {
    post: operation({
      tag: TAGS.USERS, id: 'uploadUserDocument', summary: 'Subir un documento de un usuario',
      description: 'Sube un documento (DNI, licencia, comprobante de domicilio, etc.) y lo asocia al usuario. '
        + 'El archivo se guarda en el servidor y en la base solo se registran sus **metadatos** '
        + '(nombre original, nombre generado, ruta, tipo, tamaño, tipo de documento y fecha de carga). '
        + `\n\n**Formato:** \`multipart/form-data\`. **Campo del archivo:** \`${UPLOAD_FIELDS.USER_DOCUMENT}\`. `
        + `**Campo adicional (opcional):** \`documentType\` (${Object.values(DOCUMENT_TYPES).join(', ')}; por defecto \`${DOCUMENT_TYPES.OTHER}\`). `
        + `**Tipos de archivo aceptados:** ${ALLOWED}. **Tamaño máximo:** ${maxFileSizeMb} MB. `
        + 'El tipo se verifica por el contenido real del archivo, no solo por lo que declara el cliente. '
        + `Los archivos \`${DOCUMENT_TYPES.DRIVER_LICENSE}\` se guardan en \`${UPLOAD_FOLDERS.LICENSES}/\` y el resto en \`${UPLOAD_FOLDERS.USER_DOCUMENTS}/\`. `
        + 'Devuelve el usuario actualizado con su lista `documents`.',
      parameters: [paramRef('IdPath')],
      requestBody: multipartBody('UserDocumentUpload', 'Archivo y tipo de documento.'),
      responses: success(H.CREATED, 'Documento cargado. Devuelve el usuario actualizado', ref('User')),
      errors: [
        E.INVALID_ID, E.FILE_REQUIRED, E.UNEXPECTED_FILE_FIELD, E.DOCUMENT_TYPE_INVALID, E.VALIDATION_ERROR,
        E.USER_NOT_FOUND, E.FILE_TYPE_INVALID, E.FILE_TOO_LARGE, E.FILE_SAVE_FAILED, ...DB_ERRORS,
      ],
      examplePath: '/api/users/6650a1f2c3d4e5f607182930/documents',
    }),
  },
  '/api/deliveries/{id}/receipts': {
    post: operation({
      tag: TAGS.DELIVERIES, id: 'uploadDeliveryReceipt', summary: 'Subir un comprobante de una entrega',
      description: 'Sube el comprobante de una entrega (por ejemplo, la foto de la firma o del remito) y lo asocia a ella. '
        + 'Una entrega puede tener varios comprobantes. En la base solo se guardan los **metadatos**. '
        + `\n\n**Formato:** \`multipart/form-data\`. **Campo del archivo:** \`${UPLOAD_FIELDS.DELIVERY_RECEIPT}\` (no hay campos adicionales). `
        + `**Tipos de archivo aceptados:** ${ALLOWED}. **Tamaño máximo:** ${maxFileSizeMb} MB. `
        + `Se guarda en \`${UPLOAD_FOLDERS.DELIVERY_RECEIPTS}/\`. Devuelve la entrega actualizada con su lista \`receipts\`.`,
      parameters: [paramRef('IdPath')],
      requestBody: multipartBody('DeliveryReceiptUpload', 'Archivo del comprobante.'),
      responses: success(H.CREATED, 'Comprobante cargado. Devuelve la entrega actualizada', ref('Delivery')),
      errors: [
        E.INVALID_ID, E.FILE_REQUIRED, E.UNEXPECTED_FILE_FIELD, E.VALIDATION_ERROR,
        E.DELIVERY_NOT_FOUND, E.FILE_TYPE_INVALID, E.FILE_TOO_LARGE, E.FILE_SAVE_FAILED, ...DB_ERRORS,
      ],
      examplePath: '/api/deliveries/6650a1f2c3d4e5f607182933/receipts',
    }),
  },
});
