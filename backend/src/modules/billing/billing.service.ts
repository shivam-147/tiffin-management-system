import crypto from "crypto";
import billingRepository from "./billing.repository";
import Delivery from "../deliveries/delivery.model";
import Subscription from "../subscriptions/subscription.model";
import Customer from "../customers/customer.model";
import {
  GenerateBillsInput,
  RecordPaymentInput,
  BillingQueryInput,
  ReceiptData,
} from "./billing.types";
import { env } from "../../config/env";
import { AppError } from "../../errors/app-error";
import { HTTP_STATUS } from "../../constants/http-status.constants";
import { ERROR_CODES } from "../../constants/error-code.constants";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

class BillingService {
  async generateMonthlyBills(data: GenerateBillsInput) {
    const now = new Date();
    const month = data.month || now.getMonth() + 1;
    const year = data.year || now.getFullYear();
    const billingPeriod = `${year}-${String(month).padStart(2, "0")}`;

    // 1. Group all DELIVERED tiffins for this billing period by customer
    const deliveredAggregates = await Delivery.aggregate([
      {
        $match: {
          dateString: { $regex: `^${billingPeriod}` },
          status: "DELIVERED",
        },
      },
      {
        $group: {
          _id: "$customer",
          deliveredCount: { $sum: 1 },
          lastSubscriptionId: { $last: "$subscription" },
        },
      },
    ]);

    let generatedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const group of deliveredAggregates) {
      const customerId = group._id.toString();
      const deliveredCount = group.deliveredCount;

      // Find customer
      const customer = await Customer.findById(customerId);
      if (!customer) {
        skippedCount++;
        continue;
      }

      // Check existing bill
      const existingBill = await billingRepository.findByCustomerAndPeriod(customerId, billingPeriod);

      // Determine price per tiffin and any advance amount from the subscription
      let pricePerTiffin = 60; // fallback
      let advancePaid = 0;
      let subscriptionToUse: any = null;

      if (group.lastSubscriptionId) {
        subscriptionToUse = await Subscription.findById(group.lastSubscriptionId);
      }
      if (!subscriptionToUse) {
        subscriptionToUse = await Subscription.findOne({ customer: customerId, status: { $in: ["ACTIVE", "COMPLETED", "PAYMENT_PENDING"] } }).sort({ createdAt: -1 });
      }

      if (subscriptionToUse) {
        pricePerTiffin = subscriptionToUse.pricePerTiffin;
        advancePaid = subscriptionToUse.advancePaid || 0;
      }

      const totalAmount = Math.round(deliveredCount * pricePerTiffin * 100) / 100;

      if (existingBill) {
        // If bill exists and has zero external payments recorded, safely sync newly added deliveries and advance for the month
        const hasManualPayments = existingBill.payments && existingBill.payments.length > 0;
        if (!hasManualPayments && existingBill.paymentStatus !== "PAID") {
          existingBill.deliveredCount = deliveredCount;
          existingBill.pricePerTiffin = pricePerTiffin;
          existingBill.totalAmount = totalAmount;

          const appliedAdvance = Math.min(advancePaid, totalAmount);
          existingBill.paidAmount = appliedAdvance;
          existingBill.pendingAmount = Math.max(0, totalAmount - appliedAdvance);
          existingBill.paymentStatus = existingBill.pendingAmount === 0 ? "PAID" : appliedAdvance > 0 ? "PARTIAL" : "UNPAID";

          if (appliedAdvance > 0) {
            existingBill.payments = [
              {
                paymentId: `ADV-${existingBill._id.toString().slice(-6)}`,
                amount: appliedAdvance,
                paymentDate: new Date(),
                paymentMethod: "CASH",
                transactionReference: "ADVANCE_DEPOSIT",
                notes: "Initial advance deposit credited towards monthly billing",
                recordedAt: new Date(),
              },
            ];
          }

          await existingBill.save();
          updatedCount++;
        } else {
          skippedCount++;
        }
        continue;
      }

      // Create new bill
      const billNumber = `BILL-${year}${String(month).padStart(2, "0")}-${customerId.slice(-6).toUpperCase()}`;
      const appliedAdvance = Math.min(advancePaid, totalAmount);
      const pendingAmount = Math.max(0, totalAmount - appliedAdvance);
      const paymentStatus = pendingAmount === 0 ? "PAID" : appliedAdvance > 0 ? "PARTIAL" : "UNPAID";

      const initialPayments = appliedAdvance > 0 ? [
        {
          paymentId: `ADV-${customerId.slice(-6)}`,
          amount: appliedAdvance,
          paymentDate: new Date(),
          paymentMethod: "CASH" as const,
          transactionReference: "ADVANCE_DEPOSIT",
          notes: "Initial advance deposit credited towards monthly billing",
          recordedAt: new Date(),
        }
      ] : [];

      await billingRepository.create({
        billNumber,
        customer: customer._id as any,
        billingMonth: month,
        billingYear: year,
        billingPeriod,
        deliveredCount,
        pricePerTiffin,
        totalAmount,
        paidAmount: appliedAdvance,
        pendingAmount,
        paymentStatus,
        payments: initialPayments,
      });

      generatedCount++;
    }

    return {
      billingPeriod,
      month: MONTH_NAMES[month - 1],
      year,
      billsGenerated: generatedCount,
      billsUpdated: updatedCount,
      billsSkipped: skippedCount,
      totalCustomersWithDeliveries: deliveredAggregates.length,
    };
  }

  async getBills(query: BillingQueryInput) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (query.billingPeriod) {
      filter.billingPeriod = query.billingPeriod;
    } else {
      if (query.month) {
        filter.billingMonth = Number(query.month);
      }
      if (query.year) {
        filter.billingYear = Number(query.year);
      }
    }

    if (query.paymentStatus && query.paymentStatus !== "ALL") {
      filter.paymentStatus = query.paymentStatus;
    }

    if (query.customerId) {
      filter.customer = query.customerId;
    }

    const [items, total] = await Promise.all([
      billingRepository.find(filter, skip, limit),
      billingRepository.count(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      bills: items,
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

  async getBillById(id: string) {
    const bill = await billingRepository.findById(id);
    if (!bill) {
      throw new AppError(
        "Bill not found",
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND
      );
    }

    // Also fetch the customer's deliveries for this billing period to itemize in statement/PDF
    const deliveries = await Delivery.find({
      customer: (bill.customer as any)._id || bill.customer,
      dateString: { $regex: `^${bill.billingPeriod}` },
      status: "DELIVERED",
    }).sort({ dateString: 1, mealType: 1 });

    const billObj = bill.toObject ? bill.toObject() : bill;
    (billObj as any).deliveries = deliveries;

    return billObj;
  }

  async getCustomerBills(customerId: string) {
    const customer = await Customer.findById(customerId);
    if (!customer) {
      throw new AppError(
        "Customer not found",
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND
      );
    }
    return billingRepository.findByCustomerId(customerId);
  }

  async recordPayment(billId: string, data: RecordPaymentInput) {
    const bill = await billingRepository.findById(billId);
    if (!bill) {
      throw new AppError(
        "Bill not found",
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND
      );
    }

    if (bill.paymentStatus === "PAID" || bill.pendingAmount <= 0) {
      throw new AppError(
        "Bill is already fully paid",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.BAD_REQUEST,
        [
          {
            field: "amount",
            code: "BUSINESS_ERROR",
            message: "Outstanding amount is ₹0",
            location: "body",
          },
        ]
      );
    }

    const paymentAmount = Number(data.amount);
    if (paymentAmount <= 0) {
      throw new AppError(
        "Payment amount must be greater than zero",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.BAD_REQUEST
      );
    }

    if (paymentAmount > bill.pendingAmount) {
      throw new AppError(
        `Payment amount of ₹${paymentAmount} cannot exceed the outstanding balance of ₹${bill.pendingAmount}`,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.BAD_REQUEST,
        [
          {
            field: "amount",
            code: "BUSINESS_ERROR",
            message: `Maximum allowable payment is ₹${bill.pendingAmount}`,
            location: "body",
          },
        ]
      );
    }

    const paymentDate = data.paymentDate ? new Date(data.paymentDate) : new Date();
    const paymentId = `PAY-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    // Add payment entry
    bill.payments.push({
      paymentId,
      amount: paymentAmount,
      paymentDate,
      paymentMethod: data.paymentMethod,
      transactionReference: data.transactionReference,
      notes: data.notes,
      recordedAt: new Date(),
    });

    const newPaidAmount = Math.round((bill.paidAmount + paymentAmount) * 100) / 100;
    const newPendingAmount = Math.round((bill.totalAmount - newPaidAmount) * 100) / 100;

    bill.paidAmount = newPaidAmount;
    bill.pendingAmount = newPendingAmount;
    bill.paymentStatus = newPendingAmount === 0 ? "PAID" : "PARTIAL";

    await bill.save();
    return billingRepository.findById(billId);
  }

  async getReceipt(billId: string): Promise<ReceiptData> {
    const bill = await billingRepository.findById(billId);
    if (!bill) {
      throw new AppError(
        "Bill not found",
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND
      );
    }

    const customer: any = bill.customer;
    const latestPayment = bill.payments.length > 0 ? bill.payments[bill.payments.length - 1] : null;

    return {
      businessName: env.BUSINESS_NAME,
      receiptNumber: `REC-${bill.billNumber}`,
      billNumber: bill.billNumber,
      customer: {
        id: customer?._id?.toString() || "",
        name: customer?.name || "Customer",
        phone: customer?.phone || "",
        address: customer?.address || "",
      },
      billingMonth: MONTH_NAMES[bill.billingMonth - 1],
      billingYear: bill.billingYear,
      totalDeliveredTiffins: bill.deliveredCount,
      pricePerTiffin: bill.pricePerTiffin,
      totalBillAmount: bill.totalAmount,
      paidAmount: bill.paidAmount,
      pendingAmount: bill.pendingAmount,
      paymentStatus: bill.paymentStatus,
      latestPaymentDate: latestPayment ? latestPayment.paymentDate.toISOString() : null,
      latestPaymentMethod: latestPayment ? latestPayment.paymentMethod : null,
      paymentHistory: bill.payments.map((p) => ({
        paymentId: p.paymentId,
        amount: p.amount,
        paymentDate: p.paymentDate.toISOString(),
        paymentMethod: p.paymentMethod,
        transactionReference: p.transactionReference,
      })),
      receiptGeneratedDate: new Date().toISOString(),
    };
  }
}

export default new BillingService();
