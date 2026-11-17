import { LOG_LEVELS } from '../constants/index.js';

// Logger que no hace nada: valor por defecto cuando no se inyecta uno (ej. en tests).
export const noopLogger = Object.freeze(
  Object.fromEntries(Object.values(LOG_LEVELS).map((level) => [level, () => {}]))
);
