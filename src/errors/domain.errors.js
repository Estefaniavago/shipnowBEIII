import { AppError } from './app.error.js';
import { ERROR_CODES } from './error.dictionary.js';

// ---------- Validación ----------
export class RequestValidationError extends AppError {
  constructor(details = []) {
    super(ERROR_CODES.VALIDATION_ERROR, { details });
  }
}

export class MissingFieldsError extends AppError {
  constructor(fields) {
    super(ERROR_CODES.MISSING_FIELDS, {
      message: `Faltan campos obligatorios: ${fields.join(', ')}`,
      details: fields.map((field) => ({ field, message: 'es obligatorio' })),
    });
  }
}

export class InvalidIdError extends AppError {
  constructor(id) {
    super(ERROR_CODES.INVALID_ID, { details: [{ field: 'id', value: String(id) }] });
  }
}

export class NegativeValueError extends AppError {
  constructor(field, value) {
    super(ERROR_CODES.NEGATIVE_VALUE, {
      message: `${field} no puede ser negativo`,
      details: [{ field, value }],
    });
  }
}

export class InvalidStatusError extends AppError {
  constructor(status, allowed) {
    super(ERROR_CODES.INVALID_STATUS, {
      message: `Estado inválido: ${status}. Permitidos: ${allowed.join(', ')}`,
      details: [{ field: 'status', value: status, allowed }],
    });
  }
}

export class InvalidRoleError extends AppError {
  constructor(role, allowed) {
    super(ERROR_CODES.INVALID_ROLE, {
      message: `Rol inválido: ${role}. Permitidos: ${allowed.join(', ')}`,
      details: [{ field: 'role', value: role, allowed }],
    });
  }
}

export class InvalidPriorityError extends AppError {
  constructor(priority, allowed) {
    super(ERROR_CODES.INVALID_PRIORITY, {
      message: `Prioridad inválida: ${priority}. Permitidas: ${allowed.join(', ')}`,
      details: [{ field: 'priority', value: priority, allowed }],
    });
  }
}

// ---------- No encontrado ----------
export class UserNotFoundError extends AppError {
  constructor(id) {
    super(ERROR_CODES.USER_NOT_FOUND, { details: [{ field: 'id', value: String(id) }] });
  }
}

export class ProductNotFoundError extends AppError {
  constructor(id) {
    super(ERROR_CODES.PRODUCT_NOT_FOUND, { details: [{ field: 'id', value: String(id) }] });
  }
}

export class OrderNotFoundError extends AppError {
  constructor(id) {
    super(ERROR_CODES.ORDER_NOT_FOUND, { details: [{ field: 'id', value: String(id) }] });
  }
}

export class DeliveryNotFoundError extends AppError {
  constructor(id) {
    super(ERROR_CODES.DELIVERY_NOT_FOUND, { details: [{ field: 'id', value: String(id) }] });
  }
}

export class RouteNotFoundError extends AppError {
  constructor(method, path) {
    super(ERROR_CODES.ROUTE_NOT_FOUND, {
      message: `No existe la ruta ${method} ${path}`,
      details: [{ method, path }],
    });
  }
}

// ---------- Conflictos ----------
export class EmailAlreadyExistsError extends AppError {
  constructor(email) {
    super(ERROR_CODES.EMAIL_ALREADY_EXISTS, { details: [{ field: 'email', value: email }] });
  }
}

export class DeliveryAlreadyExistsError extends AppError {
  constructor(orderId) {
    super(ERROR_CODES.DELIVERY_ALREADY_EXISTS, { details: [{ field: 'order', value: String(orderId) }] });
  }
}

export class DeliveryCourierRequiredError extends AppError {
  constructor(status) {
    super(ERROR_CODES.DELIVERY_COURIER_REQUIRED, {
      message: `Una entrega ${status} necesita un repartidor asignado`,
      details: [{ field: 'courier', status }],
    });
  }
}

// ---------- Archivos ----------
const toMb = (bytes) => Number((bytes / 1024 / 1024).toFixed(2));

export class FileRequiredError extends AppError {
  constructor(field) {
    super(ERROR_CODES.FILE_REQUIRED, {
      message: `Debe enviar un archivo en el campo "${field}" (multipart/form-data)`,
      details: [{ field }],
    });
  }
}

export class UnexpectedFileFieldError extends AppError {
  constructor(expected, received) {
    const message = received === expected
      ? `Solo se admite un archivo en el campo "${expected}"`
      : `El archivo debe enviarse en el campo "${expected}" (se recibió "${received}")`;
    super(ERROR_CODES.UNEXPECTED_FILE_FIELD, { message, details: [{ expected, received }] });
  }
}

export class DocumentTypeInvalidError extends AppError {
  constructor(type, allowed) {
    super(ERROR_CODES.DOCUMENT_TYPE_INVALID, {
      message: `Tipo de documento inválido: ${type}. Permitidos: ${allowed.join(', ')}`,
      details: [{ field: 'documentType', value: String(type), allowed }],
    });
  }
}

export class FileTypeInvalidError extends AppError {
  constructor(mimeType, allowed) {
    super(ERROR_CODES.FILE_TYPE_INVALID, {
      message: `Tipo de archivo no permitido: ${mimeType}. Permitidos: ${allowed.join(', ')}`,
      details: [{ mimeType: String(mimeType), allowed }],
    });
  }
}

export class FileTooLargeError extends AppError {
  constructor(maxBytes) {
    super(ERROR_CODES.FILE_TOO_LARGE, {
      message: `El archivo supera el tamaño máximo permitido de ${toMb(maxBytes)} MB`,
      details: [{ maxBytes, maxMB: toMb(maxBytes) }],
    });
  }
}

export class FileSaveError extends AppError {
  constructor(relativePath, cause) {
    super(ERROR_CODES.FILE_SAVE_FAILED, { details: [], cause });
    this.relativePath = relativePath; // solo para el log, no se envía al cliente
  }
}

// ---------- Mocks ----------
const QTY_REASON_TO_CODE = Object.freeze({
  invalid: ERROR_CODES.MOCK_QTY_INVALID,
  negative: ERROR_CODES.MOCK_QTY_NEGATIVE,
  outOfRange: ERROR_CODES.MOCK_QTY_OUT_OF_RANGE,
});
export const QTY_REASONS = Object.freeze(
  Object.fromEntries(Object.keys(QTY_REASON_TO_CODE).map((k) => [k, k]))
);

export class InvalidMockQuantityError extends AppError {
  constructor(reason, value, { max } = {}) {
    super(QTY_REASON_TO_CODE[reason], {
      message: reason === QTY_REASONS.outOfRange
        ? `qty no puede ser mayor a ${max}`
        : reason === QTY_REASONS.negative
          ? 'qty no puede ser negativa'
          : `qty debe ser un entero mayor a 0 (recibido: ${String(value)})`,
      details: [{ field: 'qty', value: String(value), ...(max ? { max } : {}) }],
    });
  }
}

export class InvalidMockTypeError extends AppError {
  constructor(type, allowed) {
    super(ERROR_CODES.MOCK_TYPE_INVALID, {
      message: `type inválido: ${type}. Permitidos: ${allowed.join(', ')}`,
      details: [{ field: 'type', value: String(type), allowed }],
    });
  }
}

export class MockDependencyMissingError extends AppError {
  constructor(missing, hint) {
    super(ERROR_CODES.MOCK_DEPENDENCY_MISSING, {
      message: `No hay ${missing} en la base. ${hint}`,
      details: [{ missing, hint }],
    });
  }
}

export class MockSeedError extends AppError {
  // inserted: lo que ya se alcanzó a insertar antes de fallar (para poder limpiar).
  constructor(collection, inserted, cause) {
    super(ERROR_CODES.MOCK_SEED_FAILED, {
      message: `Falló la carga de datos de prueba en la colección ${collection}`,
      details: [{ collection, insertadosAntesDelError: inserted }],
      cause,
    });
  }
}
