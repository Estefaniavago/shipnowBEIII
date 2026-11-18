import { DeliveryModel } from '../models/delivery.model.js';

class DeliveryRepository {
  async create(data) {
    const delivery = await DeliveryModel.create(data);
    return delivery.toObject({ versionKey: false });
  }

  async getAll({ page = 1, limit = 20 } = {}) {
    return DeliveryModel.find({}, '-__v')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async getById(id) {
    return DeliveryModel.findById(id, '-__v').lean();
  }

  async existsByOrder(orderId) {
    return DeliveryModel.exists({ order: orderId });
  }

  async update(id, data) {
    return DeliveryModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
      projection: '-__v',
    }).lean();
  }

  async insertMany(deliveries) {
    const inserted = await DeliveryModel.insertMany(deliveries);
    return inserted.length;
  }

  // De la lista de pedidos recibida, devuelve los ids que ya tienen entrega.
  async getOrderIdsWithDelivery(orderIds) {
    const deliveries = await DeliveryModel.find({ order: { $in: orderIds } }, 'order').lean();
    return deliveries.map((d) => String(d.order));
  }

  async deleteMocks() {
    const { deletedCount } = await DeliveryModel.deleteMany({ isMock: true });
    return deletedCount;
  }
}

export default new DeliveryRepository();
