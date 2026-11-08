import { z } from "zod";

export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format");

export const indianPhoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number");

export const createCustomerSchema = z.object({
  name: z.string().trim().min(2, "Name must contain at least 2 characters"),
  phone: indianPhoneSchema,
  address: z.string().trim().min(5, "Address must contain at least 5 characters"),
  email: z.string().trim().email("Please enter a valid email address").optional().or(z.literal("")),
  notes: z.string().trim().max(500, "Notes cannot exceed 500 characters").optional().or(z.literal("")),
  packageCatalogId: objectIdSchema.optional().or(z.literal("")),
  advanceAmount: z.coerce.number().min(0, "Advance amount cannot be negative").optional().default(0),
  startDate: z.string().optional(),
});

export const updateCustomerSchema = z
  .object({
    name: z.string().trim().min(2, "Name must contain at least 2 characters").optional(),
    phone: indianPhoneSchema.optional(),
    address: z.string().trim().min(5, "Address must contain at least 5 characters").optional(),
    email: z.string().trim().email("Please enter a valid email address").optional().or(z.literal("")),
    notes: z.string().trim().max(500, "Notes cannot exceed 500 characters").optional().or(z.literal("")),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export const customerQuerySchema = z.object({
  search: z.string().trim().optional(),
  isActive: z
    .enum(["true", "false", "all"])
    .optional()
    .transform((val) => {
      if (val === "true") return true;
      if (val === "false") return false;
      return undefined;
    }),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const customerIdParamSchema = z.object({
  id: objectIdSchema,
});
