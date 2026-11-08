import { z } from "zod";
import { objectIdSchema } from "../customers/customer.validator";

export const createPackageCatalogSchema = z.object({
  name: z.string().trim().min(2, "Package name must contain at least 2 characters"),
  description: z.string().trim().optional(),
  totalTiffins: z.coerce.number().int().positive("Total tiffins must be a positive number"),
  pricePerTiffin: z.coerce.number().positive("Price per tiffin must be greater than zero"),
  mealsPerDay: z.coerce.number().int().refine((val) => [1, 2, 3].includes(val), {
    message: "Meals per day must be 1, 2, or 3",
  }).default(1),
  mealTypes: z.array(z.string()).optional(),
  isActive: z.boolean().optional().default(true),
});

export const updatePackageCatalogSchema = z.object({
  name: z.string().trim().min(2).optional(),
  description: z.string().trim().optional(),
  totalTiffins: z.coerce.number().int().positive().optional(),
  pricePerTiffin: z.coerce.number().positive().optional(),
  mealsPerDay: z.coerce.number().int().refine((val) => [1, 2, 3].includes(val)).optional(),
  mealTypes: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const packageIdParamSchema = z.object({
  id: objectIdSchema,
});
