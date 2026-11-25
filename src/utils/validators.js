import {
  InvalidIdError,
  NegativeValueError,
  RequestValidationError,
} from '../errors/index.js';
import { PAGINATION } from '../constants/index.js';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export function assertValidId(id) {
  if (typeof id !== 'string' || !OBJECT_ID_REGEX.test(id)) throw new InvalidIdError(id);
}

export function findMissingFields(data = {}, fields) {
  return fields.filter((f) => data[f] === undefined || data[f] === null || data[f] === '');
}

export function toNumber(field, value) {
  const number = Number(value);
  if (value === null || value === '' || !Number.isFinite(number)) {
    throw new RequestValidationError([{ field, message: 'debe ser un número' }]);
  }
  return number;
}

export function assertNonNegative(field, number) {
  if (number < 0) throw new NegativeValueError(field, number);
}

function toPositiveInt(field, value, max) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || (max && number > max)) {
    const limit = max ? ` y como máximo ${max}` : '';
    throw new RequestValidationError([{ field, message: `debe ser un entero de al menos 1${limit}` }]);
  }
  return number;
}

// Devuelve solo lo que vino en la query; el Repository aplica sus valores por defecto.
export function parsePagination({ page, limit } = {}) {
  const result = {};
  if (page !== undefined) result.page = toPositiveInt('page', page);
  if (limit !== undefined) result.limit = toPositiveInt('limit', limit, PAGINATION.MAX_LIMIT);
  return result;
}
