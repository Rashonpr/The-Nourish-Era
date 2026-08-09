import { z } from "zod";

/**
 * Structured output schema for Claude's meal-plan proposals.
 *
 * Deliberately excludes calories/macros/any nutrient field — Claude proposes
 * foods, portions, and structure only. Nutrition values always come from the
 * USDA-backed calculation engine (see lib/services/nutrition), never from
 * the model. Kept free of JSON-Schema features the Structured Outputs API
 * doesn't support (numeric/string length constraints) — real validation
 * happens in application code after parsing.
 */
export const aiIngredientSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unit: z.string(),
});
export type AiIngredient = z.infer<typeof aiIngredientSchema>;

export const aiMealSchema = z.object({
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack", "other"]),
  name: z.string(),
  prepInstructions: z.string(),
  servings: z.number(),
  ingredients: z.array(aiIngredientSchema),
});
export type AiMeal = z.infer<typeof aiMealSchema>;

export const aiMealPlanDaySchema = z.object({
  dayNumber: z.number(),
  meals: z.array(aiMealSchema),
});
export type AiMealPlanDay = z.infer<typeof aiMealPlanDaySchema>;

export const aiMealPlanSchema = z.object({
  days: z.array(aiMealPlanDaySchema),
  practitionerNotes: z.string(),
});
export type AiMealPlanOutput = z.infer<typeof aiMealPlanSchema>;

/** Input to the generation request — mirrors the spec's example request shape. */
export const generateMealPlanRequestSchema = z.object({
  patientPreferences: z.array(z.string()),
  allergies: z.array(z.string()),
  excludedFoods: z.array(z.string()),
  dietaryRestrictions: z.array(z.string()),
  calorieTarget: z.number().optional(),
  proteinTarget: z.number().optional(),
  carbohydrateTarget: z.number().optional(),
  fatTarget: z.number().optional(),
  fiberTarget: z.number().optional(),
  sodiumTarget: z.number().optional(),
  numberOfDays: z.coerce.number().int().min(1).max(28),
  numberOfMeals: z.coerce.number().int().min(1).max(8),
  numberOfSnacks: z.coerce.number().int().min(0).max(6),
  cuisinePreferences: z.array(z.string()),
  foodsToPrioritize: z.array(z.string()),
  preparationTime: z.coerce.number().int().min(0).max(240).optional(),
  budgetPreference: z.enum(["low", "moderate", "high"]).optional(),
  varietyPreference: z.enum(["low", "medium", "high"]).default("medium"),
  repeatingMealsAllowed: z.boolean().default(true),
});
export type GenerateMealPlanRequest = z.infer<typeof generateMealPlanRequestSchema>;
