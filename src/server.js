import { buildLogger } from './config/logger.factory.js';
import { LOG_DEFAULTS, LOG_LEVELS, SHUTDOWN_TIMEOUT_MS } from './constants/index.js';
import { exitAfterFlush } from './utils/shutdown.js';

async function start() {
  let config;
  let logger;
  let app;
  let connectDB;
  let disconnectDB;

  try {
    // Imports dinámicos: si la configuración es inválida, el error se captura acá
    // y se registra como "fatal" con un logger que no depende de la config.
    ({ default: config } = await import('./config/index.js'));
    ({ default: logger } = await import('./config/logger.js'));
    ({ default: app } = await import('./app.js'));
    ({ connectDB, disconnectDB } = await import('./config/db.config.js'));
  } catch (error) {
    const bootLogger = buildLogger({ level: LOG_LEVELS.INFO, logDir: LOG_DEFAULTS.DIR });
    bootLogger.fatal(`No se pudo iniciar la aplicación: ${error.message}`, { stack: error.stack });
    return exitAfterFlush(bootLogger, 1);
  }

  process.on('uncaughtException', (error) => {
    logger.fatal(`Excepción no capturada: ${error.message}`, { stack: error.stack });
    exitAfterFlush(logger, 1);
  });
  process.on('unhandledRejection', (reason) => {
    logger.fatal(`Promesa rechazada sin manejar: ${reason?.message ?? reason}`, { stack: reason?.stack });
    exitAfterFlush(logger, 1);
  });

  try {
    await connectDB();
  } catch (error) {
    logger.fatal(error.message, { stack: error.cause?.stack ?? error.stack });
    return exitAfterFlush(logger, 1);
  }

  const server = app.listen(config.port, () => {
    logger.info(`Servidor ShipNow escuchando en el puerto ${config.port} (${config.nodeEnv})`);
  });

  // Cierre ordenado: Docker (y la mayoría de las plataformas) detienen el proceso con SIGTERM.
  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Señal ${signal} recibida: cerrando el servidor...`);

    const forceExit = setTimeout(() => {
      logger.error('El cierre ordenado tardó demasiado: se fuerza la salida');
      exitAfterFlush(logger, 1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    server.close(async () => {
      try {
        await disconnectDB();
        logger.info('Servidor detenido y conexión a MongoDB cerrada');
        exitAfterFlush(logger, 0);
      } catch (error) {
        logger.error(`Error al cerrar la conexión a MongoDB: ${error.message}`, { stack: error.stack });
        exitAfterFlush(logger, 1);
      }
    });
    server.closeIdleConnections?.();
  };
  ['SIGTERM', 'SIGINT'].forEach((signal) => process.on(signal, () => shutdown(signal)));

  server.on('error', (error) => {
    const reason =
      error.code === 'EADDRINUSE'
        ? `El puerto ${config.port} ya está en uso. Cambiá PORT en tu .env o cerrá el proceso que lo ocupa.`
        : `Error al iniciar el servidor: ${error.message}`;
    logger.fatal(reason);
    exitAfterFlush(logger, 1);
  });
}

start();
