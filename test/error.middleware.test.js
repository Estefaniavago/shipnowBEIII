import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createErrorHandler } from '../src/middlewares/error.middleware.js';
import { notFoundHandler } from '../src/middlewares/not-found.middleware.js';
import { asyncHandler } from '../src/utils/async.handler.js';
import { UserNotFoundError, ERROR_CODES } from '../src/errors/index.js';

function fakeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}
const req = { originalUrl: '/api/users/123' };
const silentLogger = { calls: [], error(...args) { this.calls.push(args); } };

test('middleware: AppError => estructura uniforme', () => {
  const res = fakeRes();
  createErrorHandler({ logger: silentLogger })(new UserNotFoundError('abc'), req, res, () => {});
  assert.equal(res.statusCode, 404);
  assert.deepEqual(Object.keys(res.body), ['status', 'code', 'message', 'details', 'path', 'timestamp']);
  assert.equal(res.body.status, 'error');
  assert.equal(res.body.code, ERROR_CODES.USER_NOT_FOUND);
  assert.equal(res.body.path, '/api/users/123');
  assert.ok(Array.isArray(res.body.details));
  assert.ok(!Number.isNaN(Date.parse(res.body.timestamp)));
});

test('middleware: error desconocido => 500 genérico, loguea y no filtra la causa en producción', () => {
  const logger = { calls: [], error(...a) { this.calls.push(a); } };
  const res = fakeRes();
  createErrorHandler({ isProduction: true, logger })(new Error('password=secreto'), req, res, () => {});
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.code, ERROR_CODES.INTERNAL_ERROR);
  assert.ok(!JSON.stringify(res.body).includes('secreto'));
  assert.equal(logger.calls.length, 1);
});

test('middleware: fuera de producción incluye la causa técnica en details', () => {
  const res = fakeRes();
  createErrorHandler({ isProduction: false, logger: silentLogger })(new Error('falló X'), req, res, () => {});
  assert.deepEqual(res.body.details, [{ cause: 'falló X' }]);
});

test('middleware: errores 4xx no se loguean como error de servidor', () => {
  const logger = { calls: [], error(...a) { this.calls.push(a); } };
  createErrorHandler({ logger })(new UserNotFoundError('x'), req, fakeRes(), () => {});
  assert.equal(logger.calls.length, 0);
});

test('notFoundHandler: deriva un ROUTE_NOT_FOUND al middleware global', () => {
  let received;
  notFoundHandler({ method: 'GET', originalUrl: '/api/nada' }, {}, (err) => (received = err));
  assert.equal(received.code, ERROR_CODES.ROUTE_NOT_FOUND);
  assert.equal(received.statusCode, 404);
});

test('asyncHandler: deriva errores sync y async a next()', async () => {
  const errors = [];
  const next = (e) => errors.push(e);
  await asyncHandler(() => { throw new Error('sync'); })({}, {}, next);
  await asyncHandler(async () => { throw new Error('async'); })({}, {}, next);
  assert.deepEqual(errors.map((e) => e.message), ['sync', 'async']);
});
