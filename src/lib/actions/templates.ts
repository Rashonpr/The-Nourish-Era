"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type TemplateActionResult = { error?: string; templateId?: string };

const saveTemplateSchema = z.object({
  name: z.string().trim().min(1, "Give this template a name").max(160),
  description: z.string().trim().max(500).optional(),
  category: z.string().trim().max(80).optional(),
});

export async function saveMealPlanAsTemplateAction(
  planId: string,
  input: { name: string; description?: string; category?: string },
): Promise<TemplateActionResult> {
  const parsed = saveTemplateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Please log in again." };

  const { data: plan } = await supabase.from("meal_plans").select("*").eq("id", planId).single();
  if (!plan) return { error: "Meal plan not found." };

  const { data: days } = await supabase
    .from("meal_plan_days")
    .select("*, meals(*, meal_items(*))")
    .eq("meal_plan_id", planId)
    .order("day_number");
  if (!days) return { error: "Couldn't load this plan's meals." };

  const { data: template, error: templateError } = await supabase
    .from("templates")
    .insert({
      practitioner_id: user.id,
      name: parsed.data.name,
      description: parsed.data.description || null,
      category: parsed.data.category || null,
      num_days: plan.num_days,
      meals_per_day: plan.meals_per_day,
      snacks_per_day: plan.snacks_per_day,
    })
    .select("id")
    .single();

  if (templateError || !template) return { error: "Couldn't create the template." };

  type DayWithMeals = { day_number: number; meals: { meal_type: string; name: string; position: number; prep_instructions: string | null; servings: number; meal_items: { food_id: string | null; custom_food_name: string | null; quantity: number; unit: string; calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null; fiber_g: number | null; sodium_mg: number | null; nutrition_source: string; position: number }[] }[] };

  for (const day of days as unknown as DayWithMeals[]) {
    const { data: templateDay, error: dayError } = await supabase
      .from("template_days")
      .insert({ template_id: template.id, day_number: day.day_number })
      .select("id")
      .single();
    if (dayError || !templateDay) continue;

    for (const meal of day.meals) {
      const { data: templateMeal, error: mealError } = await supabase
        .from("template_meals")
        .insert({
          template_day_id: templateDay.id,
          meal_type: meal.meal_type,
          name: meal.name,
          position: meal.position,
          prep_instructions: meal.prep_instructions,
          servings: meal.servings,
        } as never)
        .select("id")
        .single();
      if (mealError || !templateMeal) continue;

      if (meal.meal_items.length === 0) continue;
      const itemRows = meal.meal_items.map((item) => ({
        template_meal_id: templateMeal.id,
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
      await supabase.from("template_meal_items").insert(itemRows as never);
    }
  }

  revalidatePath("/templates");
  return { templateId: template.id };
}

export async function deleteTemplateAction(templateId: string): Promise<TemplateActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("templates").delete().eq("id", templateId);
  if (error) return { error: "Couldn't delete the template." };
  revalidatePath("/templates");
  return {};
}

export async function applyTemplateToPatientAction(templateId: string, patientId: string): Promise<TemplateActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Please log in again." };

  const { data: template } = await supabase.from("templates").select("*").eq("id", templateId).single();
  if (!template) return { error: "Template not found." };

  const { data: templateDays } = await supabase
    .from("template_days")
    .select("*, template_meals(*, template_meal_items(*))")
    .eq("template_id", templateId)
    .order("day_number");
  if (!templateDays) return { error: "Couldn't load this template." };

  const { data: patient } = await supabase.from("patients").select("first_name").eq("id", patientId).single();
  if (!patient) return { error: "Patient not found." };

  const { data: plan, error: planError } = await supabase
    .from("meal_plans")
    .insert({
      patient_id: patientId,
      practitioner_id: user.id,
      name: `${template.name} — ${patient.first_name}`,
      status: "draft",
      source: "manual",
      num_days: template.num_days,
      meals_per_day: template.meals_per_day,
      snacks_per_day: template.snacks_per_day,
      template_id: templateId,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (planError || !plan) return { error: "Couldn't create the plan from this template." };

  type TemplateDayWithMeals = {
    day_number: number;
    template_meals: {
      meal_type: string;
      name: string;
      position: number;
      prep_instructions: string | null;
      servings: number;
      template_meal_items: { food_id: string | null; custom_food_name: string | null; quantity: number; unit: string; calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null; fiber_g: number | null; sodium_mg: number | null; nutrition_source: string; position: number }[];
    }[];
  };

  for (const day of templateDays as unknown as TemplateDayWithMeals[]) {
    const { data: planDay, error: dayError } = await supabase
      .from("meal_plan_days")
      .insert({ meal_plan_id: plan.id, day_number: day.day_number })
      .select("id")
      .single();
    if (dayError || !planDay) continue;

    for (const meal of day.template_meals) {
      const { data: planMeal, error: mealError } = await supabase
        .from("meals")
        .insert({
          meal_plan_day_id: planDay.id,
          meal_type: meal.meal_type,
          name: meal.name,
          position: meal.position,
          prep_instructions: meal.prep_instructions,
          servings: meal.servings,
        } as never)
        .select("id")
        .single();
      if (mealError || !planMeal) continue;

      if (meal.template_meal_items.length === 0) continue;
      const itemRows = meal.template_meal_items.map((item) => ({
        meal_id: planMeal.id,
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
      await supabase.from("meal_items").insert(itemRows as never);
    }
  }

  redirect(`/meal-plans/${plan.id}`);
}
