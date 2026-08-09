import { z } from "zod";

export const createMealPlanSchema = z.object({
  patientId: z.string().uuid(),
  name: z.string().trim().min(1, "Give this plan a name").max(160),
  numDays: z.coerce.number().int().min(1).max(28),
  mealsPerDay: z.coerce.number().int().min(1).max(8),
  snacksPerDay: z.coerce.number().int().min(0).max(6),
  startDate: z.string().optional().or(z.literal("")),
});
export type CreateMealPlanInput = z.infer<typeof createMealPlanSchema>;

export const updateMealPlanSchema = z.object({
  name: z.string().trim().min(1).max(160),
});
export type UpdateMealPlanInput = z.infer<typeof updateMealPlanSchema>;

export const mealTypeSchema = z.enum(["breakfast", "lunch", "dinner", "snack", "other"]);

export const addMealSchema = z.object({
  mealPlanDayId: z.string().uuid(),
  mealType: mealTypeSchema,
  name: z.string().trim().min(1, "Give this meal a name").max(160),
  prepInstructions: z.string().trim().max(4000).optional().or(z.literal("")),
  servings: z.coerce.number().positive().max(50).default(1),
});
export type AddMealInput = z.infer<typeof addMealSchema>;

export const updateMealSchema = z.object({
  mealType: mealTypeSchema,
  name: z.string().trim().min(1).max(160),
  prepInstructions: z.string().trim().max(4000).optional().or(z.literal("")),
  servings: z.coerce.number().positive().max(50),
});
export type UpdateMealInput = z.infer<typeof updateMealSchema>;

export const addMealItemFromFoodSchema = z.object({
  mealId: z.string().uuid(),
  externalId: z.string().trim().min(1).max(50),
  description: z.string().trim().min(1).max(300),
  quantity: z.coerce.number().positive().max(10000),
  unit: z.string().trim().min(1).max(30),
});
export type AddMealItemFromFoodInput = z.infer<typeof addMealItemFromFoodSchema>;

export const addCustomMealItemSchema = z.object({
  mealId: z.string().uuid(),
  customFoodName: z.string().trim().min(1).max(300),
  quantity: z.coerce.number().positive().max(10000),
  unit: z.string().trim().min(1).max(30),
  calories: z.coerce.number().min(0).max(10000).optional(),
  proteinG: z.coerce.number().min(0).max(1000).optional(),
  carbsG: z.coerce.number().min(0).max(1000).optional(),
  fatG: z.coerce.number().min(0).max(1000).optional(),
  fiberG: z.coerce.number().min(0).max(500).optional(),
  sodiumMg: z.coerce.number().min(0).max(20000).optional(),
});
export type AddCustomMealItemInput = z.infer<typeof addCustomMealItemSchema>;

export const updateMealItemQuantitySchema = z.object({
  mealItemId: z.string().uuid(),
  quantity: z.coerce.number().positive().max(10000),
  unit: z.string().trim().min(1).max(30),
});
export type UpdateMealItemQuantityInput = z.infer<typeof updateMealItemQuantitySchema>;
