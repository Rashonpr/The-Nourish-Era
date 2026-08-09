"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { nutritionTargetFormSchema, type NutritionTargetFormInput } from "@/lib/validation/nutrition-targets";

export type NutritionTargetActionResult = { error?: string; success?: boolean };

export async function saveNutritionTargetsAction(
  patientId: string,
  input: NutritionTargetFormInput,
): Promise<NutritionTargetActionResult> {
  const parsed = nutritionTargetFormSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your entries." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Please log in again." };

  const data = parsed.data;

  // Deactivate the previous active target (history is preserved, not deleted).
  const deactivate = await supabase
    .from("nutrition_targets")
    .update({ is_active: false })
    .eq("patient_id", patientId)
    .eq("is_active", true);
  if (deactivate.error) {
    return { error: "Couldn't save targets. Please try again." };
  }

  const insert = await supabase.from("nutrition_targets").insert({
    patient_id: patientId,
    calories: data.calories ?? null,
    protein_g: data.proteinG ?? null,
    carbs_g: data.carbsG ?? null,
    fat_g: data.fatG ?? null,
    fiber_g: data.fiberG ?? null,
    sodium_mg: data.sodiumMg ?? null,
    added_sugar_g: data.addedSugarG ?? null,
    saturated_fat_g: data.saturatedFatG ?? null,
    water_ml: data.waterMl ?? null,
    calc_method: data.calcMethod ?? null,
    calc_inputs: data.calcInputs ?? null,
    is_active: true,
    created_by: user.id,
  } as never);

  if (insert.error) {
    return { error: "Couldn't save targets. Please try again." };
  }

  revalidatePath(`/patients/${patientId}`);
  revalidatePath(`/patients/${patientId}/targets`);
  revalidatePath(`/patients/${patientId}/overview`);
  return { success: true };
}
