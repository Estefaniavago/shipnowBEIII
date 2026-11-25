import assert from 'node:assert/strict';
import { normalizeError, ERROR_CODES, ERROR_DICTIONARY } from '../../src/errors/index.js';
import { BODY_LIMIT } from '../../src/constants/index.js';

describe('errors: body demasiado grande', () => {
  it('entity.too.large (body-parser) => PAYLOAD_TOO_LARGE 413 con mensaje del diccionario', () => {
    const cause = Object.assign(new Error('request entity too large'), { type: 'entity.too.large', status: 413 });
    const error = normalizeError(cause);
    assert.equal(error.code, ERROR_CODES.PAYLOAD_TOO_LARGE);
    assert.equal(error.statusCode, 413);
    assert.equal(error.message, ERROR_DICTIONARY.PAYLOAD_TOO_LARGE.message);
    assert.equal(error.cause, cause);
  });

  it('el límite del body JSON es chico y explícito', () => {
    assert.equal(BODY_LIMIT, '100kb');
  });
});
