"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createMealPlanSchema, updateMealPlanSchema, type CreateMealPlanInput, type UpdateMealPlanInput } from "@/lib/validation/meal-plan";
import { canTransitionMealPlanStatus } from "@/lib/services/meal-plan-status";
import type { MealPlanStatus } from "@/types/database";

export type MealPlanActionResult = { error?: string; planId?: string };

export async function createMealPlanAction(input: CreateMealPlanInput): Promise<MealPlanActionResult> {
  const parsed = createMealPlanSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your entries." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Please log in again." };

  const data = parsed.data;

  const { data: plan, error } = await supabase
    .from("meal_plans")
    .insert({
      patient_id: data.patientId,
      practitioner_id: user.id,
      name: data.name,
      status: "draft",
      source: "manual",
      start_date: data.startDate || null,
      num_days: data.numDays,
      meals_per_day: data.mealsPerDay,
      snacks_per_day: data.snacksPerDay,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !plan) {
    return { error: "Couldn't create the meal plan. Please try again." };
  }

  const dayRows = Array.from({ length: data.numDays }, (_, i) => ({
    meal_plan_id: plan.id,
    day_number: i + 1,
  }));
  const daysInsert = await supabase.from("meal_plan_days").insert(dayRows);
  if (daysInsert.error) {
    return { error: "Plan was created, but its days couldn't be set up. Please try again.", planId: plan.id };
  }

  revalidatePath("/meal-plans");
  revalidatePath(`/patients/${data.patientId}/plans`);
  redirect(`/meal-plans/${plan.id}`);
}

export async function updateMealPlanAction(
  planId: string,
  input: UpdateMealPlanInput,
): Promise<MealPlanActionResult> {
  const parsed = updateMealPlanSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.from("meal_plans").update({ name: parsed.data.name }).eq("id", planId);
  if (error) return { error: "Couldn't rename the plan." };

  revalidatePath(`/meal-plans/${planId}`);
  return {};
}

export async function setMealPlanStatusAction(
  planId: string,
  currentStatus: MealPlanStatus,
  nextStatus: MealPlanStatus,
): Promise<{ error?: string }> {
  if (!canTransitionMealPlanStatus(currentStatus, nextStatus)) {
    return { error: "That status change isn't allowed." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const update: Record<string, unknown> = { status: nextStatus };
  if (nextStatus === "approved") {
    update.approved_at = new Date().toISOString();
    update.approved_by = user?.id ?? null;
  }

  const { error } = await supabase.from("meal_plans").update(update as never).eq("id", planId);
  if (error) return { error: "Couldn't update the plan status." };

  revalidatePath(`/meal-plans/${planId}`);
  revalidatePath("/meal-plans");
  return {};
}
