import assert from 'node:assert/strict';
import { DocumentService } from '../../src/services/document.service.js';
import { ERROR_CODES, FileSaveError } from '../../src/errors/index.js';
import {
  DOCUMENT_TYPES, LOG_LEVELS, RECEIPT_DOCUMENT_TYPE, UPLOAD_FOLDERS,
} from '../../src/constants/index.js';

const USER_ID = 'a'.repeat(24);
const DELIVERY_ID = 'b'.repeat(24);
const MISSING_ID = 'c'.repeat(24);
const PDF = Buffer.from('%PDF-1.4\ncontenido');
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('x')]);

const pdfFile = (overrides = {}) => ({
  originalname: 'dni.pdf', mimetype: 'application/pdf', buffer: PDF, size: PDF.length, ...overrides,
});

function setup({ persistFails = false, persistReturnsNull = false, saveFails = false } = {}) {
  const logs = [];
  const logger = {};
  for (const level of Object.values(LOG_LEVELS)) logger[level] = (msg) => logs.push([level, msg]);

  const stored = [];
  const removed = [];
  const fileStorage = {
    async save({ folder, storedName, buffer }) {
      if (saveFails) throw new FileSaveError(`${folder}/${storedName}`, new Error('disco lleno'));
      stored.push({ folder, storedName, buffer });
      return `${folder}/${storedName}`;
    },
    async remove(path) { removed.push(path); },
  };

  const documents = [];
  const receipts = [];
  const userRepository = {
    async getById(id) { return id === USER_ID ? { _id: id, name: 'Ana', documents } : null; },
    async addDocument(id, metadata) {
      if (persistFails) throw new Error('mongo caído');
      if (persistReturnsNull) return null;
      documents.push(metadata);
      return { _id: id, name: 'Ana', documents };
    },
  };
  const deliveryRepository = {
    async getById(id) { return id === DELIVERY_ID ? { _id: id, receipts } : null; },
    async addReceipt(id, metadata) {
      if (persistFails) throw new Error('mongo caído');
      receipts.push(metadata);
      return { _id: id, receipts };
    },
  };
  const service = new DocumentService({ userRepository, deliveryRepository, fileStorage, logger });
  return { service, stored, removed, documents, receipts, logs };
}

describe('document.service', () => {
  describe('uploadUserDocument', () => {
    it('guarda el archivo, registra solo metadatos y devuelve el usuario actualizado', async () => {
      const { service, stored, documents, logs } = setup();

      const user = await service.uploadUserDocument({ userId: USER_ID, file: pdfFile(), documentType: DOCUMENT_TYPES.ID_CARD });

      assert.equal(stored.length, 1);
      assert.equal(stored[0].folder, UPLOAD_FOLDERS.USER_DOCUMENTS);
      assert.equal(user.documents.length, 1);
      const meta = documents[0];
      assert.deepEqual(Object.keys(meta).sort(), [
        'documentType', 'mimeType', 'originalName', 'path', 'size', 'storedName', 'uploadedAt',
      ]);
      assert.equal(meta.originalName, 'dni.pdf');
      assert.equal(meta.mimeType, 'application/pdf');
      assert.equal(meta.size, PDF.length);
      assert.equal(meta.documentType, DOCUMENT_TYPES.ID_CARD);
      assert.equal(meta.path, `${UPLOAD_FOLDERS.USER_DOCUMENTS}/${meta.storedName}`);
      assert.match(meta.storedName, /\.pdf$/);
      assert.ok(meta.uploadedAt instanceof Date);
      assert.equal(logs.length, 1);
      assert.equal(logs[0][0], LOG_LEVELS.INFO);
      assert.match(logs[0][1], /^Documento de usuario cargado: /);
    });

    it('DRIVER_LICENSE se guarda en la carpeta licenses', async () => {
      const { service, stored } = setup();
      await service.uploadUserDocument({ userId: USER_ID, file: pdfFile(), documentType: DOCUMENT_TYPES.DRIVER_LICENSE });
      assert.equal(stored[0].folder, UPLOAD_FOLDERS.LICENSES);
    });

    it('sin documentType usa OTHER', async () => {
      const { service, documents } = setup();
      await service.uploadUserDocument({ userId: USER_ID, file: pdfFile(), documentType: undefined });
      assert.equal(documents[0].documentType, DOCUMENT_TYPES.OTHER);
      await service.uploadUserDocument({ userId: USER_ID, file: pdfFile(), documentType: '' });
      assert.equal(documents[1].documentType, DOCUMENT_TYPES.OTHER);
    });

    it('guarda el nombre original limpio (sin rutas) y nunca lo usa para el archivo', async () => {
      const { service, documents } = setup();
      await service.uploadUserDocument({ userId: USER_ID, file: pdfFile({ originalname: '../../etc/passwd.pdf' }) });
      assert.equal(documents[0].originalName, 'passwd.pdf');
      assert.ok(!documents[0].storedName.includes('passwd'));
    });

    it('INVALID_ID / USER_NOT_FOUND: no guarda nada', async () => {
      const { service, stored } = setup();
      await assert.rejects(() => service.uploadUserDocument({ userId: '123', file: pdfFile() }), { code: ERROR_CODES.INVALID_ID });
      await assert.rejects(() => service.uploadUserDocument({ userId: MISSING_ID, file: pdfFile() }), { code: ERROR_CODES.USER_NOT_FOUND, statusCode: 404 });
      assert.equal(stored.length, 0);
    });

    it('FILE_REQUIRED: no se envió archivo', async () => {
      const { service, stored } = setup();
      await assert.rejects(
        () => service.uploadUserDocument({ userId: USER_ID, file: undefined }),
        (error) => error.code === ERROR_CODES.FILE_REQUIRED && error.statusCode === 400 && error.details[0].field === 'document'
      );
      assert.equal(stored.length, 0);
    });

    it('DOCUMENT_TYPE_INVALID: tipo de documento fuera de las constantes, sin guardar nada', async () => {
      const { service, stored } = setup();
      await assert.rejects(
        () => service.uploadUserDocument({ userId: USER_ID, file: pdfFile(), documentType: 'SELFIE' }),
        (error) => error.code === ERROR_CODES.DOCUMENT_TYPE_INVALID && error.details[0].allowed.length === 4
      );
      assert.equal(stored.length, 0);
    });

    it('FILE_TYPE_INVALID: el contenido no coincide con el tipo declarado (archivo falsificado)', async () => {
      const { service, stored } = setup();
      const fakePdf = pdfFile({ buffer: Buffer.from('esto es texto, no un pdf'), size: 24 });
      await assert.rejects(() => service.uploadUserDocument({ userId: USER_ID, file: fakePdf }), { code: ERROR_CODES.FILE_TYPE_INVALID, statusCode: 415 });
      const pdfAsPng = pdfFile({ mimetype: 'image/png' });
      await assert.rejects(() => service.uploadUserDocument({ userId: USER_ID, file: pdfAsPng }), { code: ERROR_CODES.FILE_TYPE_INVALID });
      assert.equal(stored.length, 0);
    });

    it('si falla el guardado en disco: FILE_SAVE_FAILED y no se registra ningún metadato', async () => {
      const { service, documents } = setup({ saveFails: true });
      await assert.rejects(() => service.uploadUserDocument({ userId: USER_ID, file: pdfFile() }), { code: ERROR_CODES.FILE_SAVE_FAILED });
      assert.equal(documents.length, 0);
    });

    it('si falla el registro en la base: borra el archivo guardado (no queda huérfano) y propaga el error', async () => {
      const { service, stored, removed, logs } = setup({ persistFails: true });
      await assert.rejects(() => service.uploadUserDocument({ userId: USER_ID, file: pdfFile() }), /mongo caído/);
      assert.equal(removed.length, 1);
      assert.equal(removed[0], `${stored[0].folder}/${stored[0].storedName}`);
      assert.ok(logs.some(([level]) => level === LOG_LEVELS.WARNING));
    });

    it('si el usuario desaparece mientras se guarda: USER_NOT_FOUND y se borra el archivo', async () => {
      const { service, removed } = setup({ persistReturnsNull: true });
      await assert.rejects(() => service.uploadUserDocument({ userId: USER_ID, file: pdfFile() }), { code: ERROR_CODES.USER_NOT_FOUND });
      assert.equal(removed.length, 1);
    });
  });

  describe('uploadDeliveryReceipt', () => {
    it('guarda el comprobante en delivery-receipts, registra metadatos y devuelve la entrega', async () => {
      const { service, stored, receipts, logs } = setup();
      const png = { originalname: 'firma.png', mimetype: 'image/png', buffer: PNG, size: PNG.length };

      const delivery = await service.uploadDeliveryReceipt({ deliveryId: DELIVERY_ID, file: png });

      assert.equal(stored[0].folder, UPLOAD_FOLDERS.DELIVERY_RECEIPTS);
      assert.equal(delivery.receipts.length, 1);
      assert.equal(receipts[0].documentType, RECEIPT_DOCUMENT_TYPE);
      assert.equal(receipts[0].mimeType, 'image/png');
      assert.match(receipts[0].storedName, /\.png$/);
      assert.match(logs[0][1], /^Comprobante asociado a la entrega /);
    });

    it('permite varios comprobantes en la misma entrega', async () => {
      const { service, receipts } = setup();
      await service.uploadDeliveryReceipt({ deliveryId: DELIVERY_ID, file: pdfFile() });
      await service.uploadDeliveryReceipt({ deliveryId: DELIVERY_ID, file: pdfFile() });
      assert.equal(receipts.length, 2);
      assert.notEqual(receipts[0].storedName, receipts[1].storedName);
    });

    it('DELIVERY_NOT_FOUND / INVALID_ID / FILE_REQUIRED / FILE_TYPE_INVALID', async () => {
      const { service, stored } = setup();
      await assert.rejects(() => service.uploadDeliveryReceipt({ deliveryId: MISSING_ID, file: pdfFile() }), { code: ERROR_CODES.DELIVERY_NOT_FOUND, statusCode: 404 });
      await assert.rejects(() => service.uploadDeliveryReceipt({ deliveryId: '1', file: pdfFile() }), { code: ERROR_CODES.INVALID_ID });
      await assert.rejects(
        () => service.uploadDeliveryReceipt({ deliveryId: DELIVERY_ID, file: undefined }),
        (error) => error.code === ERROR_CODES.FILE_REQUIRED && error.details[0].field === 'receipt'
      );
      await assert.rejects(
        () => service.uploadDeliveryReceipt({ deliveryId: DELIVERY_ID, file: pdfFile({ buffer: Buffer.from('MZ ejecutable'), size: 13 }) }),
        { code: ERROR_CODES.FILE_TYPE_INVALID }
      );
      assert.equal(stored.length, 0);
    });

    it('si falla el registro en la base: borra el archivo', async () => {
      const { service, removed } = setup({ persistFails: true });
      await assert.rejects(() => service.uploadDeliveryReceipt({ deliveryId: DELIVERY_ID, file: pdfFile() }), /mongo caído/);
      assert.equal(removed.length, 1);
    });
  });
});
