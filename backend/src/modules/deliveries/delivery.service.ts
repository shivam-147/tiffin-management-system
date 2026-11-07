import deliveryRepository from "./delivery.repository";
import Subscription from "../subscriptions/subscription.model";
import Delivery, { DeliveryStatus } from "./delivery.model";
import {
  GenerateDeliveriesInput,
  UpdateDeliveryStatusInput,
  DeliveryQueryInput,
} from "./delivery.types";
import { AppError } from "../../errors/app-error";
import { HTTP_STATUS } from "../../constants/http-status.constants";
import { ERROR_CODES } from "../../constants/error-code.constants";

class DeliveryService {
  async generateDailyDeliveries(data: GenerateDeliveriesInput) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const targetDateStr = data.date || todayStr;
    const deliveryDate = new Date(`${targetDateStr}T00:00:00.000Z`);

    // 1. Fetch only ACTIVE subscriptions with remaining quantity > 0
    const activeSubscriptions = await Subscription.find({
      status: "ACTIVE",
      remainingQuantity: { $gt: 0 },
    }).populate("customer");

    let generatedCount = 0;
    let skippedCount = 0;

    for (const sub of activeSubscriptions) {
      const customer: any = sub.customer;
      // Skip if customer is deleted or inactive
      if (!customer || !customer.isActive) {
        skippedCount++;
        continue;
      }

      // 2. Check if a delivery already exists for this customer on this target date
      const existing = await deliveryRepository.findByCustomerAndDate(
        customer._id.toString(),
        targetDateStr
      );

      if (existing) {
        skippedCount++;
        continue;
      }

      try {
        await deliveryRepository.create({
          customer: customer._id,
          subscription: sub._id as any,
          deliveryDate,
          dateString: targetDateStr,
          status: "PENDING",
        });
        generatedCount++;
      } catch (err: any) {
        // In case of parallel race condition caught by unique index
        if (err.code === 11000) {
          skippedCount++;
        } else {
          throw err;
        }
      }
    }

    return {
      date: targetDateStr,
      generatedCount,
      skippedCount,
      totalEligible: activeSubscriptions.length,
    };
  }

  async getDailyDeliveries(query: DeliveryQueryInput) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (query.date) {
      filter.dateString = query.date;
    }

    if (query.status && query.status !== "ALL") {
      filter.status = query.status;
    }

    if (query.customerId) {
      filter.customer = query.customerId;
    }

    const [items, total] = await Promise.all([
      deliveryRepository.find(filter, skip, limit),
      deliveryRepository.count(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      deliveries: items,
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

  async getDeliveryById(id: string) {
    const delivery = await deliveryRepository.findById(id);
    if (!delivery) {
      throw new AppError(
        "Delivery record not found",
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND
      );
    }
    return delivery;
  }

  async getCustomerDeliveries(customerId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const filter = { customer: customerId };

    const [items, total] = await Promise.all([
      deliveryRepository.find(filter, skip, limit),
      deliveryRepository.count(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      deliveries: items,
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

  async updateDeliveryStatus(id: string, data: UpdateDeliveryStatusInput) {
    const delivery = await Delivery.findById(id);
    if (!delivery) {
      throw new AppError(
        "Delivery record not found",
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND
      );
    }

    const previousStatus = delivery.status;
    const newStatus = data.status;

    // No status change
    if (previousStatus === newStatus) {
      if (data.notes !== undefined) {
        delivery.notes = data.notes;
        await delivery.save();
      }
      return deliveryRepository.findById(id);
    }

    const subscription = await Subscription.findById(delivery.subscription);
    if (!subscription) {
      throw new AppError(
        "Associated subscription package not found",
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND
      );
    }

    // CASE 1: Transitioning from non-DELIVERED to DELIVERED (CONSUME 1 TIFFIN)
    if (previousStatus !== "DELIVERED" && newStatus === "DELIVERED") {
      if (subscription.status === "PAUSED") {
        throw new AppError(
          "Cannot deliver tiffin because the customer's subscription package is currently paused",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.BAD_REQUEST,
          [
            {
              field: "status",
              code: "BUSINESS_ERROR",
              message: "Subscription is paused",
              location: "body",
            },
          ]
        );
      }

      if (subscription.status === "CANCELLED") {
        throw new AppError(
          "Cannot deliver tiffin for a cancelled package",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.BAD_REQUEST
        );
      }

      // Atomically decrement remainingQuantity and increment deliveredQuantity
      const updatedSub = await Subscription.findOneAndUpdate(
        {
          _id: subscription._id,
          remainingQuantity: { $gt: 0 },
        },
        {
          $inc: { remainingQuantity: -1, deliveredQuantity: 1 },
        },
        { new: true }
      );

      if (!updatedSub) {
        throw new AppError(
          "Cannot mark as delivered: Package has zero remaining balance",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.BAD_REQUEST,
          [
            {
              field: "remainingQuantity",
              code: "BUSINESS_ERROR",
              message: "Subscription package has 0 remaining tiffins",
              location: "business",
            },
          ]
        );
      }

      // If package balance has reached 0, mark as COMPLETED
      if (updatedSub.remainingQuantity === 0) {
        updatedSub.status = "COMPLETED";
        updatedSub.completionDate = new Date();
        await updatedSub.save();
      }

      delivery.status = "DELIVERED";
      if (data.notes !== undefined) {
        delivery.notes = data.notes;
      }
      await delivery.save();
    }
    // CASE 2: Transitioning from DELIVERED to non-DELIVERED (REVERSE 1 TIFFIN DEDUCTION)
    else if (previousStatus === "DELIVERED" && newStatus !== "DELIVERED") {
      const updatePayload: Record<string, any> = {
        $inc: { remainingQuantity: 1, deliveredQuantity: -1 },
      };

      // If package was marked COMPLETED, restore it to ACTIVE since balance is restored
      if (subscription.status === "COMPLETED") {
        updatePayload.status = "ACTIVE";
        updatePayload.completionDate = null;
      }

      await Subscription.findByIdAndUpdate(subscription._id, updatePayload);

      delivery.status = newStatus;
      if (data.notes !== undefined) {
        delivery.notes = data.notes;
      }
      await delivery.save();
    }
    // CASE 3: Transitioning between non-delivered statuses (PENDING <-> SKIPPED <-> FAILED)
    else {
      delivery.status = newStatus;
      if (data.notes !== undefined) {
        delivery.notes = data.notes;
      }
      await delivery.save();
    }

    return deliveryRepository.findById(id);
  }
}

export default new DeliveryService();
