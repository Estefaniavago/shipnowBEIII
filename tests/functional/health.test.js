import { expect } from 'chai';
import { api } from './helpers/api.js';
import { expectError, expectSuccess, expectIsoDate } from './helpers/assertions.js';
import config from '../../src/config/index.js';
import { ERROR_CODES } from '../../src/errors/index.js';

describe('Health check - GET /api/health', () => {
  it('200: devuelve estado, servicio, entorno, uptime, timestamp y estado de la base', async () => {
    const res = await api().get('/api/health');

    const health = expectSuccess(res, 200);
    expect(health).to.have.all.keys('status', 'service', 'environment', 'uptime', 'timestamp', 'database');
    expect(health.status).to.equal('ok');
    expect(health.service).to.equal('shipnow-api');
    expect(health.environment).to.equal('test');
    expect(health.uptime).to.be.a('number');
    expect(Number.isInteger(health.uptime)).to.equal(true);
    expect(health.uptime).to.be.at.least(0);
    expectIsoDate(health.timestamp);
    expect(Math.abs(Date.parse(health.timestamp) - Date.now())).to.be.lessThan(10000);
    expect(health.database).to.equal('connected');
  });

  it('200: no expone información sensible (ni la URI de la base ni variables de entorno)', async () => {
    const res = await api().get('/api/health');
    const text = JSON.stringify(res.body).toLowerCase();

    expect(text).to.not.include('mongodb');
    expect(text).to.not.include(config.mongoUri.toLowerCase());
    ['password', 'secret', 'token', 'uri', 'process.env'].forEach((word) => {
      expect(text, `no debe incluir "${word}"`).to.not.include(word);
    });
  });

  it('200: el uptime no retrocede entre llamadas y no depende de datos en la base', async () => {
    const first = expectSuccess(await api().get('/api/health'));
    const second = expectSuccess(await api().get('/api/health'));
    expect(second.uptime).to.be.at.least(first.uptime);
  });

  it('200: la respuesta no revela el framework (sin X-Powered-By)', async () => {
    const res = await api().get('/api/health');
    expect(res.headers).to.not.have.property('x-powered-by');
  });

  it('404 ROUTE_NOT_FOUND: el health check solo acepta GET', async () => {
    expectError(await api().post('/api/health'), {
      status: 404, code: ERROR_CODES.ROUTE_NOT_FOUND, path: '/api/health',
    });
  });
});
