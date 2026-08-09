"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { generateAiMealPlan, type AiSettingsInput } from "@/lib/services/meal-plan-generation";

const aiSettingsSchema = z.object({
  cuisinePreferences: z.array(z.string()),
  foodsToPrioritize: z.array(z.string()),
  additionalExcludedFoods: z.array(z.string()),
  preparationTime: z.coerce.number().int().min(0).max(240).optional(),
  budgetPreference: z.enum(["low", "moderate", "high"]).optional(),
  varietyPreference: z.enum(["low", "medium", "high"]),
  repeatingMealsAllowed: z.boolean(),
});

export type GenerateAiMealPlanActionResult = { error?: string; success?: boolean };

export async function generateAiMealPlanAction(
  planId: string,
  input: AiSettingsInput,
): Promise<GenerateAiMealPlanActionResult> {
  const parsed = aiSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your entries." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Please log in again." };

  const rate = checkRateLimit(`ai-meal-plan:${user.id}`, { limit: 10, windowMs: 60 * 60_000 });
  if (!rate.allowed) {
    return { error: "You've reached the AI generation limit for now. Please try again in a bit." };
  }

  const result = await generateAiMealPlan(planId, user.id, parsed.data);

  revalidatePath(`/meal-plans/${planId}`);

  if (result.error) return { error: result.error };
  return { success: true };
}
