import assert from 'node:assert/strict';
import { HealthService } from '../../src/services/health.service.js';
import { ERROR_CODES } from '../../src/errors/index.js';
import { DATABASE_STATES, HEALTH_STATUS, SERVICE_NAME } from '../../src/constants/index.js';

const fixedNow = () => new Date('2026-11-17T15:30:00.000Z');

const build = (state = DATABASE_STATES.CONNECTED, uptime = () => 3661.9) =>
  new HealthService({ environment: 'production', getDatabaseState: () => state, uptime, now: fixedNow });

describe('health.service', () => {
  it('con la base conectada devuelve estado, servicio, entorno, uptime, timestamp y base', () => {
    assert.deepEqual(build().check(), {
      status: HEALTH_STATUS.OK,
      service: SERVICE_NAME,
      environment: 'production',
      uptime: 3661,
      timestamp: '2026-11-17T15:30:00.000Z',
      database: DATABASE_STATES.CONNECTED,
    });
  });

  it('uptime es un entero (segundos)', () => {
    assert.equal(Number.isInteger(build(DATABASE_STATES.CONNECTED, () => 0.4).check().uptime), true);
  });

  it('no expone información sensible: solo las 6 propiedades esperadas', () => {
    const result = build().check();
    assert.deepEqual(Object.keys(result).sort(), ['database', 'environment', 'service', 'status', 'timestamp', 'uptime']);
    const text = JSON.stringify(result).toLowerCase();
    for (const sensitive of ['mongodb://', 'password', 'secret', 'token', 'uri']) {
      assert.ok(!text.includes(sensitive), `no debe incluir "${sensitive}"`);
    }
  });

  it('con la base desconectada lanza DATABASE_ERROR 503 con el estado en details', () => {
    for (const state of [DATABASE_STATES.DISCONNECTED, DATABASE_STATES.CONNECTING, DATABASE_STATES.DISCONNECTING]) {
      assert.throws(
        () => build(state).check(),
        (error) =>
          error.code === ERROR_CODES.DATABASE_ERROR &&
          error.statusCode === 503 &&
          error.details[0].database === state
      );
    }
  });

  it('usa el reloj y el uptime reales por defecto', () => {
    const service = new HealthService({ environment: 'test', getDatabaseState: () => DATABASE_STATES.CONNECTED });
    const result = service.check();
    assert.ok(Number.isInteger(result.uptime) && result.uptime >= 0);
    assert.ok(Math.abs(Date.parse(result.timestamp) - Date.now()) < 5000);
  });
});
