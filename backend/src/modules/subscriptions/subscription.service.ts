import subscriptionRepository from "./subscription.repository";
import customerRepository from "../customers/customer.repository";
import {
  CreateSubscriptionInput,
  PauseSubscriptionInput,
  ResumeSubscriptionInput,
  SubscriptionQueryInput,
} from "./subscription.types";
import { AppError } from "../../errors/app-error";
import { HTTP_STATUS } from "../../constants/http-status.constants";
import { ERROR_CODES } from "../../constants/error-code.constants";

class SubscriptionService {
  async createSubscription(data: CreateCustomerSubscriptionInput) {
    // 1. Verify customer exists and is active
    const customer = await customerRepository.findById(data.customerId);
    if (!customer) {
      throw new AppError(
        "Customer not found",
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND
      );
    }

    if (!customer.isActive) {
      throw new AppError(
        "Cannot create a package for an inactive customer",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.BAD_REQUEST,
        [
          {
            field: "customerId",
            code: "BUSINESS_ERROR",
            message: "Customer account is inactive",
            location: "body",
          },
        ]
      );
    }

    // 2. Business rule: prevent multiple active or paused packages for the same customer
    const existingActive = await subscriptionRepository.findActiveByCustomerId(data.customerId);
    if (existingActive) {
      throw new AppError(
        `Customer already has an ${existingActive.status.toLowerCase()} package. Complete or cancel it before starting a new one.`,
        HTTP_STATUS.CONFLICT,
        ERROR_CODES.CONFLICT,
        [
          {
            field: "customerId",
            code: "BUSINESS_ERROR",
            message: `Active package ${existingActive._id} already exists with ${existingActive.remainingQuantity} remaining tiffins`,
            location: "body",
          },
        ]
      );
    }

    // 3. Compute monetary values securely on the backend
    const pricePerTiffin = Number(data.pricePerTiffin);
    const totalTiffins = Number(data.totalTiffins);
    const totalAmount = Math.round(pricePerTiffin * totalTiffins * 100) / 100;
    const startDate = data.startDate ? new Date(data.startDate) : new Date();

    const mealsPerDay = Number(data.mealsPerDay) || 1;
    const defaultMealTypes =
      data.mealTypes && data.mealTypes.length > 0
        ? data.mealTypes
        : mealsPerDay === 1
        ? ["LUNCH"]
        : mealsPerDay === 2
        ? ["LUNCH", "DINNER"]
        : ["BREAKFAST", "LUNCH", "DINNER"];

    return subscriptionRepository.create({
      customer: customer._id as any,
      packageCatalog: (data.packageCatalogId as any) || undefined,
      packageName: data.packageName || "Standard Package",
      pricePerTiffin,
      totalTiffins,
      deliveredQuantity: 0,
      remainingQuantity: totalTiffins,
      totalAmount,
      advancePaid: Number(data.advancePaid) || 0,
      mealsPerDay,
      mealTypes: defaultMealTypes,
      status: "ACTIVE",
      startDate,
      notes: data.notes || undefined,
    });
  }

  async getSubscriptions(query: SubscriptionQueryInput) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (query.customerId) {
      filter.customer = query.customerId;
    }

    if (query.status && query.status !== "ALL") {
      filter.status = query.status;
    }

    const [items, total] = await Promise.all([
      subscriptionRepository.find(filter, skip, limit),
      subscriptionRepository.count(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      subscriptions: items,
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

  async getSubscriptionById(id: string) {
    const subscription = await subscriptionRepository.findById(id);
    if (!subscription) {
      throw new AppError(
        "Subscription package not found",
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND
      );
    }
    return subscription;
  }

  async getCustomerActiveSubscription(customerId: string) {
    const customer = await customerRepository.findById(customerId);
    if (!customer) {
      throw new AppError(
        "Customer not found",
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND
      );
    }

    const activeSubscription = await subscriptionRepository.findActiveByCustomerId(customerId);
    return activeSubscription;
  }

  async getCustomerPackageHistory(customerId: string) {
    const customer = await customerRepository.findById(customerId);
    if (!customer) {
      throw new AppError(
        "Customer not found",
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND
      );
    }

    return subscriptionRepository.findByCustomerId(customerId);
  }

  async pauseSubscription(id: string, data: PauseSubscriptionInput) {
    const subscription = await subscriptionRepository.findById(id);
    if (!subscription) {
      throw new AppError(
        "Subscription package not found",
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND
      );
    }

    if (subscription.status === "PAUSED") {
      throw new AppError(
        "Package is already paused",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.BAD_REQUEST
      );
    }

    if (subscription.status !== "ACTIVE") {
      throw new AppError(
        `Cannot pause a package with status ${subscription.status}`,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.BAD_REQUEST
      );
    }

    const pausedAt = new Date();
    const expectedResumeDate = data.expectedResumeDate ? new Date(data.expectedResumeDate) : undefined;

    subscription.status = "PAUSED";
    subscription.pauseHistory.push({
      pausedAt,
      expectedResumeDate,
      reason: data.reason,
    });

    await subscription.save();
    return subscription;
  }

  async resumeSubscription(id: string, data: ResumeSubscriptionInput) {
    const subscription = await subscriptionRepository.findById(id);
    if (!subscription) {
      throw new AppError(
        "Subscription package not found",
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND
      );
    }

    if (subscription.status === "ACTIVE") {
      throw new AppError(
        "Package is already active",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.BAD_REQUEST
      );
    }

    if (subscription.status !== "PAUSED") {
      throw new AppError(
        `Cannot resume a package with status ${subscription.status}`,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.BAD_REQUEST
      );
    }

    const resumedAt = data.resumeDate ? new Date(data.resumeDate) : new Date();

    // Close the latest open pause entry
    if (subscription.pauseHistory.length > 0) {
      const lastPause = subscription.pauseHistory[subscription.pauseHistory.length - 1];
      if (!lastPause.resumedAt) {
        lastPause.resumedAt = resumedAt;
      }
    }

    subscription.status = "ACTIVE";
    await subscription.save();
    return subscription;
  }

  async cancelSubscription(id: string) {
    const subscription = await subscriptionRepository.findById(id);
    if (!subscription) {
      throw new AppError(
        "Subscription package not found",
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND
      );
    }

    if (subscription.status === "COMPLETED") {
      throw new AppError(
        "Cannot cancel a completed package",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.BAD_REQUEST
      );
    }

    if (subscription.status === "CANCELLED") {
      throw new AppError(
        "Package is already cancelled",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.BAD_REQUEST
      );
    }

    subscription.status = "CANCELLED";
    await subscription.save();
    return subscription;
  }
}

type CreateCustomerSubscriptionInput = CreateSubscriptionInput;

export default new SubscriptionService();
