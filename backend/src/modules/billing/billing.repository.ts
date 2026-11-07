import Bill, { IBill } from "./bill.model";

class BillingRepository {
  async create(data: Partial<IBill>): Promise<IBill> {
    return Bill.create(data);
  }

  async findById(id: string): Promise<IBill | null> {
    return Bill.findById(id).populate("customer", "name phone address email");
  }

  async findByCustomerAndPeriod(customerId: string, billingPeriod: string): Promise<IBill | null> {
    return Bill.findOne({ customer: customerId, billingPeriod }).populate("customer", "name phone address email");
  }

  async find(
    filter: Record<string, any>,
    skip: number,
    limit: number
  ): Promise<IBill[]> {
    return Bill.find(filter)
      .sort({ billingYear: -1, billingMonth: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("customer", "name phone address email");
  }

  async count(filter: Record<string, any>): Promise<number> {
    return Bill.countDocuments(filter);
  }

  async findByCustomerId(customerId: string): Promise<IBill[]> {
    return Bill.find({ customer: customerId })
      .sort({ billingYear: -1, billingMonth: -1 })
      .populate("customer", "name phone address email");
  }
}

export default new BillingRepository();
