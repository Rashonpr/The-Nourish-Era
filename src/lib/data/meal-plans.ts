import { createClient } from "@/lib/supabase/server";
import type { Database, MealPlanStatus } from "@/types/database";

export type MealPlanRow = Database["public"]["Tables"]["meal_plans"]["Row"];
export type MealPlanDayRow = Database["public"]["Tables"]["meal_plan_days"]["Row"];
export type MealRow = Database["public"]["Tables"]["meals"]["Row"];
export type MealItemRow = Database["public"]["Tables"]["meal_items"]["Row"];

export type MealItemWithFood = MealItemRow & { foods: { description: string } | null };
export type MealWithItems = MealRow & { meal_items: MealItemWithFood[] };
export type DayWithMeals = MealPlanDayRow & { meals: MealWithItems[] };

export type MealPlanDetail = {
  plan: MealPlanRow;
  patient: { id: string; first_name: string; last_name: string };
  activeTarget: Database["public"]["Tables"]["nutrition_targets"]["Row"] | null;
  days: DayWithMeals[];
};

export async function getMealPlanDetail(planId: string): Promise<MealPlanDetail | null> {
  const supabase = await createClient();

  const { data: plan, error } = await supabase.from("meal_plans").select("*").eq("id", planId).single();
  if (error || !plan) return null;

  const [patientRes, targetRes, daysRes] = await Promise.all([
    supabase.from("patients").select("id, first_name, last_name").eq("id", plan.patient_id).single(),
    supabase
      .from("nutrition_targets")
      .select("*")
      .eq("patient_id", plan.patient_id)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("meal_plan_days")
      .select("*, meals(*, meal_items(*, foods(description)))")
      .eq("meal_plan_id", planId)
      .order("day_number"),
  ]);

  if (!patientRes.data) return null;

  const days = (daysRes.data ?? []) as unknown as DayWithMeals[];
  for (const day of days) {
    day.meals.sort((a, b) => a.position - b.position);
    for (const meal of day.meals) {
      meal.meal_items.sort((a, b) => a.position - b.position);
    }
  }

  return {
    plan,
    patient: patientRes.data,
    activeTarget: targetRes.data ?? null,
    days,
  };
}

export type MealPlanListItem = MealPlanRow & { patientName: string };

export async function listMealPlans(
  practitionerId: string,
  opts: { status?: MealPlanStatus; patientId?: string } = {},
): Promise<MealPlanListItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("meal_plans")
    .select("*, patients(first_name, last_name)")
    .eq("practitioner_id", practitionerId)
    .order("updated_at", { ascending: false });

  if (opts.status) query = query.eq("status", opts.status);
  if (opts.patientId) query = query.eq("patient_id", opts.patientId);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => {
    const { patients, ...plan } = row as unknown as MealPlanRow & {
      patients: { first_name: string; last_name: string } | null;
    };
    return { ...plan, patientName: patients ? `${patients.first_name} ${patients.last_name}` : "Unknown patient" };
  });
}
