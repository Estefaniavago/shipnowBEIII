import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { LocalFileStorage } from '../../src/storage/local.file.storage.js';
import { ERROR_CODES } from '../../src/errors/index.js';

describe('LocalFileStorage (disco real en una carpeta temporal)', () => {
  let root;
  let storage;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'shipnow-storage-'));
    storage = new LocalFileStorage({ rootDir: root });
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  const exists = (p) => stat(p).then(() => true, () => false);

  it('save: crea la subcarpeta, guarda el contenido y devuelve la ruta relativa', async () => {
    const relative = await storage.save({ folder: 'user-documents', storedName: 'a.pdf', buffer: Buffer.from('%PDF-1') });
    assert.equal(relative, 'user-documents/a.pdf');
    assert.equal((await readFile(path.join(root, 'user-documents', 'a.pdf'))).toString(), '%PDF-1');
  });

  it('save: nunca pisa un archivo existente', async () => {
    await storage.save({ folder: 'licenses', storedName: 'a.pdf', buffer: Buffer.from('uno') });
    await assert.rejects(
      () => storage.save({ folder: 'licenses', storedName: 'a.pdf', buffer: Buffer.from('dos') }),
      { code: ERROR_CODES.FILE_SAVE_FAILED, statusCode: 500 }
    );
    assert.equal((await readFile(path.join(root, 'licenses', 'a.pdf'))).toString(), 'uno');
  });

  it('save: rechaza rutas que salen de la carpeta de uploads (path traversal)', async () => {
    await assert.rejects(
      () => storage.save({ folder: 'user-documents', storedName: '../../fuera.pdf', buffer: Buffer.from('x') }),
      { code: ERROR_CODES.FILE_SAVE_FAILED }
    );
    assert.equal(await exists(path.join(root, '..', 'fuera.pdf')), false);
  });

  it('save: si no se puede escribir => FILE_SAVE_FAILED con la causa y sin datos sensibles al cliente', async () => {
    await writeFile(path.join(root, 'user-documents'), 'soy un archivo, no una carpeta');
    await assert.rejects(
      () => storage.save({ folder: 'user-documents', storedName: 'a.pdf', buffer: Buffer.from('x') }),
      (error) =>
        error.code === ERROR_CODES.FILE_SAVE_FAILED &&
        error.statusCode === 500 &&
        error.cause instanceof Error &&
        error.details.length === 0
    );
  });

  it('remove: borra el archivo y no falla si ya no existe', async () => {
    await storage.save({ folder: 'delivery-receipts', storedName: 'r.png', buffer: Buffer.from('x') });
    await storage.remove('delivery-receipts/r.png');
    assert.equal(await exists(path.join(root, 'delivery-receipts', 'r.png')), false);
    await storage.remove('delivery-receipts/r.png');
  });

  it('remove: no permite borrar fuera de la carpeta de uploads', async () => {
    await assert.rejects(() => storage.remove('../../etc/passwd'));
  });
});
