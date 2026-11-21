import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { FileSaveError } from '../errors/index.js';

// Único lugar que escribe archivos en el disco (equivalente a un Repository, pero para archivos).
export class LocalFileStorage {
  constructor({ rootDir }) {
    this.rootDir = path.resolve(rootDir);
  }

  // Resuelve una ruta relativa y garantiza que quede DENTRO de la carpeta de uploads.
  #resolveInside(relativePath) {
    const absolute = path.resolve(this.rootDir, relativePath);
    if (absolute !== this.rootDir && !absolute.startsWith(this.rootDir + path.sep)) {
      throw new Error('La ruta queda fuera de la carpeta de uploads');
    }
    return absolute;
  }

  // Guarda el archivo y devuelve su ruta relativa (la que se registra en la base).
  async save({ folder, storedName, buffer }) {
    const relativePath = path.posix.join(folder, storedName);
    try {
      const absolute = this.#resolveInside(relativePath);
      await mkdir(path.dirname(absolute), { recursive: true });
      await writeFile(absolute, buffer, { flag: 'wx' }); // 'wx': nunca pisa un archivo existente
      return relativePath;
    } catch (error) {
      throw new FileSaveError(relativePath, error);
    }
  }

  async remove(relativePath) {
    await rm(this.#resolveInside(relativePath), { force: true });
  }
}
