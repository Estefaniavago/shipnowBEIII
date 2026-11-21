import fs from 'node:fs/promises';
import path from 'node:path';
import { USER_DOCUMENT_TYPES } from '../constants/index.js';
import { UPLOAD_CATEGORIES, UPLOAD_ROOT } from '../config/multer.config.js';
import {
  DocumentTypeInvalidError,
  FileRequiredError,
  FileSaveError,
  OrderNotFoundError,
  DeliveryNotFoundError,
  UserNotFoundError,
  AppError,
} from '../errors/index.js';
import { noopLogger } from '../utils/noop.logger.js';
import { assertValidId } from '../utils/validators.js';

const DOCUMENT_TYPES = Object.values(USER_DOCUMENT_TYPES);

function presentFile(file) {
  return {
    originalName: file.originalName,
    filename: file.filename,
    path: file.path,
    mimeType: file.mimeType,
    size: file.size,
    ...(file.documentType ? { documentType: file.documentType } : {}),
    uploadedAt: file.uploadedAt,
  };
}

async function removeUploadedFile(filePath) {
  if (!filePath) return;
  await fs.unlink(filePath).catch(() => {});
}

// Las licencias van a su propia carpeta; el resto queda donde las dejó Multer.
async function placeFile(file, category) {
  const directory = path.join(UPLOAD_ROOT, category);
  await fs.mkdir(directory, { recursive: true });
  const target = path.join(directory, file.filename);
  if (path.resolve(file.path) !== path.resolve(target)) await fs.rename(file.path, target);
  return target;
}

function relativePath(absolutePath) {
  return path.relative(UPLOAD_ROOT, absolutePath).split(path.sep).join('/');
}

export class UploadService {
  constructor({ userRepository, orderRepository, deliveryRepository, logger = noopLogger }) {
    this.logger = logger;
    this.targets = {
      user: {
        field: 'documents',
        category: UPLOAD_CATEGORIES.USER_DOCUMENTS,
        add: (id, file) => userRepository.addDocument(id, file),
        notFound: (id) => new UserNotFoundError(id),
      },
      order: {
        field: 'receipts',
        category: UPLOAD_CATEGORIES.ORDER_RECEIPTS,
        add: (id, file) => orderRepository.addReceipt(id, file),
        notFound: (id) => new OrderNotFoundError(id),
      },
      delivery: {
        field: 'receipts',
        category: UPLOAD_CATEGORIES.DELIVERY_RECEIPTS,
        add: (id, file) => deliveryRepository.addReceipt(id, file),
        notFound: (id) => new DeliveryNotFoundError(id),
      },
    };
  }

  async attachUserDocument({ userId, file, documentType }) {
    return this.#attach({ entityType: 'user', entityId: userId, file, documentType });
  }

  async attachOrderReceipt({ orderId, file }) {
    return this.#attach({ entityType: 'order', entityId: orderId, file });
  }

  async attachDeliveryReceipt({ deliveryId, file }) {
    return this.#attach({ entityType: 'delivery', entityId: deliveryId, file });
  }

  async #attach({ entityType, entityId, file, documentType }) {
    if (!file) throw new FileRequiredError();

    const target = this.targets[entityType];
    let storedPath = file.path;

    try {
      assertValidId(entityId);
      if (entityType === 'user' && !DOCUMENT_TYPES.includes(documentType)) {
        throw new DocumentTypeInvalidError(documentType, DOCUMENT_TYPES);
      }

      const category = entityType === 'user' && documentType === USER_DOCUMENT_TYPES.DRIVER_LICENSE
        ? UPLOAD_CATEGORIES.USER_LICENSES
        : target.category;
      storedPath = await placeFile(file, category);

      const metadata = {
        originalName: file.originalname,
        filename: file.filename,
        path: relativePath(storedPath),
        mimeType: file.mimetype,
        size: file.size,
        ...(documentType ? { documentType } : {}),
        uploadedAt: new Date(),
      };

      const updated = await target.add(entityId, metadata);
      if (!updated) throw target.notFound(entityId);

      const saved = presentFile(updated[target.field].at(-1));
      this.logger.info(`Archivo cargado: ${saved.filename} (${entityType} ${entityId})`, {
        entityType,
        entityId: String(entityId),
        path: saved.path,
        documentType: saved.documentType,
      });
      if (entityType !== 'user') {
        const label = entityType === 'order' ? 'pedido' : 'entrega';
        this.logger.info(`Comprobante asociado a ${label} ${entityId}: ${saved.filename}`, {
          entityType,
          entityId: String(entityId),
          filename: saved.filename,
        });
      }

      return {
        entityId: String(updated._id),
        entityType,
        file: saved,
        files: updated[target.field].map(presentFile),
      };
    } catch (error) {
      await removeUploadedFile(storedPath);
      if (storedPath !== file.path) await removeUploadedFile(file.path);
      if (error instanceof AppError) throw error;
      throw new FileSaveError(error);
    }
  }
}
