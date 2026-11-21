import assert from 'node:assert/strict';
import { createErrorHandler } from '../../src/middlewares/error.middleware.js';
import { notFoundHandler } from '../../src/middlewares/not-found.middleware.js';
import { asyncHandler } from '../../src/utils/async.handler.js';
import { UserNotFoundError, ERROR_CODES } from '../../src/errors/index.js';
import { LOG_LEVELS } from '../../src/constants/index.js';

describe('error.middleware', () => {
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
  const req = { method: 'GET', originalUrl: '/api/users/123' };

  // Logger falso que registra cada llamada: [nivel, mensaje, meta]
  function makeLogger() {
    const calls = [];
    const logger = { calls };
    for (const level of Object.values(LOG_LEVELS)) {
      logger[level] = (message, meta) => calls.push([level, message, meta]);
    }
    return logger;
  }
  const silentLogger = makeLogger();

  it('middleware: AppError => estructura uniforme', () => {
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

  it('middleware: error desconocido => 500 genérico, loguea y no filtra la causa en producción', () => {
    const logger = makeLogger();
    const res = fakeRes();
    createErrorHandler({ isProduction: true, logger })(new Error('password=secreto'), req, res, () => {});
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.code, ERROR_CODES.INTERNAL_ERROR);
    assert.ok(!JSON.stringify(res.body).includes('secreto'));
    assert.equal(logger.calls.length, 1);
    assert.equal(logger.calls[0][0], LOG_LEVELS.ERROR);
  });

  it('middleware: fuera de producción incluye la causa técnica en details', () => {
    const res = fakeRes();
    createErrorHandler({ isProduction: false, logger: silentLogger })(new Error('falló X'), req, res, () => {});
    assert.deepEqual(res.body.details, [{ cause: 'falló X' }]);
  });

  it('logging: errores esperados (4xx) => warning con código, método y ruta', () => {
    const logger = makeLogger();
    createErrorHandler({ logger })(new UserNotFoundError('x'), req, fakeRes(), () => {});
    assert.equal(logger.calls.length, 1);
    const [level, message, meta] = logger.calls[0];
    assert.equal(level, LOG_LEVELS.WARNING);
    assert.equal(message, 'Usuario no encontrado');
    assert.equal(meta.code, ERROR_CODES.USER_NOT_FOUND);
    assert.equal(meta.method, 'GET');
    assert.equal(meta.path, '/api/users/123');
  });

  it('logging: errores inesperados (5xx) => error con stack de la causa', () => {
    const logger = makeLogger();
    const cause = new Error('se rompió algo');
    createErrorHandler({ logger })(cause, req, fakeRes(), () => {});
    const [level, , meta] = logger.calls[0];
    assert.equal(level, LOG_LEVELS.ERROR);
    assert.equal(meta.code, ERROR_CODES.INTERNAL_ERROR);
    assert.ok(meta.stack.includes('se rompió algo'));
  });

  it('logging: la respuesta al cliente es la misma haya o no logger', () => {
    const withLogger = fakeRes();
    const withoutLogger = fakeRes();
    createErrorHandler({ logger: makeLogger() })(new UserNotFoundError('x'), req, withLogger, () => {});
    createErrorHandler()(new UserNotFoundError('x'), req, withoutLogger, () => {});
    assert.equal(withLogger.statusCode, withoutLogger.statusCode);
    assert.equal(withLogger.body.code, withoutLogger.body.code);
  });

  it('notFoundHandler: deriva un ROUTE_NOT_FOUND al middleware global', () => {
    let received;
    notFoundHandler({ method: 'GET', originalUrl: '/api/nada' }, {}, (err) => (received = err));
    assert.equal(received.code, ERROR_CODES.ROUTE_NOT_FOUND);
    assert.equal(received.statusCode, 404);
  });

  it('asyncHandler: deriva errores sync y async a next()', async () => {
    const errors = [];
    const next = (e) => errors.push(e);
    await asyncHandler(() => { throw new Error('sync'); })({}, {}, next);
    await asyncHandler(async () => { throw new Error('async'); })({}, {}, next);
    assert.deepEqual(errors.map((e) => e.message), ['sync', 'async']);
  });
});
