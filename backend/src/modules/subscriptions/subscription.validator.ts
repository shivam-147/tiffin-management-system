import { z } from "zod";
import { objectIdSchema } from "../customers/customer.validator";

export const createSubscriptionSchema = z.object({
  customerId: objectIdSchema,
  pricePerTiffin: z.coerce.number().positive("Price per tiffin must be greater than zero"),
  totalTiffins: z.coerce.number().int().positive("Total tiffins must be a positive whole number"),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  notes: z.string().trim().max(500, "Notes cannot exceed 500 characters").optional(),
});

export const pauseSubscriptionSchema = z.object({
  expectedResumeDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  reason: z.string().trim().max(300, "Reason cannot exceed 300 characters").optional(),
});

export const resumeSubscriptionSchema = z.object({
  resumeDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
});

export const subscriptionQuerySchema = z.object({
  customerId: objectIdSchema.optional(),
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED", "ALL"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const subscriptionIdParamSchema = z.object({
  id: objectIdSchema,
});

export const customerIdParamSchema = z.object({
  customerId: objectIdSchema,
});
