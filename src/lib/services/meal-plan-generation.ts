import "server-only";
import { createClient } from "@/lib/supabase/server";
import { generateMealPlanDraft } from "@/lib/services/claude/generate-meal-plan";
import { reviseMealPlan, type CurrentPlanSummary } from "@/lib/services/claude/adjust-meal-plan";
import { CLAUDE_MODEL } from "@/lib/services/claude/client";
import { getNutritionProvider } from "@/lib/services/nutrition/provider";
import { getOrCacheFood, toNutrientAmounts } from "@/lib/services/nutrition/food-cache";
import { calculateIngredientNutrition } from "@/lib/services/nutrition/calculate";
import { findAllergenMatches } from "@/lib/services/nutrition/allergy-check";
import type { GenerateMealPlanRequest, AiMealPlanOutput } from "@/lib/validation/ai-meal-plan";
import type { Database } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type MealPlanDayRow = Database["public"]["Tables"]["meal_plan_days"]["Row"];

export type AiSettingsInput = {
  cuisinePreferences: string[];
  foodsToPrioritize: string[];
  additionalExcludedFoods: string[];
  preparationTime?: number;
  budgetPreference?: "low" | "moderate" | "high";
  varietyPreference: "low" | "medium" | "high";
  repeatingMealsAllowed: boolean;
};

export type GenerateAiPlanResult = { error?: string; success?: boolean };

/**
 * Writes an AI-proposed plan structure into real meal/meal_item rows.
 * Filters allergens server-side (defense in depth beyond the prompt), then
 * resolves every ingredient against USDA before writing any nutrition
 * value — ingredients with no database match are stored as unverified with
 * null nutrition rather than an invented number.
 */
async function populateDaysFromAiPlan(
  supabase: SupabaseServerClient,
  days: MealPlanDayRow[],
  aiPlan: AiMealPlanOutput,
  allergens: string[],
): Promise<void> {
  const provider = getNutritionProvider();
  const dayByNumber = new Map(days.map((d) => [d.day_number, d]));

  for (const aiDay of aiPlan.days) {
    const day = dayByNumber.get(aiDay.dayNumber);
    if (!day) continue;

    for (let mealIndex = 0; mealIndex < aiDay.meals.length; mealIndex++) {
      const aiMeal = aiDay.meals[mealIndex];

      const { data: meal, error: mealError } = await supabase
        .from("meals")
        .insert({
          meal_plan_day_id: day.id,
          meal_type: aiMeal.mealType,
          name: aiMeal.name,
          prep_instructions: aiMeal.prepInstructions,
          servings: aiMeal.servings || 1,
          position: mealIndex,
          is_ai_generated: true,
        })
        .select("id")
        .single();

      if (mealError || !meal) continue;

      const safeIngredients = aiMeal.ingredients.filter(
        (ingredient) => findAllergenMatches(ingredient.description, allergens).length === 0,
      );

      for (let itemIndex = 0; itemIndex < safeIngredients.length; itemIndex++) {
        const ingredient = safeIngredients[itemIndex];

        try {
          const searchResults = await provider.searchFoods(ingredient.description, 1);
          const bestMatch = searchResults[0];

          if (bestMatch) {
            const food = await getOrCacheFood(bestMatch.externalId);
            if (food) {
              const nutrition = calculateIngredientNutrition(
                ingredient.quantity,
                ingredient.unit,
                toNutrientAmounts(food.nutrients),
                { servingSize: food.serving_size, servingSizeUnit: food.serving_size_unit },
              );

              await supabase.from("meal_items").insert({
                meal_id: meal.id,
                food_id: food.id,
                quantity: ingredient.quantity,
                unit: ingredient.unit,
                calories: nutrition.calories,
                protein_g: nutrition.proteinG,
                carbs_g: nutrition.carbsG,
                fat_g: nutrition.fatG,
                fiber_g: nutrition.fiberG,
                sodium_mg: nutrition.sodiumMg,
                nutrition_source: "usda",
                position: itemIndex,
              } as never);
              continue;
            }
          }
        } catch (error) {
          console.error("USDA lookup failed during AI generation", error);
        }

        // No database match — insert as unverified rather than inventing values.
        await supabase.from("meal_items").insert({
          meal_id: meal.id,
          custom_food_name: ingredient.description,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          nutrition_source: "ai_unverified",
          position: itemIndex,
        } as never);
      }
    }
  }
}

export async function generateAiMealPlan(
  planId: string,
  practitionerId: string,
  aiSettings: AiSettingsInput,
): Promise<GenerateAiPlanResult> {
  const supabase = await createClient();

  const { data: plan } = await supabase.from("meal_plans").select("*").eq("id", planId).single();
  if (!plan) return { error: "Meal plan not found." };

  const { data: days } = await supabase
    .from("meal_plan_days")
    .select("*")
    .eq("meal_plan_id", planId)
    .order("day_number");
  if (!days || days.length === 0) return { error: "This plan has no days set up." };

  const [allergiesRes, dietaryRes, foodPrefsRes, targetRes] = await Promise.all([
    supabase.from("patient_allergies").select("allergen").eq("patient_id", plan.patient_id),
    supabase.from("patient_dietary_preferences").select("preference").eq("patient_id", plan.patient_id),
    supabase.from("patient_food_preferences").select("category, food_name").eq("patient_id", plan.patient_id),
    supabase
      .from("nutrition_targets")
      .select("*")
      .eq("patient_id", plan.patient_id)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  const allergens = (allergiesRes.data ?? []).map((a) => a.allergen);
  const refusedFoods = (foodPrefsRes.data ?? []).filter((f) => f.category === "refuse").map((f) => f.food_name);
  const dislikedFoods = (foodPrefsRes.data ?? []).filter((f) => f.category === "dislike").map((f) => f.food_name);
  const target = targetRes.data;

  const request: GenerateMealPlanRequest = {
    patientPreferences: (dietaryRes.data ?? []).map((d) => d.preference),
    allergies: allergens,
    excludedFoods: [...refusedFoods, ...dislikedFoods, ...aiSettings.additionalExcludedFoods],
    dietaryRestrictions: (dietaryRes.data ?? []).map((d) => d.preference),
    calorieTarget: target?.calories ?? undefined,
    proteinTarget: target?.protein_g ?? undefined,
    carbohydrateTarget: target?.carbs_g ?? undefined,
    fatTarget: target?.fat_g ?? undefined,
    fiberTarget: target?.fiber_g ?? undefined,
    sodiumTarget: target?.sodium_mg ?? undefined,
    numberOfDays: days.length,
    numberOfMeals: plan.meals_per_day ?? 3,
    numberOfSnacks: plan.snacks_per_day ?? 0,
    cuisinePreferences: aiSettings.cuisinePreferences,
    foodsToPrioritize: aiSettings.foodsToPrioritize,
    preparationTime: aiSettings.preparationTime,
    budgetPreference: aiSettings.budgetPreference,
    varietyPreference: aiSettings.varietyPreference,
    repeatingMealsAllowed: aiSettings.repeatingMealsAllowed,
  };

  const result = await generateMealPlanDraft(request);

  const logGeneration = async (status: "accepted" | "rejected", errorMessage?: string) => {
    await supabase.from("ai_generations").insert({
      practitioner_id: practitionerId,
      patient_id: plan.patient_id,
      meal_plan_id: planId,
      generation_type: "plan",
      model: result.success ? result.model : "unknown",
      status,
      request_summary: {
        numberOfDays: request.numberOfDays,
        numberOfMeals: request.numberOfMeals,
        numberOfSnacks: request.numberOfSnacks,
        varietyPreference: request.varietyPreference,
        budgetPreference: request.budgetPreference,
      },
      draft_ref: planId,
      error_message: errorMessage ?? null,
    } as never);
  };

  if (!result.success) {
    await logGeneration("rejected", result.error);
    return { error: result.error };
  }

  await populateDaysFromAiPlan(supabase, days, result.plan, allergens);

  await supabase.from("meal_plans").update({ status: "ai_draft", source: "ai" }).eq("id", planId);

  if (result.plan.practitionerNotes) {
    await supabase.from("practitioner_notes").insert({
      patient_id: plan.patient_id,
      practitioner_id: practitionerId,
      note: `AI meal plan draft — approach notes:\n${result.plan.practitionerNotes}`,
    });
  }

  await logGeneration("accepted");

  return { success: true };
}

export type AdjustPlanResult = { error?: string; newPlanId?: string };

/**
 * Proposes changes to an existing plan per a free-text instruction. Never
 * modifies the original plan — always creates a new `ai_draft` copy
 * (`duplicated_from` pointing at the original) so the practitioner reviews
 * and explicitly approves before anything replaces what the patient sees.
 */
export async function createAdjustedPlanDraft(
  planId: string,
  practitionerId: string,
  instruction: string,
): Promise<AdjustPlanResult> {
  const supabase = await createClient();

  const { data: plan } = await supabase.from("meal_plans").select("*").eq("id", planId).single();
  if (!plan) return { error: "Meal plan not found." };

  const { data: days } = await supabase
    .from("meal_plan_days")
    .select("*, meals(meal_type, name, meal_items(custom_food_name, quantity, unit, foods(description)))")
    .eq("meal_plan_id", planId)
    .order("day_number");
  if (!days || days.length === 0) return { error: "This plan has no days set up." };

  const [allergiesRes, dietaryRes, foodPrefsRes, targetRes] = await Promise.all([
    supabase.from("patient_allergies").select("allergen").eq("patient_id", plan.patient_id),
    supabase.from("patient_dietary_preferences").select("preference").eq("patient_id", plan.patient_id),
    supabase.from("patient_food_preferences").select("category, food_name").eq("patient_id", plan.patient_id),
    supabase
      .from("nutrition_targets")
      .select("*")
      .eq("patient_id", plan.patient_id)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  const allergens = (allergiesRes.data ?? []).map((a) => a.allergen);
  const excludedFoods = (foodPrefsRes.data ?? [])
    .filter((f) => f.category === "refuse" || f.category === "dislike")
    .map((f) => f.food_name);
  const target = targetRes.data;

  const currentPlanSummary: CurrentPlanSummary = {
    days: (days as unknown as Array<
      MealPlanDayRow & {
        meals: {
          meal_type: string;
          name: string;
          meal_items: { custom_food_name: string | null; quantity: number; unit: string; foods: { description: string } | null }[];
        }[];
      }
    >).map((day) => ({
      dayNumber: day.day_number,
      meals: day.meals.map((meal) => ({
        mealType: meal.meal_type,
        name: meal.name,
        ingredients: meal.meal_items.map((item) => ({
          description: item.foods?.description ?? item.custom_food_name ?? "ingredient",
          quantity: item.quantity,
          unit: item.unit,
        })),
      })),
    })),
  };

  const result = await reviseMealPlan(currentPlanSummary, instruction, {
    allergies: allergens,
    dietaryRestrictions: (dietaryRes.data ?? []).map((d) => d.preference),
    excludedFoods,
    calorieTarget: target?.calories ?? undefined,
    proteinTarget: target?.protein_g ?? undefined,
    carbohydrateTarget: target?.carbs_g ?? undefined,
    fatTarget: target?.fat_g ?? undefined,
    fiberTarget: target?.fiber_g ?? undefined,
    sodiumTarget: target?.sodium_mg ?? undefined,
  });

  const logGeneration = async (status: "accepted" | "rejected", draftRef: string | null, errorMessage?: string) => {
    await supabase.from("ai_generations").insert({
      practitioner_id: practitionerId,
      patient_id: plan.patient_id,
      meal_plan_id: planId,
      generation_type: "adjustment",
      model: CLAUDE_MODEL,
      status,
      request_summary: { instruction: instruction.slice(0, 200) },
      draft_ref: draftRef,
      error_message: errorMessage ?? null,
    } as never);
  };

  if (!result.success) {
    await logGeneration("rejected", null, result.error);
    return { error: result.error };
  }

  const { data: newPlan, error: newPlanError } = await supabase
    .from("meal_plans")
    .insert({
      patient_id: plan.patient_id,
      practitioner_id: practitionerId,
      name: `${plan.name} (AI adjusted)`,
      status: "ai_draft",
      source: "ai",
      start_date: plan.start_date,
      num_days: plan.num_days,
      meals_per_day: plan.meals_per_day,
      snacks_per_day: plan.snacks_per_day,
      duplicated_from: planId,
      created_by: practitionerId,
    })
    .select("id")
    .single();

  if (newPlanError || !newPlan) {
    await logGeneration("rejected", null, "Couldn't create the adjusted draft plan.");
    return { error: "Couldn't create the adjusted draft plan." };
  }

  const dayRows = days.map((d) => ({ meal_plan_id: newPlan.id, day_number: d.day_number, date: d.date }));
  const { data: newDays } = await supabase.from("meal_plan_days").insert(dayRows).select("*");

  if (!newDays) {
    await logGeneration("rejected", newPlan.id, "Couldn't set up the adjusted plan's days.");
    return { error: "Couldn't set up the adjusted plan's days." };
  }

  await populateDaysFromAiPlan(supabase, newDays, result.plan, allergens);

  if (result.plan.practitionerNotes) {
    await supabase.from("practitioner_notes").insert({
      patient_id: plan.patient_id,
      practitioner_id: practitionerId,
      note: `AI adjustment ("${instruction.slice(0, 100)}") — what changed:\n${result.plan.practitionerNotes}`,
    });
  }

  await logGeneration("accepted", newPlan.id);

  return { newPlanId: newPlan.id };
}
