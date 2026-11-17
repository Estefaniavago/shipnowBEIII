import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { LOG_LEVELS, LOG_PRIORITIES, LOG_DEFAULTS } from '../constants/index.js';
import { formatLogLine } from '../utils/log.format.js';

const { createLogger, format, transports } = winston;

/**
 * Fábrica del logger. No depende de la config de entorno, por eso también sirve
 * para registrar un `fatal` cuando la configuración es inválida y la app no arranca.
 */
export function buildLogger({
  level = LOG_LEVELS.INFO,
  logDir = LOG_DEFAULTS.DIR,
  files = true,
  colorize = false,
  silent = false,
} = {}) {
  const withTimestamp = format.timestamp({ format: LOG_DEFAULTS.TIMESTAMP_FORMAT });
  const lineFormat = (options) => format.combine(withTimestamp, format.printf((info) => formatLogLine(info, options)));

  const rotatingFile = (name, fileLevel) =>
    new DailyRotateFile({
      level: fileLevel,
      dirname: logDir,
      filename: `${name}-%DATE%.log`,
      datePattern: LOG_DEFAULTS.DATE_PATTERN,
      maxSize: LOG_DEFAULTS.MAX_SIZE,
      maxFiles: LOG_DEFAULTS.MAX_FILES, // conserva 14 días
      zippedArchive: true,
      format: lineFormat({ colorize: false }),
    });

  const logTransports = [new transports.Console({ format: lineFormat({ colorize }) })];
  if (files) {
    logTransports.push(rotatingFile('combined', level)); // todo lo que pasa el nivel activo
    logTransports.push(rotatingFile('error', LOG_LEVELS.ERROR)); // solo error y fatal
  }

  return createLogger({ levels: LOG_PRIORITIES, level, silent, transports: logTransports });
}
