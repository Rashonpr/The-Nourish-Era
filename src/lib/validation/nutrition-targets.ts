import { z } from "zod";

export const nutritionTargetFormSchema = z.object({
  calories: z.coerce.number().int().min(0).max(10000).optional(),
  proteinG: z.coerce.number().min(0).max(1000).optional(),
  carbsG: z.coerce.number().min(0).max(2000).optional(),
  fatG: z.coerce.number().min(0).max(1000).optional(),
  fiberG: z.coerce.number().min(0).max(200).optional(),
  sodiumMg: z.coerce.number().min(0).max(10000).optional(),
  addedSugarG: z.coerce.number().min(0).max(500).optional(),
  saturatedFatG: z.coerce.number().min(0).max(500).optional(),
  waterMl: z.coerce.number().min(0).max(10000).optional(),
  calcMethod: z.string().max(60).optional(),
  calcInputs: z.record(z.string(), z.unknown()).optional(),
});
export type NutritionTargetFormInput = z.infer<typeof nutritionTargetFormSchema>;
