import { expect } from 'chai';
import express from 'express';
import request from 'supertest';
import { api } from './helpers/api.js';
import { expectError, expectSuccess as expectSuccessList } from './helpers/assertions.js';
import { createErrorHandler } from '../../src/middlewares/error.middleware.js';
import { ERROR_CODES, ERROR_DICTIONARY } from '../../src/errors/index.js';
import { LOG_LEVELS } from '../../src/constants/index.js';

describe('Errores transversales (formato uniforme)', () => {
  describe('rutas inexistentes', () => {
    it('404 ROUTE_NOT_FOUND: GET bajo /api', async () => {
      const body = expectError(await api().get('/api/cosas'), {
        status: 404, code: ERROR_CODES.ROUTE_NOT_FOUND, path: '/api/cosas',
      });
      expect(body.message).to.equal('No existe la ruta GET /api/cosas');
      expect(body.details[0]).to.deep.equal({ method: 'GET', path: '/api/cosas' });
    });

    it('404 ROUTE_NOT_FOUND: otro método y con query string', async () => {
      const body = expectError(await api().post('/api/cosas?x=1'), {
        status: 404, code: ERROR_CODES.ROUTE_NOT_FOUND, path: '/api/cosas?x=1',
      });
      expect(body.details[0]).to.include({ method: 'POST' });
    });

    it('404 ROUTE_NOT_FOUND: fuera de /api', async () => {
      expectError(await api().get('/nada'), { status: 404, code: ERROR_CODES.ROUTE_NOT_FOUND, path: '/nada' });
    });

    it('404 ROUTE_NOT_FOUND: método no soportado en una ruta existente', async () => {
      expectError(await api().delete('/api/orders'), { status: 404, code: ERROR_CODES.ROUTE_NOT_FOUND });
    });
  });

  describe('JSON inválido', () => {
    it('400 INVALID_JSON: lo detecta el middleware global antes de llegar al controller', async () => {
      const body = expectError(
        await api().post('/api/users').set('Content-Type', 'application/json').send('{"name": "Ana",'),
        { status: 400, code: ERROR_CODES.INVALID_JSON }
      );
      expect(body.message).to.equal(ERROR_DICTIONARY.INVALID_JSON.message);
    });
  });

  describe('body demasiado grande', () => {
    it('413 PAYLOAD_TOO_LARGE: un JSON de más de 100 kb se rechaza antes de llegar al controller', async () => {
      const body = expectError(
        await api().post('/api/users').send({ name: 'x'.repeat(150 * 1024), email: 'a@test.com', password: 'Test1234' }),
        { status: 413, code: ERROR_CODES.PAYLOAD_TOO_LARGE }
      );
      expect(body.message).to.equal(ERROR_DICTIONARY.PAYLOAD_TOO_LARGE.message);
      expect(expectSuccessList(await api().get('/api/users'))).to.be.empty;
    });
  });

  describe('errores inesperados y de base de datos (middleware aislado)', () => {
    const silentLogger = Object.fromEntries(Object.values(LOG_LEVELS).map((level) => [level, () => {}]));

    function buildApp({ isProduction }) {
      const app = express();
      app.get('/boom', () => {
        throw new Error('detalle interno secreto');
      });
      app.get('/db-down', (req, res, next) => {
        next(Object.assign(new Error('connection refused'), { name: 'MongoNetworkError' }));
      });
      app.use(createErrorHandler({ isProduction, logger: silentLogger }));
      return app;
    }

    it('500 INTERNAL_ERROR: error inesperado con mensaje genérico (no filtra detalles en producción)', async () => {
      const res = await request(buildApp({ isProduction: true })).get('/boom');

      const body = expectError(res, { status: 500, code: ERROR_CODES.INTERNAL_ERROR, path: '/boom' });
      expect(body.message).to.equal(ERROR_DICTIONARY.INTERNAL_ERROR.message);
      expect(JSON.stringify(body)).to.not.include('secreto');
      expect(body.details).to.deep.equal([]);
    });

    it('500 INTERNAL_ERROR: fuera de producción incluye la causa técnica en details', async () => {
      const res = await request(buildApp({ isProduction: false })).get('/boom');

      const body = expectError(res, { status: 500, code: ERROR_CODES.INTERNAL_ERROR });
      expect(body.details).to.deep.equal([{ cause: 'detalle interno secreto' }]);
    });

    it('503 DATABASE_ERROR: falla de conexión con MongoDB', async () => {
      const res = await request(buildApp({ isProduction: true })).get('/db-down');

      const body = expectError(res, { status: 503, code: ERROR_CODES.DATABASE_ERROR });
      expect(body.message).to.equal(ERROR_DICTIONARY.DATABASE_ERROR.message);
    });
  });
});
