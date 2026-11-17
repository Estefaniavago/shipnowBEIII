import config from './index.js';
import { buildLogger } from './logger.factory.js';
import { NODE_ENVS } from '../constants/index.js';

// Instancia única del logger para toda la app.
// - development: consola con colores, nivel debug, archivos.
// - production: consola sin colores, nivel info, archivos.
// - test: silencioso y sin archivos.
const isTest = config.nodeEnv === NODE_ENVS.TEST;

const logger = buildLogger({
  level: config.logLevel,
  logDir: config.logDir,
  files: !isTest,
  colorize: config.nodeEnv === NODE_ENVS.DEVELOPMENT,
  silent: isTest,
});

export default logger;
