import { z } from "zod";

export const SUBSTITUTION_REASONS = [
  { value: "dislikes", label: "Patient dislikes this food" },
  { value: "too_expensive", label: "Too expensive" },
  { value: "allergy", label: "Allergy" },
  { value: "dietary_preference", label: "Dietary preference" },
  { value: "increase_protein", label: "Increase protein" },
  { value: "reduce_carbs", label: "Reduce carbohydrates" },
  { value: "reduce_sodium", label: "Reduce sodium" },
  { value: "reduce_calories", label: "Reduce calories" },
  { value: "increase_calories", label: "Increase calories" },
  { value: "faster_prep", label: "Faster preparation" },
  { value: "custom", label: "Custom instruction" },
] as const;
export type SubstitutionReason = (typeof SUBSTITUTION_REASONS)[number]["value"];

export const substitutionRequestSchema = z.object({
  reason: z.enum(SUBSTITUTION_REASONS.map((r) => r.value) as [SubstitutionReason, ...SubstitutionReason[]]),
  customInstruction: z.string().trim().max(500).optional(),
});
export type SubstitutionRequestInput = z.infer<typeof substitutionRequestSchema>;

/** A single proposed ingredient replacement — foods/portions only, never nutrition. */
export const alternativeIngredientSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unit: z.string(),
  rationale: z.string(),
});
export type AlternativeIngredient = z.infer<typeof alternativeIngredientSchema>;

export const alternativeIngredientsResponseSchema = z.object({
  alternatives: z.array(alternativeIngredientSchema),
});

/** A single proposed whole-meal replacement. */
export const alternativeMealSchema = z.object({
  name: z.string(),
  prepInstructions: z.string(),
  servings: z.number(),
  rationale: z.string(),
  ingredients: z.array(
    z.object({
      description: z.string(),
      quantity: z.number(),
      unit: z.string(),
    }),
  ),
});
export type AlternativeMeal = z.infer<typeof alternativeMealSchema>;

export const alternativeMealsResponseSchema = z.object({
  alternatives: z.array(alternativeMealSchema),
});
