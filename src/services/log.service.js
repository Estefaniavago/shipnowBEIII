import { LOG_LEVELS } from '../constants/index.js';
import { noopLogger } from '../utils/noop.logger.js';

// Herramienta interna: emite un log en cada nivel para verificar la configuración.
export class LogService {
  constructor(logger = noopLogger) {
    this.logger = logger;
  }

  emitTestLogs() {
    const levels = Object.values(LOG_LEVELS);
    for (const level of levels) {
      this.logger[level](`Prueba del logger: mensaje de nivel ${level}`, { origen: 'logger-test' });
    }
    return { nivelesEmitidos: levels, nivelActivo: this.logger.level };
  }
}
