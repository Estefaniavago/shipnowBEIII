import assert from 'node:assert/strict';
import {
  AppError,
  ERROR_DICTIONARY,
  ERROR_CODES,
  normalizeError,
  UserNotFoundError,
  OrderNotFoundError,
  ProductNotFoundError,
  InvalidStatusError,
  InvalidRoleError,
  EmailAlreadyExistsError,
  InvalidMockQuantityError,
  QTY_REASONS,
  MockSeedError,
} from '../../src/errors/index.js';

describe('errors', () => {
  it('diccionario: cada código tiene status numérico y mensaje, y está congelado', () => {
    assert.ok(Object.isFrozen(ERROR_DICTIONARY));
    for (const [code, def] of Object.entries(ERROR_DICTIONARY)) {
      assert.ok(Number.isInteger(def.status) && def.status >= 400, code);
      assert.ok(typeof def.message === 'string' && def.message.length > 0, code);
      assert.equal(ERROR_CODES[code], code);
    }
  });

  it('AppError: toma status y mensaje del diccionario y rechaza códigos desconocidos', () => {
    const err = new AppError(ERROR_CODES.USER_NOT_FOUND);
    assert.equal(err.statusCode, 404);
    assert.equal(err.message, ERROR_DICTIONARY.USER_NOT_FOUND.message);
    assert.deepEqual(err.details, []);
    assert.throws(() => new AppError('NO_EXISTE'));
  });

  it('errores de dominio: código, status y detalle', () => {
    const id = 'a'.repeat(24);
    assert.deepEqual(
      [new UserNotFoundError(id), new OrderNotFoundError(id), new ProductNotFoundError(id)].map((e) => [e.code, e.statusCode]),
      [
        [ERROR_CODES.USER_NOT_FOUND, 404],
        [ERROR_CODES.ORDER_NOT_FOUND, 404],
        [ERROR_CODES.PRODUCT_NOT_FOUND, 404],
      ]
    );
    assert.deepEqual(new UserNotFoundError(id).details, [{ field: 'id', value: id }]);
    assert.equal(new InvalidStatusError('X', ['A', 'B']).code, ERROR_CODES.INVALID_STATUS);
    assert.equal(new InvalidRoleError('X', ['A']).code, ERROR_CODES.INVALID_ROLE);
    assert.equal(new EmailAlreadyExistsError('a@b.c').statusCode, 409);
    assert.equal(new InvalidMockQuantityError(QTY_REASONS.negative, -1).code, ERROR_CODES.MOCK_QTY_NEGATIVE);
    assert.equal(new MockSeedError('pedidos', {}, new Error('x')).statusCode, 500);
  });

  it('normalizeError: deja pasar los AppError tal cual', () => {
    const err = new UserNotFoundError('x');
    assert.equal(normalizeError(err), err);
  });

  it('normalizeError: JSON inválido => INVALID_JSON', () => {
    assert.equal(normalizeError({ type: 'entity.parse.failed' }).code, ERROR_CODES.INVALID_JSON);
  });

  it('normalizeError: ValidationError de Mongoose => VALIDATION_ERROR con campos', () => {
    const mongooseError = {
      name: 'ValidationError',
      errors: { price: { path: 'price', message: 'Path `price` is required.' } },
    };
    const err = normalizeError(mongooseError);
    assert.equal(err.code, ERROR_CODES.VALIDATION_ERROR);
    assert.deepEqual(err.details, [{ field: 'price', message: 'Path `price` is required.' }]);
  });

  it('normalizeError: CastError => INVALID_ID', () => {
    const err = normalizeError({ name: 'CastError', path: '_id', value: 'abc' });
    assert.equal(err.code, ERROR_CODES.INVALID_ID);
    assert.deepEqual(err.details, [{ field: '_id', value: 'abc' }]);
  });

  it('normalizeError: clave duplicada 11000 => DUPLICATE_KEY 409', () => {
    const err = normalizeError({ name: 'MongoServerError', code: 11000, keyValue: { email: 'a@b.c' } });
    assert.equal(err.code, ERROR_CODES.DUPLICATE_KEY);
    assert.equal(err.statusCode, 409);
    assert.deepEqual(err.details, [{ field: 'email' }]);
  });

  it('normalizeError: errores de Mongo => DATABASE_ERROR 503', () => {
    for (const name of ['MongoNetworkError', 'MongoServerSelectionError', 'MongooseError']) {
      const err = normalizeError({ name, message: 'boom' });
      assert.equal(err.code, ERROR_CODES.DATABASE_ERROR);
      assert.equal(err.statusCode, 503);
    }
  });

  it('normalizeError: error desconocido => INTERNAL_ERROR 500 conservando la causa', () => {
    const cause = new TypeError('algo raro');
    const err = normalizeError(cause);
    assert.equal(err.code, ERROR_CODES.INTERNAL_ERROR);
    assert.equal(err.cause, cause);
  });
});
