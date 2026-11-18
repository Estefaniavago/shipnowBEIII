import { HTTP_STATUS } from '../constants/index.js';

// Diccionario único de errores: código -> status HTTP + mensaje por defecto.
export const ERROR_DICTIONARY = Object.freeze({
  // Validación general
  VALIDATION_ERROR: { status: HTTP_STATUS.BAD_REQUEST, message: 'Los datos enviados no son válidos' },
  MISSING_FIELDS: { status: HTTP_STATUS.BAD_REQUEST, message: 'Faltan campos obligatorios' },
  INVALID_ID: { status: HTTP_STATUS.BAD_REQUEST, message: 'El id enviado no tiene un formato válido' },
  INVALID_JSON: { status: HTTP_STATUS.BAD_REQUEST, message: 'El cuerpo de la petición no es un JSON válido' },
  NEGATIVE_VALUE: { status: HTTP_STATUS.BAD_REQUEST, message: 'El valor no puede ser negativo' },
  INVALID_STATUS: { status: HTTP_STATUS.BAD_REQUEST, message: 'El estado enviado no es válido' },
  INVALID_PRIORITY: { status: HTTP_STATUS.BAD_REQUEST, message: 'La prioridad enviada no es válida' },
  INVALID_ROLE: { status: HTTP_STATUS.BAD_REQUEST, message: 'El rol enviado no es válido' },

  // No encontrado
  USER_NOT_FOUND: { status: HTTP_STATUS.NOT_FOUND, message: 'Usuario no encontrado' },
  PRODUCT_NOT_FOUND: { status: HTTP_STATUS.NOT_FOUND, message: 'Producto no encontrado' },
  ORDER_NOT_FOUND: { status: HTTP_STATUS.NOT_FOUND, message: 'Pedido no encontrado' },
  DELIVERY_NOT_FOUND: { status: HTTP_STATUS.NOT_FOUND, message: 'Entrega no encontrada' },
  ROUTE_NOT_FOUND: { status: HTTP_STATUS.NOT_FOUND, message: 'Ruta no encontrada' },

  // Conflictos
  EMAIL_ALREADY_EXISTS: { status: HTTP_STATUS.CONFLICT, message: 'El email ya está registrado' },
  DELIVERY_ALREADY_EXISTS: { status: HTTP_STATUS.CONFLICT, message: 'El pedido ya tiene una entrega asociada' },
  DELIVERY_COURIER_REQUIRED: { status: HTTP_STATUS.CONFLICT, message: 'La entrega necesita un repartidor asignado para este estado' },
  DUPLICATE_KEY: { status: HTTP_STATUS.CONFLICT, message: 'Ya existe un registro con esos datos únicos' },

  // Mocks
  MOCK_QTY_INVALID: { status: HTTP_STATUS.BAD_REQUEST, message: 'qty debe ser un número entero mayor a 0' },
  MOCK_QTY_NEGATIVE: { status: HTTP_STATUS.BAD_REQUEST, message: 'qty no puede ser negativa' },
  MOCK_QTY_OUT_OF_RANGE: { status: HTTP_STATUS.BAD_REQUEST, message: 'qty supera el máximo permitido' },
  MOCK_TYPE_INVALID: { status: HTTP_STATUS.BAD_REQUEST, message: 'El type de mock no es válido' },
  MOCK_DEPENDENCY_MISSING: { status: HTTP_STATUS.CONFLICT, message: 'Faltan datos previos para generar este mock' },
  MOCK_SEED_FAILED: { status: HTTP_STATUS.INTERNAL_SERVER_ERROR, message: 'Falló la carga de datos de prueba en la base' },

  // Infraestructura
  DATABASE_ERROR: { status: HTTP_STATUS.SERVICE_UNAVAILABLE, message: 'Error al acceder a la base de datos' },
  INTERNAL_ERROR: { status: HTTP_STATUS.INTERNAL_SERVER_ERROR, message: 'Error interno del servidor' },
});

export const ERROR_CODES = Object.freeze(
  Object.fromEntries(Object.keys(ERROR_DICTIONARY).map((code) => [code, code]))
);
