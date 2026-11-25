import { DATABASE_STATES, HEALTH_STATUS, SERVICE_NAME } from '../constants/index.js';
import { AppError, ERROR_CODES } from '../errors/index.js';

// Health check: estado de la API, entorno, uptime, timestamp y estado de la base de datos.
// No expone información sensible (ni URI, ni variables de entorno, ni versiones internas).
export class HealthService {
  constructor({ environment, getDatabaseState, uptime = () => process.uptime(), now = () => new Date() }) {
    this.environment = environment;
    this.getDatabaseState = getDatabaseState;
    this.uptime = uptime;
    this.now = now;
  }

  check() {
    const database = this.getDatabaseState();
    if (database !== DATABASE_STATES.CONNECTED) {
      // 503 con el formato de error del proyecto: los orquestadores lo toman como "no listo".
      throw new AppError(ERROR_CODES.DATABASE_ERROR, {
        message: 'La API no está lista: la base de datos no está conectada',
        details: [{ database }],
      });
    }
    return {
      status: HEALTH_STATUS.OK,
      service: SERVICE_NAME,
      environment: this.environment,
      uptime: Math.floor(this.uptime()),
      timestamp: this.now().toISOString(),
      database,
    };
  }
}
