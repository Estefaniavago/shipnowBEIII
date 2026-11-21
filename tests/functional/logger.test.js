import { expect } from 'chai';
import { api } from './helpers/api.js';
import { expectError } from './helpers/assertions.js';
import { LOG_LEVELS } from '../../src/constants/index.js';
import { ERROR_CODES } from '../../src/errors/index.js';

describe('Logger - /api/logger/test', () => {
  it('200: emite un log por cada nivel y devuelve el detalle', async () => {
    const res = await api().get('/api/logger/test');

    expect(res.status).to.equal(200);
    expect(res.type).to.equal('application/json');
    expect(res.body).to.have.all.keys('status', 'message', 'payload');
    expect(res.body.status).to.equal('success');
    expect(res.body.message).to.be.a('string');
    expect(res.body.payload).to.have.all.keys('nivelesEmitidos', 'nivelActivo');
    expect(res.body.payload.nivelesEmitidos).to.deep.equal(Object.values(LOG_LEVELS));
    expect(res.body.payload.nivelesEmitidos).to.have.members(
      ['debug', 'http', 'info', 'warning', 'error', 'fatal']
    );
    expect(Object.values(LOG_LEVELS)).to.include(res.body.payload.nivelActivo);
  });

  it('200: se puede llamar varias veces seguidas (no depende de estado previo)', async () => {
    const first = await api().get('/api/logger/test');
    const second = await api().get('/api/logger/test');
    expect(first.status).to.equal(200);
    expect(second.status).to.equal(200);
    expect(second.body.payload).to.deep.equal(first.body.payload);
  });

  it('404 ROUTE_NOT_FOUND: el endpoint solo acepta GET', async () => {
    expectError(await api().post('/api/logger/test'), {
      status: 404, code: ERROR_CODES.ROUTE_NOT_FOUND, path: '/api/logger/test',
    });
  });

  it('404 ROUTE_NOT_FOUND: ruta vecina inexistente', async () => {
    expectError(await api().get('/api/logger'), { status: 404, code: ERROR_CODES.ROUTE_NOT_FOUND });
  });
});
