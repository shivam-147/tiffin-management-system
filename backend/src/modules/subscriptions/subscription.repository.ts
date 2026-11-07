import Subscription, { ISubscription } from "./subscription.model";

class SubscriptionRepository {
  async create(data: Partial<ISubscription>): Promise<ISubscription> {
    return Subscription.create(data);
  }

  async findById(id: string): Promise<ISubscription | null> {
    return Subscription.findById(id).populate("customer", "name phone address email isActive");
  }

  async findActiveByCustomerId(customerId: string): Promise<ISubscription | null> {
    return Subscription.findOne({
      customer: customerId,
      status: { $in: ["ACTIVE", "PAUSED"] },
    }).populate("customer", "name phone address email isActive");
  }

  async findByCustomerId(customerId: string): Promise<ISubscription[]> {
    return Subscription.find({ customer: customerId })
      .sort({ createdAt: -1 })
      .populate("customer", "name phone address email isActive");
  }

  async find(
    filter: Record<string, any>,
    skip: number,
    limit: number
  ): Promise<ISubscription[]> {
    return Subscription.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("customer", "name phone address email isActive");
  }

  async count(filter: Record<string, any>): Promise<number> {
    return Subscription.countDocuments(filter);
  }

  async update(id: string, updateData: Record<string, any>): Promise<ISubscription | null> {
    return Subscription.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
  }
}

export default new SubscriptionRepository();
