import {
  DOCUMENT_TYPES,
  RECEIPT_DOCUMENT_TYPE,
  UPLOAD_FIELDS,
  UPLOAD_FOLDERS,
} from '../constants/index.js';
import {
  DeliveryNotFoundError,
  DocumentTypeInvalidError,
  FileRequiredError,
  FileTypeInvalidError,
  UserNotFoundError,
} from '../errors/index.js';
import {
  ALLOWED_MIME_TYPES,
  detectMimeType,
  generateStoredName,
  resolveFolder,
  sanitizeOriginalName,
} from '../config/upload.rules.js';
import { assertValidId } from '../utils/validators.js';
import { noopLogger } from '../utils/noop.logger.js';

const validDocumentTypes = Object.values(DOCUMENT_TYPES);

export class DocumentService {
  constructor({ userRepository, deliveryRepository, fileStorage, logger = noopLogger }) {
    this.userRepository = userRepository;
    this.deliveryRepository = deliveryRepository;
    this.fileStorage = fileStorage;
    this.logger = logger;
  }

  // Documento de un usuario (DNI, licencia, etc.). Devuelve el usuario actualizado.
  async uploadUserDocument({ userId, file, documentType }) {
    assertValidId(userId);
    const user = await this.userRepository.getById(userId);
    if (!user) throw new UserNotFoundError(userId);

    this.#assertFile(file, UPLOAD_FIELDS.USER_DOCUMENT);
    const type = this.#resolveDocumentType(documentType);
    const mimeType = this.#assertFileContent(file);

    const metadata = await this.#store({ file, mimeType, documentType: type, folder: resolveFolder(type) });
    const updated = await this.#register(metadata, () => this.userRepository.addDocument(userId, metadata), () => new UserNotFoundError(userId));

    this.logger.info(
      `Documento de usuario cargado: ${metadata.path} (usuario ${userId}, tipo ${type}, ${metadata.size} bytes)`
    );
    return updated;
  }

  // Comprobante de una entrega. Devuelve la entrega actualizada.
  async uploadDeliveryReceipt({ deliveryId, file }) {
    assertValidId(deliveryId);
    const delivery = await this.deliveryRepository.getById(deliveryId);
    if (!delivery) throw new DeliveryNotFoundError(deliveryId);

    this.#assertFile(file, UPLOAD_FIELDS.DELIVERY_RECEIPT);
    const mimeType = this.#assertFileContent(file);

    const metadata = await this.#store({
      file, mimeType, documentType: RECEIPT_DOCUMENT_TYPE, folder: UPLOAD_FOLDERS.DELIVERY_RECEIPTS,
    });
    const updated = await this.#register(metadata, () => this.deliveryRepository.addReceipt(deliveryId, metadata), () => new DeliveryNotFoundError(deliveryId));

    this.logger.info(
      `Comprobante asociado a la entrega ${deliveryId}: ${metadata.path} (${metadata.size} bytes)`
    );
    return updated;
  }

  // ---------- validaciones ----------

  #assertFile(file, field) {
    if (!file) throw new FileRequiredError(field);
  }

  // documentType es opcional: si no se envía, se usa OTHER; si se envía, debe ser válido.
  #resolveDocumentType(documentType) {
    if (documentType === undefined || documentType === null || documentType === '') return DOCUMENT_TYPES.OTHER;
    if (!validDocumentTypes.includes(documentType)) {
      throw new DocumentTypeInvalidError(documentType, validDocumentTypes);
    }
    return documentType;
  }

  // El tipo se verifica por el contenido real (firma del archivo), no solo por lo que declara el cliente.
  #assertFileContent(file) {
    const detected = detectMimeType(file.buffer);
    if (!detected || detected !== file.mimetype) {
      throw new FileTypeInvalidError(
        detected ? `${file.mimetype} (el contenido es ${detected})` : `${file.mimetype} (contenido no reconocido)`,
        ALLOWED_MIME_TYPES
      );
    }
    return detected;
  }

  // ---------- guardado ----------

  async #store({ file, mimeType, documentType, folder }) {
    const storedName = generateStoredName(mimeType);
    const relativePath = await this.fileStorage.save({ folder, storedName, buffer: file.buffer });
    return {
      originalName: sanitizeOriginalName(file.originalname),
      storedName,
      path: relativePath,
      mimeType,
      size: file.size ?? file.buffer.length,
      documentType,
      uploadedAt: new Date(),
    };
  }

  // Registra los metadatos; si falla (o la entidad desapareció), borra el archivo para no dejarlo huérfano.
  async #register(metadata, persist, notFoundError) {
    try {
      const updated = await persist();
      if (!updated) throw notFoundError();
      return updated;
    } catch (error) {
      await this.#discard(metadata.path);
      throw error;
    }
  }

  async #discard(relativePath) {
    try {
      await this.fileStorage.remove(relativePath);
      this.logger.warning(`No se pudieron registrar los metadatos; se eliminó el archivo ${relativePath}`);
    } catch (removeError) {
      this.logger.error(`No se pudo eliminar el archivo huérfano ${relativePath}`, { stack: removeError.stack });
    }
  }
}
