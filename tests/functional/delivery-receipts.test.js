import { expect } from 'chai';
import { api } from './helpers/api.js';
import { expectError, expectSuccess, expectObjectId, expectIsoDate } from './helpers/assertions.js';
import { createCustomerWithOrder, createDelivery, NON_EXISTENT_ID, INVALID_ID } from './helpers/factories.js';
import {
  PDF, PNG, TEXT, MAX_FILE_SIZE_BYTES, oversizedPdf, listUploadedFiles, readUploadedFile, blockUploadFolder,
} from './helpers/fixtures.js';
import { DELIVERY_STATUS, RECEIPT_DOCUMENT_TYPE, UPLOAD_FOLDERS, ALLOWED_FILE_TYPES } from '../../src/constants/index.js';
import { ERROR_CODES } from '../../src/errors/index.js';

const METADATA_KEYS = ['_id', 'originalName', 'storedName', 'path', 'mimeType', 'size', 'documentType', 'uploadedAt'];

// POST multipart: archivo en el campo "receipt".
function uploadReceipt(deliveryId, { file = PDF, filename = 'comprobante.pdf', contentType = 'application/pdf', field = 'receipt' } = {}) {
  let request = api().post(`/api/deliveries/${deliveryId}/receipts`);
  if (file) request = request.attach(field, file, { filename, contentType });
  return request;
}

async function newDelivery() {
  const { order } = await createCustomerWithOrder();
  return createDelivery(order._id);
}

describe('Delivery receipts - POST /api/deliveries/:id/receipts (multipart/form-data)', () => {
  describe('carga correcta', () => {
    it('201: guarda el comprobante, registra los metadatos y devuelve la entrega actualizada', async () => {
      const created = await newDelivery();

      const delivery = expectSuccess(await uploadReceipt(created._id), 201);

      // la entrega conserva sus datos y suma el comprobante
      expect(delivery).to.include({ _id: created._id, order: created.order, status: DELIVERY_STATUS.PENDING });
      expect(delivery.trackingCode).to.equal(created.trackingCode);
      expect(delivery.receipts).to.have.lengthOf(1);
      const receipt = delivery.receipts[0];
      expect(receipt).to.have.all.keys(...METADATA_KEYS);
      expectObjectId(receipt._id);
      expect(receipt.originalName).to.equal('comprobante.pdf');
      expect(receipt.mimeType).to.equal('application/pdf');
      expect(receipt.size).to.equal(PDF.length);
      expect(receipt.documentType).to.equal(RECEIPT_DOCUMENT_TYPE);
      expect(receipt.storedName).to.match(/^\d+-[0-9a-f-]{36}\.pdf$/);
      expect(receipt.path).to.equal(`${UPLOAD_FOLDERS.DELIVERY_RECEIPTS}/${receipt.storedName}`);
      expectIsoDate(receipt.uploadedAt);
    });

    it('el archivo queda en la carpeta delivery-receipts/ con el mismo contenido', async () => {
      const created = await newDelivery();
      const delivery = expectSuccess(await uploadReceipt(created._id), 201);

      expect(await listUploadedFiles()).to.deep.equal([delivery.receipts[0].path]);
      expect((await readUploadedFile(delivery.receipts[0].path)).equals(PDF)).to.equal(true);
    });

    it('el comprobante queda asociado a la entrega y se ve al consultarla', async () => {
      const created = await newDelivery();
      await uploadReceipt(created._id);

      const delivery = expectSuccess(await api().get(`/api/deliveries/${created._id}`));
      expect(delivery.receipts).to.have.lengthOf(1);
      expect(delivery.receipts[0]).to.have.all.keys(...METADATA_KEYS);
      expect(JSON.stringify(delivery)).to.not.include('%PDF');
    });

    it('201: acepta imágenes PNG', async () => {
      const created = await newDelivery();
      const delivery = expectSuccess(
        await uploadReceipt(created._id, { file: PNG, filename: 'firma.png', contentType: 'image/png' }),
        201
      );
      expect(delivery.receipts[0]).to.include({ mimeType: 'image/png', size: PNG.length });
      expect(delivery.receipts[0].storedName.endsWith('.png')).to.equal(true);
    });

    it('una entrega acepta varios comprobantes, cada uno con su archivo', async () => {
      const created = await newDelivery();
      await uploadReceipt(created._id);
      const delivery = expectSuccess(
        await uploadReceipt(created._id, { file: PNG, filename: 'firma.png', contentType: 'image/png' }),
        201
      );

      expect(delivery.receipts).to.have.lengthOf(2);
      expect(await listUploadedFiles()).to.have.members(delivery.receipts.map((r) => r.path));
    });

    it('subir un comprobante no altera el estado de la entrega', async () => {
      const created = await newDelivery();
      await uploadReceipt(created._id);
      const delivery = expectSuccess(await api().get(`/api/deliveries/${created._id}`));
      expect(delivery.status).to.equal(DELIVERY_STATUS.PENDING);
      expect(delivery.courier).to.equal(null);
    });
  });

  describe('errores', () => {
    const expectNothingStored = async (deliveryId) => {
      expect(await listUploadedFiles(), 'no debe quedar ningún archivo en disco').to.deep.equal([]);
      const delivery = expectSuccess(await api().get(`/api/deliveries/${deliveryId}`));
      expect(delivery.receipts, 'no debe haber metadatos registrados').to.deep.equal([]);
    };

    it('400 FILE_REQUIRED: no se envía ningún archivo', async () => {
      const created = await newDelivery();
      const body = expectError(await uploadReceipt(created._id, { file: null }), {
        status: 400, code: ERROR_CODES.FILE_REQUIRED, path: `/api/deliveries/${created._id}/receipts`,
      });
      expect(body.details[0]).to.include({ field: 'receipt' });
      await expectNothingStored(created._id);
    });

    it('400 UNEXPECTED_FILE_FIELD: el archivo se envía en un campo distinto a "receipt"', async () => {
      const created = await newDelivery();
      const body = expectError(await uploadReceipt(created._id, { field: 'document' }), {
        status: 400, code: ERROR_CODES.UNEXPECTED_FILE_FIELD,
      });
      expect(body.details[0]).to.deep.equal({ expected: 'receipt', received: 'document' });
      await expectNothingStored(created._id);
    });

    it('415 FILE_TYPE_INVALID: tipo de archivo no permitido', async () => {
      const created = await newDelivery();
      const body = expectError(
        await uploadReceipt(created._id, { file: TEXT, filename: 'notas.txt', contentType: 'text/plain' }),
        { status: 415, code: ERROR_CODES.FILE_TYPE_INVALID }
      );
      expect(body.details[0].allowed).to.have.members(Object.keys(ALLOWED_FILE_TYPES));
      await expectNothingStored(created._id);
    });

    it('415 FILE_TYPE_INVALID: contenido que no coincide con el tipo declarado', async () => {
      const created = await newDelivery();
      expectError(await uploadReceipt(created._id, { file: TEXT, filename: 'falso.pdf', contentType: 'application/pdf' }), {
        status: 415, code: ERROR_CODES.FILE_TYPE_INVALID,
      });
      await expectNothingStored(created._id);
    });

    it('413 FILE_TOO_LARGE: el archivo supera el tamaño máximo', async () => {
      const created = await newDelivery();
      const body = expectError(await uploadReceipt(created._id, { file: oversizedPdf(), filename: 'enorme.pdf' }), {
        status: 413, code: ERROR_CODES.FILE_TOO_LARGE,
      });
      expect(body.details[0]).to.include({ maxBytes: MAX_FILE_SIZE_BYTES });
      await expectNothingStored(created._id);
    });

    it('404 DELIVERY_NOT_FOUND: la entrega no existe (y no se guarda el archivo)', async () => {
      const body = expectError(await uploadReceipt(NON_EXISTENT_ID), { status: 404, code: ERROR_CODES.DELIVERY_NOT_FOUND });
      expect(body.details[0]).to.include({ field: 'id', value: NON_EXISTENT_ID });
      expect(await listUploadedFiles()).to.deep.equal([]);
    });

    it('400 INVALID_ID: id de entrega con formato inválido', async () => {
      expectError(await uploadReceipt(INVALID_ID), { status: 400, code: ERROR_CODES.INVALID_ID });
      expect(await listUploadedFiles()).to.deep.equal([]);
    });

    it('500 FILE_SAVE_FAILED: falla al guardar en disco y no se registran metadatos', async () => {
      const created = await newDelivery();
      await blockUploadFolder(UPLOAD_FOLDERS.DELIVERY_RECEIPTS);

      expectError(await uploadReceipt(created._id), { status: 500, code: ERROR_CODES.FILE_SAVE_FAILED });

      const delivery = expectSuccess(await api().get(`/api/deliveries/${created._id}`));
      expect(delivery.receipts).to.deep.equal([]);
    });
  });
});
