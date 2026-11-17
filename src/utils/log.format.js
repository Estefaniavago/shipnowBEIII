const LABEL_WIDTH = 9; // ancho de "[warning]", el nivel más largo
const RESET = '\x1b[0m';
const COLORS = Object.freeze({
  fatal: '\x1b[35m', // magenta
  error: '\x1b[31m', // rojo
  warning: '\x1b[33m', // amarillo
  info: '\x1b[32m', // verde
  http: '\x1b[36m', // cian
  debug: '\x1b[34m', // azul
});

// Línea de log: "2026-11-17 10:12:03 [info]    mensaje {"meta":1}"
// El stack (si existe) se imprime en líneas aparte para que sea legible.
export function formatLogLine(info, { colorize = false } = {}) {
  const { timestamp, level, message, stack, ...meta } = info;
  const label = `[${level}]`.padEnd(LABEL_WIDTH);
  const shownLabel = colorize && COLORS[level] ? `${COLORS[level]}${label}${RESET}` : label;
  const extra = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  const stackLines = stack ? `\n${stack}` : '';
  return `${timestamp} ${shownLabel} ${message}${extra}${stackLines}`;
}
