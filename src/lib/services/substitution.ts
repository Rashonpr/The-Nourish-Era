import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getNutritionProvider } from "@/lib/services/nutrition/provider";
import { getOrCacheFood, toNutrientAmounts } from "@/lib/services/nutrition/food-cache";
import { calculateIngredientNutrition, sumNutrientTotals, type NutrientTotals } from "@/lib/services/nutrition/calculate";
import { findAllergenMatches } from "@/lib/services/nutrition/allergy-check";
import { proposeIngredientAlternatives, proposeMealAlternatives } from "@/lib/services/claude/propose-alternatives";
import type { SubstitutionReason } from "@/lib/validation/ai-substitution";
import { CLAUDE_MODEL } from "@/lib/services/claude/client";

type PatientChainInfo = {
  patientId: string;
  practitionerId: string;
  allergies: string[];
  dietaryRestrictions: string[];
  excludedFoods: string[];
};

async function getPatientChainForMeal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  mealId: string,
): Promise<PatientChainInfo | null> {
  const { data } = await supabase
    .from("meals")
    .select("meal_plan_days(meal_plans(patient_id, practitioner_id))")
    .eq("id", mealId)
    .single();

  const joined = data as unknown as {
    meal_plan_days: { meal_plans: { patient_id: string; practitioner_id: string } | null } | null;
  } | null;
  const plan = joined?.meal_plan_days?.meal_plans;
  if (!plan) return null;

  return getPatientChain(supabase, plan.patient_id, plan.practitioner_id);
}

async function getPatientChain(
  supabase: Awaited<ReturnType<typeof createClient>>,
  patientId: string,
  practitionerId: string,
): Promise<PatientChainInfo> {
  const [allergiesRes, dietaryRes, foodPrefsRes] = await Promise.all([
    supabase.from("patient_allergies").select("allergen").eq("patient_id", patientId),
    supabase.from("patient_dietary_preferences").select("preference").eq("patient_id", patientId),
    supabase.from("patient_food_preferences").select("category, food_name").eq("patient_id", patientId),
  ]);

  return {
    patientId,
    practitionerId,
    allergies: (allergiesRes.data ?? []).map((a) => a.allergen),
    dietaryRestrictions: (dietaryRes.data ?? []).map((d) => d.preference),
    excludedFoods: (foodPrefsRes.data ?? [])
      .filter((f) => f.category === "refuse" || f.category === "dislike")
      .map((f) => f.food_name),
  };
}

async function resolveNutrition(
  description: string,
  quantity: number,
  unit: string,
): Promise<{ nutrition: NutrientTotals; foodId: string | null; source: "usda" | "ai_unverified" }> {
  try {
    const results = await getNutritionProvider().searchFoods(description, 1);
    const match = results[0];
    if (match) {
      const food = await getOrCacheFood(match.externalId);
      if (food) {
        const nutrition = calculateIngredientNutrition(quantity, unit, toNutrientAmounts(food.nutrients), {
          servingSize: food.serving_size,
          servingSizeUnit: food.serving_size_unit,
        });
        return { nutrition, foodId: food.id, source: "usda" };
      }
    }
  } catch (error) {
    console.error("USDA lookup failed during substitution", error);
  }
  return { nutrition: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, sodiumMg: 0 }, foodId: null, source: "ai_unverified" };
}

// ─── Ingredient substitution ────────────────────────────────────────────────

export type IngredientAlternativePreview = {
  description: string;
  quantity: number;
  unit: string;
  rationale: string;
  nutrition: NutrientTotals;
  diff: NutrientTotals;
  flaggedAllergen: boolean;
};

export type PreviewResult<T> = { error?: string; alternatives?: T[] };

export async function previewIngredientAlternatives(
  mealItemId: string,
  reason: SubstitutionReason,
  customInstruction?: string,
): Promise<PreviewResult<IngredientAlternativePreview>> {
  const supabase = await createClient();

  const { data: item } = await supabase
    .from("meal_items")
    .select("*, foods(description), meals(id)")
    .eq("id", mealItemId)
    .single();
  if (!item) return { error: "Ingredient not found." };

  const meal = (item as unknown as { meals: { id: string } | null }).meals;
  if (!meal) return { error: "Ingredient not found." };

  const chain = await getPatientChainForMeal(supabase, meal.id);
  if (!chain) return { error: "Couldn't resolve this ingredient's plan." };

  const currentDescription =
    (item as unknown as { foods: { description: string } | null }).foods?.description ??
    item.custom_food_name ??
    "ingredient";

  const result = await proposeIngredientAlternatives(
    currentDescription,
    item.quantity,
    item.unit,
    reason,
    customInstruction,
    { allergies: chain.allergies, dietaryRestrictions: chain.dietaryRestrictions, excludedFoods: chain.excludedFoods },
  );

  if (!result.success) return { error: result.error };

  const currentTotals: NutrientTotals = {
    calories: item.calories ?? 0,
    proteinG: item.protein_g ?? 0,
    carbsG: item.carbs_g ?? 0,
    fatG: item.fat_g ?? 0,
    fiberG: item.fiber_g ?? 0,
    sodiumMg: item.sodium_mg ?? 0,
  };

  const alternatives = await Promise.all(
    result.alternatives.map(async (alt) => {
      const { nutrition } = await resolveNutrition(alt.description, alt.quantity, alt.unit);
      return {
        description: alt.description,
        quantity: alt.quantity,
        unit: alt.unit,
        rationale: alt.rationale,
        nutrition,
        diff: {
          calories: round1(nutrition.calories - currentTotals.calories),
          proteinG: round1(nutrition.proteinG - currentTotals.proteinG),
          carbsG: round1(nutrition.carbsG - currentTotals.carbsG),
          fatG: round1(nutrition.fatG - currentTotals.fatG),
          fiberG: round1(nutrition.fiberG - currentTotals.fiberG),
          sodiumMg: round1(nutrition.sodiumMg - currentTotals.sodiumMg),
        },
        flaggedAllergen: findAllergenMatches(alt.description, chain.allergies).length > 0,
      } satisfies IngredientAlternativePreview;
    }),
  );

  return { alternatives };
}

export async function applyIngredientSubstitution(
  mealItemId: string,
  practitionerId: string,
  alternative: { description: string; quantity: number; unit: string },
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const chain = await getPatientChainForMealItem(supabase, mealItemId);
  if (!chain) return { error: "Ingredient not found." };

  if (findAllergenMatches(alternative.description, chain.allergies).length > 0) {
    return { error: "That alternative conflicts with a documented allergy and can't be applied." };
  }

  const { nutrition, foodId, source } = await resolveNutrition(alternative.description, alternative.quantity, alternative.unit);

  const { error } = await supabase
    .from("meal_items")
    .update({
      food_id: foodId,
      custom_food_name: foodId ? null : alternative.description,
      quantity: alternative.quantity,
      unit: alternative.unit,
      calories: source === "usda" ? nutrition.calories : null,
      protein_g: source === "usda" ? nutrition.proteinG : null,
      carbs_g: source === "usda" ? nutrition.carbsG : null,
      fat_g: source === "usda" ? nutrition.fatG : null,
      fiber_g: source === "usda" ? nutrition.fiberG : null,
      sodium_mg: source === "usda" ? nutrition.sodiumMg : null,
      nutrition_source: source,
    } as never)
    .eq("id", mealItemId);

  if (error) return { error: "Couldn't apply the substitution." };

  await supabase.from("ai_generations").insert({
    practitioner_id: practitionerId,
    patient_id: chain.patientId,
    generation_type: "substitution",
    model: CLAUDE_MODEL,
    status: "accepted",
    final_ref: mealItemId,
  } as never);

  return {};
}

async function getPatientChainForMealItem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  mealItemId: string,
): Promise<PatientChainInfo | null> {
  const { data } = await supabase.from("meal_items").select("meal_id").eq("id", mealItemId).single();
  if (!data) return null;
  return getPatientChainForMeal(supabase, data.meal_id);
}

// ─── Meal (whole) alternatives ──────────────────────────────────────────────

export type MealAlternativePreview = {
  name: string;
  prepInstructions: string;
  servings: number;
  rationale: string;
  ingredients: { description: string; quantity: number; unit: string }[];
  totals: NutrientTotals;
  flaggedIngredients: string[];
};

export async function previewMealAlternatives(
  mealId: string,
  reason: SubstitutionReason,
  customInstruction?: string,
): Promise<PreviewResult<MealAlternativePreview>> {
  const supabase = await createClient();

  const { data: meal } = await supabase.from("meals").select("*, meal_items(*)").eq("id", mealId).single();
  if (!meal) return { error: "Meal not found." };

  const chain = await getPatientChainForMeal(supabase, mealId);
  if (!chain) return { error: "Couldn't resolve this meal's plan." };

  const items = (meal as unknown as { meal_items: { custom_food_name: string | null; quantity: number; unit: string }[] }).meal_items;

  const result = await proposeMealAlternatives(
    {
      name: meal.name,
      ingredients: items.map((i) => ({ description: i.custom_food_name ?? "ingredient", quantity: i.quantity, unit: i.unit })),
    },
    reason,
    customInstruction,
    { allergies: chain.allergies, dietaryRestrictions: chain.dietaryRestrictions, excludedFoods: chain.excludedFoods },
  );

  if (!result.success) return { error: result.error };

  const alternatives = await Promise.all(
    result.alternatives.map(async (alt) => {
      const ingredientNutrition = await Promise.all(
        alt.ingredients.map((ing) => resolveNutrition(ing.description, ing.quantity, ing.unit)),
      );
      return {
        name: alt.name,
        prepInstructions: alt.prepInstructions,
        servings: alt.servings || 1,
        rationale: alt.rationale,
        ingredients: alt.ingredients,
        totals: sumNutrientTotals(ingredientNutrition.map((n) => n.nutrition)),
        flaggedIngredients: alt.ingredients
          .filter((ing) => findAllergenMatches(ing.description, chain.allergies).length > 0)
          .map((ing) => ing.description),
      } satisfies MealAlternativePreview;
    }),
  );

  return { alternatives };
}

export async function applyMealAlternative(
  mealId: string,
  practitionerId: string,
  alternative: {
    name: string;
    prepInstructions: string;
    servings: number;
    ingredients: { description: string; quantity: number; unit: string }[];
  },
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const chain = await getPatientChainForMeal(supabase, mealId);
  if (!chain) return { error: "Meal not found." };

  const safeIngredients = alternative.ingredients.filter(
    (ing) => findAllergenMatches(ing.description, chain.allergies).length === 0,
  );

  const updateRes = await supabase
    .from("meals")
    .update({
      name: alternative.name,
      prep_instructions: alternative.prepInstructions,
      servings: alternative.servings,
      is_ai_generated: true,
    })
    .eq("id", mealId);
  if (updateRes.error) return { error: "Couldn't apply the alternative." };

  const del = await supabase.from("meal_items").delete().eq("meal_id", mealId);
  if (del.error) return { error: "Couldn't apply the alternative." };

  for (let i = 0; i < safeIngredients.length; i++) {
    const ing = safeIngredients[i];
    const { nutrition, foodId, source } = await resolveNutrition(ing.description, ing.quantity, ing.unit);
    await supabase.from("meal_items").insert({
      meal_id: mealId,
      food_id: foodId,
      custom_food_name: foodId ? null : ing.description,
      quantity: ing.quantity,
      unit: ing.unit,
      calories: source === "usda" ? nutrition.calories : null,
      protein_g: source === "usda" ? nutrition.proteinG : null,
      carbs_g: source === "usda" ? nutrition.carbsG : null,
      fat_g: source === "usda" ? nutrition.fatG : null,
      fiber_g: source === "usda" ? nutrition.fiberG : null,
      sodium_mg: source === "usda" ? nutrition.sodiumMg : null,
      nutrition_source: source,
      position: i,
    } as never);
  }

  await supabase.from("ai_generations").insert({
    practitioner_id: practitionerId,
    patient_id: chain.patientId,
    generation_type: "alternative",
    model: CLAUDE_MODEL,
    status: "accepted",
    final_ref: mealId,
  } as never);

  return {};
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
