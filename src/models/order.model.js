import mongoose from 'mongoose';
import { ORDER_STATUS, ORDER_PRIORITY } from '../constants/index.js';

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [itemSchema], default: [] },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: Object.values(ORDER_STATUS), default: ORDER_STATUS.PENDING },
    priority: { type: String, enum: Object.values(ORDER_PRIORITY), default: ORDER_PRIORITY.NORMAL },
    shippingAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
    },
    isMock: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const OrderModel = mongoose.model('Order', orderSchema);
