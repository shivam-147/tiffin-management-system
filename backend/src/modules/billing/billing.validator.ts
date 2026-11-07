import { z } from "zod";
import { objectIdSchema } from "../customers/customer.validator";

export const generateBillsSchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2020).max(2100).optional(),
});

export const recordPaymentSchema = z.object({
  amount: z.coerce.number().positive("Payment amount must be greater than zero"),
  paymentMethod: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "OTHER"]),
  paymentDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  transactionReference: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(300).optional(),
});

export const billingQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  billingPeriod: z.string().regex(/^\d{4}-\d{2}$/, "Billing period must be YYYY-MM").optional(),
  paymentStatus: z.enum(["UNPAID", "PARTIAL", "PAID", "ALL"]).optional(),
  customerId: objectIdSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const billIdParamSchema = z.object({
  id: objectIdSchema,
});
