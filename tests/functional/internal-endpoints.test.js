import { expect } from 'chai';
import express from 'express';
import request from 'supertest';
import { api } from './helpers/api.js';
import { expectError, expectSuccess } from './helpers/assertions.js';
import { buildRoutes } from '../../src/routes/index.js';
import { notFoundHandler } from '../../src/middlewares/not-found.middleware.js';
import { createErrorHandler } from '../../src/middlewares/error.middleware.js';
import { ERROR_CODES } from '../../src/errors/index.js';
import { LOG_LEVELS } from '../../src/constants/index.js';

// Criterio aplicado: en producción, mocks y logger test quedan APAGADOS por defecto
// (ENABLE_INTERNAL_ENDPOINTS). Acá se arma la app como la dejaría la configuración de producción.
const silentLogger = Object.fromEntries(Object.values(LOG_LEVELS).map((level) => [level, () => {}]));

function buildApp({ internalEndpoints }) {
  const app = express();
  app.use(express.json());
  app.use('/api', buildRoutes({ internalEndpoints }));
  app.use(notFoundHandler);
  app.use(createErrorHandler({ isProduction: true, logger: silentLogger }));
  return app;
}

describe('Endpoints internos según el entorno (criterio de producción)', () => {
  describe('apagados (producción por defecto)', () => {
    const production = () => request(buildApp({ internalEndpoints: false }));

    it('404 ROUTE_NOT_FOUND: GET /api/mocks/users', async () => {
      expectError(await production().get('/api/mocks/users?qty=2'), {
        status: 404, code: ERROR_CODES.ROUTE_NOT_FOUND, path: '/api/mocks/users?qty=2',
      });
    });

    it('404 ROUTE_NOT_FOUND: POST /api/mocks/seed y no inserta nada', async () => {
      expectError(await production().post('/api/mocks/seed?qty=5&type=all'), {
        status: 404, code: ERROR_CODES.ROUTE_NOT_FOUND,
      });
      expect(expectSuccess(await api().get('/api/users'))).to.be.empty;
    });

    it('404 ROUTE_NOT_FOUND: DELETE /api/mocks/seed', async () => {
      expectError(await production().delete('/api/mocks/seed'), { status: 404, code: ERROR_CODES.ROUTE_NOT_FOUND });
    });

    it('404 ROUTE_NOT_FOUND: GET /api/logger/test', async () => {
      expectError(await production().get('/api/logger/test'), { status: 404, code: ERROR_CODES.ROUTE_NOT_FOUND });
    });

    it('los endpoints de negocio y el health check siguen funcionando', async () => {
      const health = await production().get('/api/health');
      expectSuccess(health, 200);
      expect(expectSuccess(await production().get('/api/users'))).to.be.an('array');
      expect(expectSuccess(await production().get('/api/orders'))).to.be.an('array');
    });
  });

  describe('encendidos (desarrollo y testing)', () => {
    const development = () => request(buildApp({ internalEndpoints: true }));

    it('200: mocks disponible', async () => {
      const res = await development().get('/api/mocks/users?qty=2');
      expect(res.status).to.equal(200);
      expect(res.body).to.have.lengthOf(2);
    });

    it('200: logger test disponible', async () => {
      const res = await development().get('/api/logger/test');
      expect(res.status).to.equal(200);
      expect(res.body.payload.nivelesEmitidos).to.have.lengthOf(6);
    });
  });
});
