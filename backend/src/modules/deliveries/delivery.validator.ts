import { z } from "zod";
import { objectIdSchema } from "../customers/customer.validator";

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

export const generateDeliveriesSchema = z.object({
  date: dateStringSchema.optional(),
});

export const updateDeliveryStatusSchema = z.object({
  status: z.enum(["PENDING", "DELIVERED", "SKIPPED", "FAILED"]),
  notes: z.string().trim().max(300, "Notes cannot exceed 300 characters").optional(),
});

export const deliveryQuerySchema = z.object({
  date: dateStringSchema.optional(),
  status: z.enum(["PENDING", "DELIVERED", "SKIPPED", "FAILED", "ALL"]).optional(),
  customerId: objectIdSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const deliveryIdParamSchema = z.object({
  id: objectIdSchema,
});
