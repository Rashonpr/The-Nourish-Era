"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { patientFormSchema, type PatientFormInput } from "@/lib/validation/patient";
import { DIETARY_PREFERENCE_OPTIONS, CLINICAL_CONDITION_OPTIONS } from "@/config/patient-options";

export type PatientActionResult = { error?: string; patientId?: string };

async function requirePractitionerId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user.id;
}

/** Replaces every row of a patient child table with a fresh set (simple "current state" tables). */
async function replaceChildRows<T extends Record<string, unknown>>(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: "patient_allergies" | "patient_dietary_preferences" | "patient_food_preferences" | "patient_conditions",
  patientId: string,
  rows: T[],
) {
  const del = await supabase.from(table).delete().eq("patient_id", patientId);
  if (del.error) throw del.error;
  if (rows.length === 0) return;
  const ins = await supabase.from(table).insert(rows as never);
  if (ins.error) throw ins.error;
}

async function saveChildRecords(
  supabase: Awaited<ReturnType<typeof createClient>>,
  patientId: string,
  data: PatientFormInput,
) {
  await replaceChildRows(
    supabase,
    "patient_allergies",
    patientId,
    data.allergies.map((a) => ({
      patient_id: patientId,
      allergen: a.allergen,
      is_custom: a.isCustom,
      severity: a.severity,
    })),
  );

  await replaceChildRows(
    supabase,
    "patient_dietary_preferences",
    patientId,
    data.dietaryPreferences.map((p) => ({
      patient_id: patientId,
      preference: p,
      is_custom: !(DIETARY_PREFERENCE_OPTIONS as readonly string[]).includes(p),
    })),
  );

  const foodPrefRows = [
    ...data.favoriteFoods.map((food_name) => ({ patient_id: patientId, category: "favorite" as const, food_name })),
    ...data.dislikedFoods.map((food_name) => ({ patient_id: patientId, category: "dislike" as const, food_name })),
    ...data.refusedFoods.map((food_name) => ({ patient_id: patientId, category: "refuse" as const, food_name })),
  ];
  await replaceChildRows(supabase, "patient_food_preferences", patientId, foodPrefRows);

  await replaceChildRows(
    supabase,
    "patient_conditions",
    patientId,
    data.conditions.map((c) => ({
      patient_id: patientId,
      condition: c,
      is_custom: !(CLINICAL_CONDITION_OPTIONS as readonly string[]).includes(c),
    })),
  );

  const lifestylePayload = {
    patient_id: patientId,
    meals_per_day: data.mealsPerDay ?? null,
    snacks_per_day: data.snacksPerDay ?? null,
    cooking_ability: data.cookingAbility ?? null,
    prep_time_minutes: data.prepTimeMinutes ?? null,
    budget_level: data.budgetLevel ?? null,
    eating_out_frequency: data.eatingOutFrequency ?? null,
    work_schedule_notes: data.workScheduleNotes ?? null,
    exercise_frequency: data.exerciseFrequency ?? null,
    exercise_type: data.exerciseType ?? null,
  };
  const lifestyleRes = await supabase
    .from("patient_lifestyle")
    .upsert(lifestylePayload as never, { onConflict: "patient_id" });
  if (lifestyleRes.error) throw lifestyleRes.error;

  const delMeds = await supabase.from("patient_medications").delete().eq("patient_id", patientId);
  if (delMeds.error) throw delMeds.error;
  if (data.medicationsNotes) {
    const insMeds = await supabase
      .from("patient_medications")
      .insert({ patient_id: patientId, notes: data.medicationsNotes } as never);
    if (insMeds.error) throw insMeds.error;
  }
}

export async function createPatientAction(input: PatientFormInput): Promise<PatientActionResult> {
  const parsed = patientFormSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your entries." };
  }

  let practitionerId: string;
  try {
    practitionerId = await requirePractitionerId();
  } catch {
    return { error: "Your session has expired. Please log in again." };
  }

  const supabase = await createClient();
  const data = parsed.data;

  const { data: patient, error } = await supabase
    .from("patients")
    .insert({
      practitioner_id: practitionerId,
      first_name: data.firstName,
      last_name: data.lastName,
      date_of_birth: data.dateOfBirth || null,
      sex: data.sex ?? null,
      height_cm: data.heightCm ?? null,
      current_weight_kg: data.currentWeightKg ?? null,
      goal_weight_kg: data.goalWeightKg ?? null,
      preferred_units: data.preferredUnits,
      activity_level: data.activityLevel ?? null,
      primary_goal: data.primaryGoal || null,
      primary_goal_custom: data.primaryGoalCustom ?? null,
      created_by: practitionerId,
    })
    .select("id")
    .single();

  if (error || !patient) {
    return { error: "Couldn't create the patient. Please try again." };
  }

  try {
    await saveChildRecords(supabase, patient.id, data);
  } catch {
    return {
      error: "Patient was created, but some details couldn't be saved. Open the patient to review and re-save.",
      patientId: patient.id,
    };
  }

  revalidatePath("/patients");
  revalidatePath("/dashboard");
  redirect(`/patients/${patient.id}`);
}

export async function updatePatientAction(
  patientId: string,
  input: PatientFormInput,
): Promise<PatientActionResult> {
  const parsed = patientFormSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your entries." };
  }

  const supabase = await createClient();
  const data = parsed.data;

  const { error } = await supabase
    .from("patients")
    .update({
      first_name: data.firstName,
      last_name: data.lastName,
      date_of_birth: data.dateOfBirth || null,
      sex: data.sex ?? null,
      height_cm: data.heightCm ?? null,
      current_weight_kg: data.currentWeightKg ?? null,
      goal_weight_kg: data.goalWeightKg ?? null,
      preferred_units: data.preferredUnits,
      activity_level: data.activityLevel ?? null,
      primary_goal: data.primaryGoal || null,
      primary_goal_custom: data.primaryGoalCustom ?? null,
    })
    .eq("id", patientId);

  if (error) {
    return { error: "Couldn't save changes. Please try again." };
  }

  try {
    await saveChildRecords(supabase, patientId, data);
  } catch {
    return { error: "Basic info was saved, but some details couldn't be updated. Please try again." };
  }

  revalidatePath("/patients");
  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}`);
}

export async function setPatientStatusAction(
  patientId: string,
  status: "active" | "archived",
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("patients").update({ status }).eq("id", patientId);
  if (error) return { error: "Couldn't update patient status." };

  revalidatePath("/patients");
  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/dashboard");
  return {};
}
