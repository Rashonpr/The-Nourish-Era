import type { PatientDetail } from "@/lib/data/patients";
import type { PatientFormInput } from "@/lib/validation/patient";

export function patientDetailToFormInput(detail: PatientDetail): Partial<PatientFormInput> {
  const { patient, allergies, dietaryPreferences, foodPreferences, lifestyle, conditions, medicationsNotes } = detail;

  return {
    firstName: patient.first_name,
    lastName: patient.last_name,
    dateOfBirth: patient.date_of_birth ?? "",
    sex: patient.sex ?? undefined,
    preferredUnits: patient.preferred_units,
    heightCm: patient.height_cm ?? undefined,
    currentWeightKg: patient.current_weight_kg ?? undefined,
    goalWeightKg: patient.goal_weight_kg ?? undefined,
    activityLevel: patient.activity_level ?? undefined,
    primaryGoal: patient.primary_goal ?? "",
    primaryGoalCustom: patient.primary_goal_custom ?? undefined,
    dietaryPreferences: dietaryPreferences.map((p) => p.preference),
    allergies: allergies.map((a) => ({ allergen: a.allergen, isCustom: a.is_custom, severity: a.severity })),
    favoriteFoods: foodPreferences.filter((f) => f.category === "favorite").map((f) => f.food_name),
    dislikedFoods: foodPreferences.filter((f) => f.category === "dislike").map((f) => f.food_name),
    refusedFoods: foodPreferences.filter((f) => f.category === "refuse").map((f) => f.food_name),
    mealsPerDay: lifestyle?.meals_per_day ?? undefined,
    snacksPerDay: lifestyle?.snacks_per_day ?? undefined,
    cookingAbility: lifestyle?.cooking_ability ?? undefined,
    prepTimeMinutes: lifestyle?.prep_time_minutes ?? undefined,
    budgetLevel: lifestyle?.budget_level ?? undefined,
    eatingOutFrequency: lifestyle?.eating_out_frequency ?? undefined,
    workScheduleNotes: lifestyle?.work_schedule_notes ?? undefined,
    exerciseFrequency: lifestyle?.exercise_frequency ?? undefined,
    exerciseType: lifestyle?.exercise_type ?? undefined,
    conditions: conditions.map((c) => c.condition),
    medicationsNotes: medicationsNotes ?? undefined,
  };
}
