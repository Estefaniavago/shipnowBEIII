import { DeliveryModel } from '../models/delivery.model.js';

class DeliveryRepository {
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
