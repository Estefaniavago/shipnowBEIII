import { expect } from 'chai';
import { api } from './helpers/api.js';
import { expectError, expectSuccess, expectObjectId, expectIsoDate, expectUserShape } from './helpers/assertions.js';
import { createUser, NON_EXISTENT_ID, INVALID_ID } from './helpers/factories.js';
import {
  PDF, PNG, JPEG, TEXT, MAX_FILE_SIZE_BYTES, oversizedPdf, listUploadedFiles, readUploadedFile, blockUploadFolder,
} from './helpers/fixtures.js';
import { DOCUMENT_TYPES, UPLOAD_FOLDERS, ALLOWED_FILE_TYPES } from '../../src/constants/index.js';
import { ERROR_CODES } from '../../src/errors/index.js';

const METADATA_KEYS = ['_id', 'originalName', 'storedName', 'path', 'mimeType', 'size', 'documentType', 'uploadedAt'];

// POST multipart: archivo en el campo "document" y, opcionalmente, el campo "documentType".
function uploadDocument(userId, { file = PDF, filename = 'dni.pdf', contentType = 'application/pdf', field = 'document', documentType } = {}) {
  let request = api().post(`/api/users/${userId}/documents`);
  if (documentType !== undefined) request = request.field('documentType', documentType);
  if (file) request = request.attach(field, file, { filename, contentType });
  return request;
}

describe('User documents - POST /api/users/:id/documents (multipart/form-data)', () => {
  describe('carga correcta', () => {
    it('201: guarda el archivo, registra los metadatos y devuelve el usuario actualizado', async () => {
      const created = await createUser();

      const user = expectSuccess(await uploadDocument(created._id, { documentType: DOCUMENT_TYPES.ID_CARD }), 201);

      expectUserShape(user);
      expect(user._id).to.equal(created._id);
      expect(user.documents).to.have.lengthOf(1);
      const doc = user.documents[0];
      expect(doc).to.have.all.keys(...METADATA_KEYS);
      expectObjectId(doc._id);
      expect(doc.originalName).to.equal('dni.pdf');
      expect(doc.mimeType).to.equal('application/pdf');
      expect(doc.size).to.equal(PDF.length);
      expect(doc.documentType).to.equal(DOCUMENT_TYPES.ID_CARD);
      expect(doc.storedName).to.match(/^\d+-[0-9a-f-]{36}\.pdf$/);
      expect(doc.storedName).to.not.equal(doc.originalName);
      expect(doc.path).to.equal(`${UPLOAD_FOLDERS.USER_DOCUMENTS}/${doc.storedName}`);
      expectIsoDate(doc.uploadedAt);
    });

    it('el archivo queda guardado en la carpeta del servidor con el mismo contenido', async () => {
      const created = await createUser();
      const user = expectSuccess(await uploadDocument(created._id), 201);

      expect(await listUploadedFiles()).to.deep.equal([user.documents[0].path]);
      expect((await readUploadedFile(user.documents[0].path)).equals(PDF)).to.equal(true);
    });

    it('DRIVER_LICENSE se guarda en la carpeta licenses/', async () => {
      const created = await createUser();
      const user = expectSuccess(
        await uploadDocument(created._id, { documentType: DOCUMENT_TYPES.DRIVER_LICENSE, filename: 'licencia.pdf' }),
        201
      );

      const doc = user.documents[0];
      expect(doc.documentType).to.equal(DOCUMENT_TYPES.DRIVER_LICENSE);
      expect(doc.path.startsWith(`${UPLOAD_FOLDERS.LICENSES}/`)).to.equal(true);
      expect(await listUploadedFiles()).to.deep.equal([doc.path]);
    });

    it('sin documentType se registra como OTHER', async () => {
      const created = await createUser();
      const user = expectSuccess(await uploadDocument(created._id), 201);
      expect(user.documents[0].documentType).to.equal(DOCUMENT_TYPES.OTHER);
    });

    [
      ['PNG', PNG, 'foto.png', 'image/png', '.png'],
      ['JPEG', JPEG, 'foto.jpg', 'image/jpeg', '.jpg'],
    ].forEach(([label, file, filename, contentType, extension]) => {
      it(`201: acepta imágenes ${label}`, async () => {
        const created = await createUser();
        const user = expectSuccess(
          await uploadDocument(created._id, { file, filename, contentType, documentType: DOCUMENT_TYPES.PROOF_OF_ADDRESS }),
          201
        );
        expect(user.documents[0]).to.include({ mimeType: contentType, size: file.length });
        expect(user.documents[0].storedName.endsWith(extension)).to.equal(true);
      });
    });

    it('en la base se guardan solo los metadatos (nunca el contenido del archivo)', async () => {
      const created = await createUser();
      await uploadDocument(created._id);

      const user = expectSuccess(await api().get(`/api/users/${created._id}`));
      expect(user.documents).to.have.lengthOf(1);
      expect(user.documents[0]).to.have.all.keys(...METADATA_KEYS);
      expect(JSON.stringify(user)).to.not.include('%PDF');
      expect(ALLOWED_FILE_TYPES).to.have.property(user.documents[0].mimeType);
    });

    it('acumula varios documentos del mismo usuario, cada uno con su archivo', async () => {
      const created = await createUser();
      await uploadDocument(created._id, { documentType: DOCUMENT_TYPES.ID_CARD });
      const user = expectSuccess(await uploadDocument(created._id, { documentType: DOCUMENT_TYPES.DRIVER_LICENSE }), 201);

      expect(user.documents).to.have.lengthOf(2);
      expect(user.documents[0].storedName).to.not.equal(user.documents[1].storedName);
      expect(await listUploadedFiles()).to.have.members(user.documents.map((d) => d.path));
    });

    it('los documentos no se pueden pisar con PUT /api/users/:id', async () => {
      const created = await createUser();
      await uploadDocument(created._id);

      expectSuccess(await api().put(`/api/users/${created._id}`).send({ name: 'Nuevo', documents: [] }));

      const user = expectSuccess(await api().get(`/api/users/${created._id}`));
      expect(user.name).to.equal('Nuevo');
      expect(user.documents).to.have.lengthOf(1);
    });
  });

  describe('errores', () => {
    const expectNothingStored = async (userId) => {
      expect(await listUploadedFiles(), 'no debe quedar ningún archivo en disco').to.deep.equal([]);
      const user = expectSuccess(await api().get(`/api/users/${userId}`));
      expect(user.documents, 'no debe haber metadatos registrados').to.deep.equal([]);
    };

    it('400 FILE_REQUIRED: no se envía ningún archivo (multipart solo con documentType)', async () => {
      const created = await createUser();
      const body = expectError(await uploadDocument(created._id, { file: null, documentType: DOCUMENT_TYPES.ID_CARD }), {
        status: 400, code: ERROR_CODES.FILE_REQUIRED, path: `/api/users/${created._id}/documents`,
      });
      expect(body.details[0]).to.include({ field: 'document' });
      await expectNothingStored(created._id);
    });

    it('400 FILE_REQUIRED: la petición ni siquiera es multipart (JSON)', async () => {
      const created = await createUser();
      expectError(await api().post(`/api/users/${created._id}/documents`).send({ documentType: 'ID_CARD' }), {
        status: 400, code: ERROR_CODES.FILE_REQUIRED,
      });
    });

    it('400 UNEXPECTED_FILE_FIELD: el archivo se envía en un campo distinto a "document"', async () => {
      const created = await createUser();
      const body = expectError(await uploadDocument(created._id, { field: 'file' }), {
        status: 400, code: ERROR_CODES.UNEXPECTED_FILE_FIELD,
      });
      expect(body.details[0]).to.deep.equal({ expected: 'document', received: 'file' });
      await expectNothingStored(created._id);
    });

    it('400 UNEXPECTED_FILE_FIELD: se envían dos archivos en el campo "document"', async () => {
      const created = await createUser();
      expectError(
        await api().post(`/api/users/${created._id}/documents`)
          .attach('document', PDF, { filename: 'a.pdf', contentType: 'application/pdf' })
          .attach('document', PDF, { filename: 'b.pdf', contentType: 'application/pdf' }),
        { status: 400, code: ERROR_CODES.UNEXPECTED_FILE_FIELD }
      );
      await expectNothingStored(created._id);
    });

    it('400 DOCUMENT_TYPE_INVALID: tipo de documento fuera de los permitidos', async () => {
      const created = await createUser();
      const body = expectError(await uploadDocument(created._id, { documentType: 'SELFIE' }), {
        status: 400, code: ERROR_CODES.DOCUMENT_TYPE_INVALID,
      });
      expect(body.details[0].allowed).to.have.members(Object.values(DOCUMENT_TYPES));
      expect(body.details[0]).to.include({ field: 'documentType', value: 'SELFIE' });
      await expectNothingStored(created._id);
    });

    it('415 FILE_TYPE_INVALID: tipo de archivo no permitido (texto plano)', async () => {
      const created = await createUser();
      const body = expectError(
        await uploadDocument(created._id, { file: TEXT, filename: 'notas.txt', contentType: 'text/plain' }),
        { status: 415, code: ERROR_CODES.FILE_TYPE_INVALID }
      );
      expect(body.details[0]).to.include({ mimeType: 'text/plain' });
      expect(body.details[0].allowed).to.have.members(Object.keys(ALLOWED_FILE_TYPES));
      await expectNothingStored(created._id);
    });

    it('415 FILE_TYPE_INVALID: ejecutable', async () => {
      const created = await createUser();
      expectError(
        await uploadDocument(created._id, { file: Buffer.from('MZ\x90\x00'), filename: 'virus.exe', contentType: 'application/x-msdownload' }),
        { status: 415, code: ERROR_CODES.FILE_TYPE_INVALID }
      );
      await expectNothingStored(created._id);
    });

    it('415 FILE_TYPE_INVALID: el archivo dice ser PDF pero su contenido no lo es (falsificado)', async () => {
      const created = await createUser();
      expectError(
        await uploadDocument(created._id, { file: TEXT, filename: 'falso.pdf', contentType: 'application/pdf' }),
        { status: 415, code: ERROR_CODES.FILE_TYPE_INVALID }
      );
      await expectNothingStored(created._id);
    });

    it('413 FILE_TOO_LARGE: el archivo supera el tamaño máximo', async () => {
      const created = await createUser();
      const body = expectError(await uploadDocument(created._id, { file: oversizedPdf(), filename: 'enorme.pdf' }), {
        status: 413, code: ERROR_CODES.FILE_TOO_LARGE,
      });
      expect(body.details[0]).to.include({ maxBytes: MAX_FILE_SIZE_BYTES });
      await expectNothingStored(created._id);
    });

    it('404 USER_NOT_FOUND: el usuario no existe (y no se guarda el archivo)', async () => {
      const body = expectError(await uploadDocument(NON_EXISTENT_ID), { status: 404, code: ERROR_CODES.USER_NOT_FOUND });
      expect(body.details[0]).to.include({ field: 'id', value: NON_EXISTENT_ID });
      expect(await listUploadedFiles()).to.deep.equal([]);
    });

    it('400 INVALID_ID: id de usuario con formato inválido', async () => {
      expectError(await uploadDocument(INVALID_ID), { status: 400, code: ERROR_CODES.INVALID_ID });
      expect(await listUploadedFiles()).to.deep.equal([]);
    });

    it('500 FILE_SAVE_FAILED: falla al guardar en disco y no se registran metadatos', async () => {
      const created = await createUser();
      await blockUploadFolder(UPLOAD_FOLDERS.USER_DOCUMENTS);

      const body = expectError(await uploadDocument(created._id), { status: 500, code: ERROR_CODES.FILE_SAVE_FAILED });
      expect(body.message).to.equal('Error al guardar el archivo en el servidor');

      const user = expectSuccess(await api().get(`/api/users/${created._id}`));
      expect(user.documents).to.deep.equal([]);
    });
  });
});
