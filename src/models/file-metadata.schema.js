import mongoose from 'mongoose';
import { DOCUMENT_TYPES, RECEIPT_DOCUMENT_TYPE } from '../constants/index.js';

// En la base se guardan SOLO los metadatos del archivo; el archivo vive en el disco del servidor.
export const fileMetadataSchema = new mongoose.Schema({
  originalName: { type: String, required: true },
  storedName: { type: String, required: true },
  path: { type: String, required: true }, // relativa a la carpeta de uploads
  mimeType: { type: String, required: true },
  size: { type: Number, required: true, min: 0 }, // bytes
  documentType: {
    type: String,
    required: true,
    enum: [...Object.values(DOCUMENT_TYPES), RECEIPT_DOCUMENT_TYPE],
  },
  uploadedAt: { type: Date, default: Date.now },
});
