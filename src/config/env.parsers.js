// Funciones puras para interpretar variables de entorno (se testean sin cargar dotenv).

export function parseBoolean(name, raw, defaultValue) {
  if (raw === undefined || raw.trim() === '') return defaultValue;
  const value = raw.trim().toLowerCase();
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`[Config] ${name} debe ser "true" o "false" (recibido: "${raw}").`);
}

export function parsePort(raw) {
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`[Config] PORT debe ser un entero entre 1 y 65535 (recibido: "${raw}").`);
  }
  return port;
}

// URL pública de la API (opcional): se usa, por ejemplo, como servidor en Swagger.
export function parsePublicUrl(raw) {
  const value = raw?.trim();
  if (!value) return null;
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`[Config] PUBLIC_URL no es una URL válida (recibido: "${raw}").`);
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`[Config] PUBLIC_URL debe empezar con http:// o https:// (recibido: "${raw}").`);
  }
  return value.replace(/\/+$/, '');
}
