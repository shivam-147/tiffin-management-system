import mongoose from "mongoose";
import customerRepository from "./customer.repository";
import {
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerQueryInput,
} from "./customer.types";
import { AppError } from "../../errors/app-error";
import { HTTP_STATUS } from "../../constants/http-status.constants";
import { ERROR_CODES } from "../../constants/error-code.constants";

class CustomerService {
  async createCustomer(data: CreateCustomerInput) {
    const existing = await customerRepository.findByPhone(data.phone);
    if (existing) {
      throw new AppError(
        "A customer with this mobile number already exists",
        HTTP_STATUS.CONFLICT,
        ERROR_CODES.DUPLICATE_ENTRY,
        [
          {
            field: "phone",
            code: "DUPLICATE_VALUE",
            message: "Phone number is already registered to another customer",
            location: "body",
          },
        ]
      );
    }

    return customerRepository.create({
      name: data.name,
      phone: data.phone,
      address: data.address,
      email: data.email || undefined,
      notes: data.notes || undefined,
    });
  }

  async getCustomers(query: CustomerQueryInput) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    if (query.search && query.search.trim().length > 0) {
      const searchRegex = new RegExp(query.search.trim(), "i");
      filter.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { address: searchRegex },
      ];
    }

    const [items, total] = await Promise.all([
      customerRepository.find(filter, skip, limit),
      customerRepository.count(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      customers: items,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async getCustomerById(id: string) {
    const customer = await customerRepository.findById(id);
    if (!customer) {
      throw new AppError(
        "Customer not found",
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND
      );
    }
    return customer;
  }

  async updateCustomer(id: string, data: UpdateCustomerInput) {
    const customer = await customerRepository.findById(id);
    if (!customer) {
      throw new AppError(
        "Customer not found",
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND
      );
    }

    if (data.phone && data.phone !== customer.phone) {
      const isDuplicate = await customerRepository.existsByPhone(data.phone, id);
      if (isDuplicate) {
        throw new AppError(
          "A customer with this mobile number already exists",
          HTTP_STATUS.CONFLICT,
          ERROR_CODES.DUPLICATE_ENTRY,
          [
            {
              field: "phone",
              code: "DUPLICATE_VALUE",
              message: "Phone number is already registered to another customer",
              location: "body",
            },
          ]
        );
      }
    }

    const updated = await customerRepository.update(id, data);
    return updated;
  }

  async deactivateCustomer(id: string) {
    const customer = await customerRepository.findById(id);
    if (!customer) {
      throw new AppError(
        "Customer not found",
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND
      );
    }

    // Edge case check: customer has an active package
    const subscriptionCollection = mongoose.connection.collection("subscriptions");
    const activePackage = await subscriptionCollection.findOne({
      customer: new mongoose.Types.ObjectId(id),
      status: { $in: ["ACTIVE", "PAUSED"] },
    });

    if (activePackage) {
      throw new AppError(
        "Cannot deactivate customer with an active or paused tiffin package. Please complete or cancel the package first.",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.BAD_REQUEST,
        [
          {
            field: "id",
            code: "BUSINESS_ERROR",
            message: "Customer has an active or paused subscription package",
            location: "params",
          },
        ]
      );
    }

    return customerRepository.deactivate(id);
  }
}

export default new CustomerService();
