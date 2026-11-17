// Cierra el proceso asegurando que Winston alcance a escribir los últimos logs.
export function exitAfterFlush(logger, code = 1, timeoutMs = 1000) {
  const timer = setTimeout(() => process.exit(code), timeoutMs);
  logger.once('finish', () => {
    clearTimeout(timer);
    process.exit(code);
  });
  logger.end();
}
