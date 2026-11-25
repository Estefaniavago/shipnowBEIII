import mongoose from 'mongoose';
import { DELIVERY_STATUS } from '../constants/index.js';
import { fileMetadataSchema } from './file-metadata.schema.js';

const deliverySchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    // Usuario con rol COURIER. Null mientras la entrega no fue asignada.
    courier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: Object.values(DELIVERY_STATUS), default: DELIVERY_STATUS.PENDING },
    trackingCode: { type: String, required: true },
    scheduledAt: { type: Date, required: true },
    deliveredAt: { type: Date, default: null },
    receipts: { type: [fileMetadataSchema], default: [] },
    isMock: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Una entrega por pedido (también hace rápida la búsqueda por pedido) + filtros del listado.
deliverySchema.index({ order: 1 }, { unique: true });
deliverySchema.index({ status: 1, createdAt: -1 });
deliverySchema.index({ courier: 1, createdAt: -1 });

export const DeliveryModel = mongoose.model('Delivery', deliverySchema);
