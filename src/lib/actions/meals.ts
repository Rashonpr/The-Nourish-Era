"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { addMealSchema, updateMealSchema, type AddMealInput, type UpdateMealInput } from "@/lib/validation/meal-plan";
import type { MealItemRow } from "@/lib/data/meal-plans";

export type MealActionResult = { error?: string; mealId?: string };

async function getMealPlanIdForDay(
  supabase: Awaited<ReturnType<typeof createClient>>,
  mealPlanDayId: string,
): Promise<string | null> {
  const { data } = await supabase.from("meal_plan_days").select("meal_plan_id").eq("id", mealPlanDayId).single();
  return data?.meal_plan_id ?? null;
}

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

function revalidatePlan(planId: string | null) {
  if (planId) revalidatePath(`/meal-plans/${planId}`);
}

export async function addMealAction(input: AddMealInput): Promise<MealActionResult> {
  const parsed = addMealSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const data = parsed.data;

  const { count } = await supabase
    .from("meals")
    .select("id", { count: "exact", head: true })
    .eq("meal_plan_day_id", data.mealPlanDayId);

  const { data: meal, error } = await supabase
    .from("meals")
    .insert({
      meal_plan_day_id: data.mealPlanDayId,
      meal_type: data.mealType,
      name: data.name,
      prep_instructions: data.prepInstructions || null,
      servings: data.servings,
      position: count ?? 0,
    })
    .select("id")
    .single();

  if (error || !meal) return { error: "Couldn't add the meal. Please try again." };

  revalidatePlan(await getMealPlanIdForDay(supabase, data.mealPlanDayId));
  return { mealId: meal.id };
}

export async function updateMealAction(mealId: string, input: UpdateMealInput): Promise<MealActionResult> {
  const parsed = updateMealSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const data = parsed.data;

  const { error } = await supabase
    .from("meals")
    .update({
      meal_type: data.mealType,
      name: data.name,
      prep_instructions: data.prepInstructions || null,
      servings: data.servings,
    })
    .eq("id", mealId);

  if (error) return { error: "Couldn't update the meal." };

  revalidatePlan(await getMealPlanIdForMeal(supabase, mealId));
  return {};
}

export async function deleteMealAction(mealId: string): Promise<MealActionResult> {
  const supabase = await createClient();
  const planId = await getMealPlanIdForMeal(supabase, mealId);

  const { error } = await supabase.from("meals").delete().eq("id", mealId);
  if (error) return { error: "Couldn't delete the meal." };

  revalidatePlan(planId);
  return {};
}

export async function duplicateMealAction(mealId: string): Promise<MealActionResult> {
  const supabase = await createClient();

  const { data: meal } = await supabase.from("meals").select("*, meal_items(*)").eq("id", mealId).single();
  if (!meal) return { error: "Meal not found." };

  const { count } = await supabase
    .from("meals")
    .select("id", { count: "exact", head: true })
    .eq("meal_plan_day_id", meal.meal_plan_day_id);

  const { data: newMeal, error } = await supabase
    .from("meals")
    .insert({
      meal_plan_day_id: meal.meal_plan_day_id,
      meal_type: meal.meal_type,
      name: `${meal.name} (copy)`,
      prep_instructions: meal.prep_instructions,
      servings: meal.servings,
      position: count ?? 0,
    })
    .select("id")
    .single();

  if (error || !newMeal) return { error: "Couldn't duplicate the meal." };

  const items = (meal as unknown as { meal_items: MealItemRow[] }).meal_items;
  if (items.length > 0) {
    const newItems = items.map((item) => ({
      meal_id: newMeal.id,
      food_id: item.food_id,
      custom_food_name: item.custom_food_name,
      quantity: item.quantity,
      unit: item.unit,
      calories: item.calories,
      protein_g: item.protein_g,
      carbs_g: item.carbs_g,
      fat_g: item.fat_g,
      fiber_g: item.fiber_g,
      sodium_mg: item.sodium_mg,
      nutrition_source: item.nutrition_source,
      position: item.position,
    }));
    await supabase.from("meal_items").insert(newItems as never);
  }

  revalidatePlan(await getMealPlanIdForDay(supabase, meal.meal_plan_day_id));
  return { mealId: newMeal.id };
}

export async function moveMealAction(mealId: string, direction: "up" | "down"): Promise<MealActionResult> {
  const supabase = await createClient();

  const { data: meal } = await supabase.from("meals").select("*").eq("id", mealId).single();
  if (!meal) return { error: "Meal not found." };

  const { data: siblings } = await supabase
    .from("meals")
    .select("id, position")
    .eq("meal_plan_day_id", meal.meal_plan_day_id)
    .order("position");

  if (!siblings) return {};
  const index = siblings.findIndex((s) => s.id === mealId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= siblings.length) return {};

  const other = siblings[swapIndex];
  await Promise.all([
    supabase.from("meals").update({ position: other.position }).eq("id", mealId),
    supabase.from("meals").update({ position: meal.position }).eq("id", other.id),
  ]);

  revalidatePlan(await getMealPlanIdForDay(supabase, meal.meal_plan_day_id));
  return {};
}
