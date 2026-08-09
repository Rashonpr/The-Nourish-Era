"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import {
  previewIngredientAlternatives,
  applyIngredientSubstitution,
  previewMealAlternatives,
  applyMealAlternative,
  type IngredientAlternativePreview,
  type MealAlternativePreview,
} from "@/lib/services/substitution";
import { substitutionRequestSchema } from "@/lib/validation/ai-substitution";

async function requireUserId(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Please log in again." };
  return { userId: user.id };
}

export async function previewIngredientAlternativesAction(
  mealItemId: string,
  input: { reason: string; customInstruction?: string },
): Promise<{ error?: string; alternatives?: IngredientAlternativePreview[] }> {
  const auth = await requireUserId();
  if ("error" in auth) return { error: auth.error };

  const parsed = substitutionRequestSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const rate = checkRateLimit(`ai-substitution:${auth.userId}`, { limit: 30, windowMs: 60 * 60_000 });
  if (!rate.allowed) return { error: "You've reached the AI generation limit for now. Please try again in a bit." };

  return previewIngredientAlternatives(mealItemId, parsed.data.reason, parsed.data.customInstruction);
}

export async function applyIngredientSubstitutionAction(
  mealItemId: string,
  alternative: { description: string; quantity: number; unit: string },
): Promise<{ error?: string }> {
  const auth = await requireUserId();
  if ("error" in auth) return { error: auth.error };

  const result = await applyIngredientSubstitution(mealItemId, auth.userId, alternative);
  revalidatePath("/meal-plans", "layout");
  return result;
}

export async function previewMealAlternativesAction(
  mealId: string,
  input: { reason: string; customInstruction?: string },
): Promise<{ error?: string; alternatives?: MealAlternativePreview[] }> {
  const auth = await requireUserId();
  if ("error" in auth) return { error: auth.error };

  const parsed = substitutionRequestSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const rate = checkRateLimit(`ai-substitution:${auth.userId}`, { limit: 30, windowMs: 60 * 60_000 });
  if (!rate.allowed) return { error: "You've reached the AI generation limit for now. Please try again in a bit." };

  return previewMealAlternatives(mealId, parsed.data.reason, parsed.data.customInstruction);
}

export async function applyMealAlternativeAction(
  mealId: string,
  alternative: {
    name: string;
    prepInstructions: string;
    servings: number;
    ingredients: { description: string; quantity: number; unit: string }[];
  },
): Promise<{ error?: string }> {
  const auth = await requireUserId();
  if ("error" in auth) return { error: auth.error };

  const result = await applyMealAlternative(mealId, auth.userId, alternative);
  revalidatePath("/meal-plans", "layout");
  return result;
}
