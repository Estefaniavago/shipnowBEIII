import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { formatLogLine } from '../../src/utils/log.format.js';
import { createRequestLogger } from '../../src/middlewares/request-logger.middleware.js';
import { LogService } from '../../src/services/log.service.js';
import { noopLogger } from '../../src/utils/noop.logger.js';
import {
  LOG_LEVELS,
  LOG_PRIORITIES,
  LOG_LEVEL_BY_ENV,
  NODE_ENVS,
} from '../../src/constants/index.js';

describe('logging', () => {
  function makeLogger() {
    const calls = [];
    const logger = { calls, level: 'debug' };
    for (const level of Object.values(LOG_LEVELS)) {
      logger[level] = (message, meta) => calls.push([level, message, meta]);
    }
    return logger;
  }

  it('niveles: están los 6 pedidos y fatal es el más severo', () => {
    assert.deepEqual(
      Object.values(LOG_LEVELS).sort(),
      ['debug', 'error', 'fatal', 'http', 'info', 'warning']
    );
    const ordered = Object.entries(LOG_PRIORITIES).sort((a, b) => a[1] - b[1]).map(([name]) => name);
    assert.deepEqual(ordered, ['fatal', 'error', 'warning', 'info', 'http', 'debug']);
    assert.ok(Object.isFrozen(LOG_LEVELS) && Object.isFrozen(LOG_PRIORITIES));
  });

  it('entornos: development => debug, production => info', () => {
    assert.equal(LOG_LEVEL_BY_ENV[NODE_ENVS.DEVELOPMENT], LOG_LEVELS.DEBUG);
    assert.equal(LOG_LEVEL_BY_ENV[NODE_ENVS.PRODUCTION], LOG_LEVELS.INFO);
  });

  it('formato: timestamp + [nivel] + mensaje, con nivel alineado', () => {
    const ts = '2026-11-17 10:12:03';
    assert.equal(
      formatLogLine({ timestamp: ts, level: 'info', message: 'Servidor listo' }),
      `${ts} [info]    Servidor listo`
    );
    assert.equal(
      formatLogLine({ timestamp: ts, level: 'warning', message: 'Sin repartidor' }),
      `${ts} [warning] Sin repartidor`
    );
    assert.equal(
      formatLogLine({ timestamp: ts, level: 'error', message: 'Falló' }),
      `${ts} [error]   Falló`
    );
  });

  it('formato: metadata como JSON y stack en líneas aparte', () => {
    const line = formatLogLine({
      timestamp: 'T',
      level: 'error',
      message: 'boom',
      code: 'INTERNAL_ERROR',
      stack: 'Error: boom\n    at x',
    });
    assert.ok(line.includes('{"code":"INTERNAL_ERROR"}'));
    assert.ok(line.endsWith('\nError: boom\n    at x'));
    assert.ok(!line.includes('"stack"'));
  });

  it('formato: colorize agrega códigos ANSI solo cuando se pide', () => {
    const info = { timestamp: 'T', level: 'error', message: 'x' };
    assert.ok(!formatLogLine(info).includes('\x1b['));
    assert.ok(formatLogLine(info, { colorize: true }).includes('\x1b[31m'));
  });

  it('request logger: registra método, url, status y duración en nivel http', () => {
    const logger = makeLogger();
    const res = new EventEmitter();
    res.statusCode = 404;
    let nextCalled = false;
    createRequestLogger({ logger })({ method: 'GET', originalUrl: '/api/x' }, res, () => (nextCalled = true));
    assert.equal(nextCalled, true);
    assert.equal(logger.calls.length, 0, 'no loguea hasta que termina la respuesta');
    res.emit('finish');
    const [level, message] = logger.calls[0];
    assert.equal(level, LOG_LEVELS.HTTP);
    assert.match(message, /^GET \/api\/x 404 \d+(\.\d+)?ms$/);
  });

  it('endpoint de prueba: emite un log por cada nivel', () => {
    const logger = makeLogger();
    const result = new LogService(logger).emitTestLogs();
    assert.deepEqual(logger.calls.map((c) => c[0]), Object.values(LOG_LEVELS));
    assert.deepEqual(result.nivelesEmitidos, Object.values(LOG_LEVELS));
    assert.equal(result.nivelActivo, 'debug');
  });

  it('noopLogger: tiene todos los niveles y no falla', () => {
    for (const level of Object.values(LOG_LEVELS)) assert.doesNotThrow(() => noopLogger[level]('x', {}));
  });
});
