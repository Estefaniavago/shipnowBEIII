import { ERROR_DICTIONARY } from './error.dictionary.js';

// Error base: toma status y mensaje por defecto del diccionario.
export class AppError extends Error {
  constructor(code, { message, details = [], cause } = {}) {
    const definition = ERROR_DICTIONARY[code];
    if (!definition) throw new Error(`Código de error no registrado en el diccionario: ${code}`);
    super(message ?? definition.message, { cause });
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = definition.status;
    this.details = details; // siempre un array de objetos
  }
}
