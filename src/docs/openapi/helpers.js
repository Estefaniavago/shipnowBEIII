import { ERROR_DICTIONARY, ERROR_CODES } from '../../errors/index.js';
import { HTTP_STATUS } from '../../constants/index.js';

export const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
export const paramRef = (name) => ({ $ref: `#/components/parameters/${name}` });

const EXAMPLE_TIMESTAMP = '2026-11-17T15:30:00.000Z';
const STATUS_TITLES = Object.freeze({
  [HTTP_STATUS.BAD_REQUEST]: 'Solicitud inválida',
  [HTTP_STATUS.NOT_FOUND]: 'Recurso no encontrado',
  [HTTP_STATUS.CONFLICT]: 'Conflicto con el estado actual de los datos',
  [HTTP_STATUS.INTERNAL_SERVER_ERROR]: 'Error interno del servidor',
  [HTTP_STATUS.SERVICE_UNAVAILABLE]: 'Base de datos no disponible',
});

// Grupos de errores que se repiten en muchos endpoints.
export const DB_ERRORS = Object.freeze([ERROR_CODES.DATABASE_ERROR, ERROR_CODES.INTERNAL_ERROR]);
export const BODY_ERRORS = Object.freeze([ERROR_CODES.INVALID_JSON]);

/**
 * Arma las respuestas de error a partir del diccionario REAL de errores:
 * el status y el mensaje de cada ejemplo salen de `ERROR_DICTIONARY`, así la
 * documentación no puede contradecir a la API.
 */
export function errorResponses(codes, examplePath = '/api/ejemplo') {
  const byStatus = {};
  for (const code of codes) {
    const definition = ERROR_DICTIONARY[code];
    if (!definition) throw new Error(`Código de error inexistente en el diccionario: ${code}`);
    (byStatus[definition.status] ??= []).push(code);
  }
  return Object.fromEntries(
    Object.entries(byStatus).map(([status, list]) => [
      status,
      {
        description: `${STATUS_TITLES[status] ?? 'Error'}. Códigos posibles: ${list.join(', ')}.`,
        content: {
          'application/json': {
            schema: ref('ErrorResponse'),
            examples: Object.fromEntries(
              list.map((code) => [
                code,
                {
                  summary: code,
                  value: {
                    status: 'error',
                    code,
                    message: ERROR_DICTIONARY[code].message,
                    details: [],
                    path: examplePath,
                    timestamp: EXAMPLE_TIMESTAMP,
                  },
                },
              ])
            ),
          },
        },
      },
    ])
  );
}

// Respuesta exitosa con el formato { status: "success", payload }.
export const success = (status, description, payloadSchema) => ({
  [status]: {
    description,
    content: {
      'application/json': {
        schema: {
          allOf: [ref('SuccessResponse'), { type: 'object', properties: { payload: payloadSchema } }],
        },
      },
    },
  },
});

// Respuesta exitosa sin envoltorio (la usan los endpoints de mocks).
export const successRaw = (status, description, schema) => ({
  [status]: { description, content: { 'application/json': { schema } } },
});

export const noContent = (description) => ({ [HTTP_STATUS.NO_CONTENT]: { description } });

export const jsonBody = (schemaName, example, description) => ({
  required: true,
  description,
  content: { 'application/json': { schema: ref(schemaName), ...(example ? { example } : {}) } },
});

export function operation({
  tag, id, summary, description, parameters, requestBody, responses, errors = [], examplePath,
}) {
  const op = {
    tags: [tag],
    operationId: id,
    summary,
    description,
    parameters,
    requestBody,
    responses: { ...responses, ...errorResponses(errors, examplePath) },
  };
  return Object.fromEntries(Object.entries(op).filter(([, value]) => value !== undefined));
}
