import Customer, { ICustomer } from "./customer.model";
import { CreateCustomerInput, UpdateCustomerInput } from "./customer.types";

class CustomerRepository {
  async create(data: CreateCustomerInput): Promise<ICustomer> {
    return Customer.create(data);
  }

  async findById(id: string): Promise<ICustomer | null> {
    return Customer.findById(id);
  }

  async findByPhone(phone: string): Promise<ICustomer | null> {
    return Customer.findOne({ phone });
  }

  async existsByPhone(phone: string, excludeId?: string): Promise<boolean> {
    const query: Record<string, any> = { phone };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const exists = await Customer.exists(query);
    return !!exists;
  }

  async update(id: string, data: UpdateCustomerInput): Promise<ICustomer | null> {
    return Customer.findByIdAndUpdate(id, data, { returnDocument: "after", runValidators: true });
  }

  async find(
    filter: Record<string, any>,
    skip: number,
    limit: number
  ): Promise<ICustomer[]> {
    return Customer.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  async count(filter: Record<string, any>): Promise<number> {
    return Customer.countDocuments(filter);
  }

  async deactivate(id: string): Promise<ICustomer | null> {
    return Customer.findByIdAndUpdate(id, { isActive: false }, { returnDocument: "after" });
  }
}

export default new CustomerRepository();
