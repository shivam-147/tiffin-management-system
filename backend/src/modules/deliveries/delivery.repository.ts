import Delivery, { IDelivery, DeliveryStatus } from "./delivery.model";

class DeliveryRepository {
  async create(data: Partial<IDelivery>): Promise<IDelivery> {
    return Delivery.create(data);
  }

  async findById(id: string): Promise<IDelivery | null> {
    return Delivery.findById(id)
      .populate("customer", "name phone address isActive")
      .populate("subscription", "pricePerTiffin totalTiffins deliveredQuantity remainingQuantity status");
  }

  async findByCustomerAndDate(customerId: string, dateString: string): Promise<IDelivery | null> {
    return Delivery.findOne({ customer: customerId, dateString });
  }

  async find(
    filter: Record<string, any>,
    skip: number,
    limit: number
  ): Promise<IDelivery[]> {
    return Delivery.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("customer", "name phone address isActive")
      .populate("subscription", "pricePerTiffin totalTiffins deliveredQuantity remainingQuantity status");
  }

  async count(filter: Record<string, any>): Promise<number> {
    return Delivery.countDocuments(filter);
  }

  async updateStatus(
    id: string,
    status: DeliveryStatus,
    notes?: string
  ): Promise<IDelivery | null> {
    const updateObj: Record<string, any> = { status };
    if (notes !== undefined) {
      updateObj.notes = notes;
    }
    return Delivery.findByIdAndUpdate(id, updateObj, { new: true })
      .populate("customer", "name phone address isActive")
      .populate("subscription", "pricePerTiffin totalTiffins deliveredQuantity remainingQuantity status");
  }
}

export default new DeliveryRepository();
