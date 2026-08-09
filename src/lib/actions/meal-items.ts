"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrCacheFood, toNutrientAmounts } from "@/lib/services/nutrition/food-cache";
import { calculateIngredientNutrition } from "@/lib/services/nutrition/calculate";
import {
  addMealItemFromFoodSchema,
  addCustomMealItemSchema,
  updateMealItemQuantitySchema,
  type AddMealItemFromFoodInput,
  type AddCustomMealItemInput,
  type UpdateMealItemQuantityInput,
} from "@/lib/validation/meal-plan";

export type MealItemActionResult = { error?: string };

async function getMealPlanIdForMeal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  mealId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("meals")
    .select("meal_plan_day_id, meal_plan_days(meal_plan_id)")
    .eq("id", mealId)
    .single();
  const joined = data as unknown as { meal_plan_days: { meal_plan_id: string } | null } | null;
  return joined?.meal_plan_days?.meal_plan_id ?? null;
}

async function getMealPlanIdForItem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  mealItemId: string,
): Promise<{ planId: string | null; mealId: string | null }> {
  const { data } = await supabase
    .from("meal_items")
    .select("meal_id, meals(meal_plan_day_id, meal_plan_days(meal_plan_id))")
    .eq("id", mealItemId)
    .single();
  const joined = data as unknown as {
    meal_id: string;
    meals: { meal_plan_days: { meal_plan_id: string } | null } | null;
  } | null;
  return { planId: joined?.meals?.meal_plan_days?.meal_plan_id ?? null, mealId: joined?.meal_id ?? null };
}

function revalidatePlan(planId: string | null) {
  if (planId) revalidatePath(`/meal-plans/${planId}`);
}

export async function addMealItemFromFoodAction(input: AddMealItemFromFoodInput): Promise<MealItemActionResult> {
  const parsed = addMealItemFromFoodSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const data = parsed.data;

  const supabase = await createClient();

  let food;
  try {
    food = await getOrCacheFood(data.externalId);
  } catch {
    return { error: "The nutrition database is temporarily unavailable. Please try again." };
  }
  if (!food) return { error: "Couldn't find that food. Please search again." };

  const { count } = await supabase
    .from("meal_items")
    .select("id", { count: "exact", head: true })
    .eq("meal_id", data.mealId);

  const nutrition = calculateIngredientNutrition(data.quantity, data.unit, toNutrientAmounts(food.nutrients), {
    servingSize: food.serving_size,
    servingSizeUnit: food.serving_size_unit,
  });

  const { error } = await supabase.from("meal_items").insert({
    meal_id: data.mealId,
    food_id: food.id,
    quantity: data.quantity,
    unit: data.unit,
    calories: nutrition.calories,
    protein_g: nutrition.proteinG,
    carbs_g: nutrition.carbsG,
    fat_g: nutrition.fatG,
    fiber_g: nutrition.fiberG,
    sodium_mg: nutrition.sodiumMg,
    nutrition_source: "usda",
    position: count ?? 0,
  } as never);

  if (error) return { error: "Couldn't add the ingredient. Please try again." };

  revalidatePlan(await getMealPlanIdForMeal(supabase, data.mealId));
  return {};
}

export async function addCustomMealItemAction(input: AddCustomMealItemInput): Promise<MealItemActionResult> {
  const parsed = addCustomMealItemSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const data = parsed.data;

  const supabase = await createClient();

  const { count } = await supabase
    .from("meal_items")
    .select("id", { count: "exact", head: true })
    .eq("meal_id", data.mealId);

  const { error } = await supabase.from("meal_items").insert({
    meal_id: data.mealId,
    custom_food_name: data.customFoodName,
    quantity: data.quantity,
    unit: data.unit,
    calories: data.calories ?? null,
    protein_g: data.proteinG ?? null,
    carbs_g: data.carbsG ?? null,
    fat_g: data.fatG ?? null,
    fiber_g: data.fiberG ?? null,
    sodium_mg: data.sodiumMg ?? null,
    nutrition_source: "manual",
    position: count ?? 0,
  } as never);

  if (error) return { error: "Couldn't add the ingredient. Please try again." };

  revalidatePlan(await getMealPlanIdForMeal(supabase, data.mealId));
  return {};
}

export async function updateMealItemQuantityAction(
  input: UpdateMealItemQuantityInput,
): Promise<MealItemActionResult> {
  const parsed = updateMealItemQuantitySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const data = parsed.data;

  const supabase = await createClient();

  const { data: item } = await supabase.from("meal_items").select("*").eq("id", data.mealItemId).single();
  if (!item) return { error: "Ingredient not found." };

  let update: Record<string, unknown> = { quantity: data.quantity, unit: data.unit };

  if (item.nutrition_source === "usda" && item.food_id) {
    const { data: food } = await supabase.from("foods").select("*").eq("id", item.food_id).single();
    const { data: nutrientRows } = await supabase.from("nutrition_data").select("*").eq("food_id", item.food_id);
    if (food) {
      const nutrition = calculateIngredientNutrition(
        data.quantity,
        data.unit,
        toNutrientAmounts(nutrientRows ?? []),
        { servingSize: food.serving_size, servingSizeUnit: food.serving_size_unit },
      );
      update = {
        ...update,
        calories: nutrition.calories,
        protein_g: nutrition.proteinG,
        carbs_g: nutrition.carbsG,
        fat_g: nutrition.fatG,
        fiber_g: nutrition.fiberG,
        sodium_mg: nutrition.sodiumMg,
      };
    }
  }

  const { error } = await supabase.from("meal_items").update(update as never).eq("id", data.mealItemId);
  if (error) return { error: "Couldn't update the ingredient." };

  const { planId } = await getMealPlanIdForItem(supabase, data.mealItemId);
  revalidatePlan(planId);
  return {};
}

export async function deleteMealItemAction(mealItemId: string): Promise<MealItemActionResult> {
  const supabase = await createClient();
  const { planId } = await getMealPlanIdForItem(supabase, mealItemId);

  const { error } = await supabase.from("meal_items").delete().eq("id", mealItemId);
  if (error) return { error: "Couldn't remove the ingredient." };

  revalidatePlan(planId);
  return {};
}
