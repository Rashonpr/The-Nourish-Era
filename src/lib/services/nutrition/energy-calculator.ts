/**
 * Estimates starting energy needs using standard, published formulas.
 * This produces a *starting point only* — the practitioner reviews the
 * calculation and can override every value. Nothing here is written to
 * the database automatically.
 */

export type EnergyFormula = "mifflin_st_jeor" | "harris_benedict";

export type EnergyEstimateInput = {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: "male" | "female";
  activityLevel: "sedentary" | "lightly_active" | "moderately_active" | "very_active" | "extra_active";
  formula?: EnergyFormula;
  /** Daily calorie adjustment from TDEE, e.g. -500 for ~1 lb/week loss. */
  calorieAdjustment?: number;
};

export const ACTIVITY_MULTIPLIERS: Record<EnergyEstimateInput["activityLevel"], number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

export const FORMULA_LABELS: Record<EnergyFormula, string> = {
  mifflin_st_jeor: "Mifflin-St Jeor",
  harris_benedict: "Harris-Benedict (revised)",
};

export type EnergyEstimateResult = {
  formula: EnergyFormula;
  formulaLabel: string;
  bmr: number;
  activityMultiplier: number;
  tdee: number;
  calorieAdjustment: number;
  estimatedCalories: number;
  steps: string[];
};

function calculateBmr(input: EnergyEstimateInput, formula: EnergyFormula): number {
  const { weightKg, heightCm, age, sex } = input;

  if (formula === "harris_benedict") {
    return sex === "male"
      ? 13.397 * weightKg + 4.799 * heightCm - 5.677 * age + 88.362
      : 9.247 * weightKg + 3.098 * heightCm - 4.33 * age + 447.593;
  }

  // Mifflin-St Jeor (default) — the formula recommended by the Academy of
  // Nutrition and Dietetics for most adults.
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

export function estimateEnergyNeeds(input: EnergyEstimateInput): EnergyEstimateResult {
  const formula = input.formula ?? "mifflin_st_jeor";
  const calorieAdjustment = input.calorieAdjustment ?? 0;

  const bmr = Math.round(calculateBmr(input, formula));
  const activityMultiplier = ACTIVITY_MULTIPLIERS[input.activityLevel];
  const tdee = Math.round(bmr * activityMultiplier);
  const estimatedCalories = Math.max(0, Math.round(tdee + calorieAdjustment));

  const steps = [
    `BMR (${FORMULA_LABELS[formula]}) = ${bmr} kcal/day`,
    `TDEE = BMR × activity factor (${activityMultiplier}) = ${tdee} kcal/day`,
    calorieAdjustment !== 0
      ? `Estimated calorie target = TDEE ${calorieAdjustment > 0 ? "+" : ""}${calorieAdjustment} = ${estimatedCalories} kcal/day`
      : `Estimated calorie target = TDEE = ${estimatedCalories} kcal/day`,
  ];

  return {
    formula,
    formulaLabel: FORMULA_LABELS[formula],
    bmr,
    activityMultiplier,
    tdee,
    calorieAdjustment,
    estimatedCalories,
    steps,
  };
}

export type MacroSuggestion = {
  proteinG: number;
  fatG: number;
  carbsG: number;
  fiberG: number;
  sodiumMg: number;
};

/**
 * Suggests a starting macro split from an estimated calorie target.
 * Protein is weight-based (g/kg); fat and carbs fill the remaining
 * calories. These are defaults only — every value is editable.
 */
export function suggestMacros(calories: number, weightKg: number, proteinGPerKg = 1.6): MacroSuggestion {
  const proteinG = Math.round(weightKg * proteinGPerKg);
  const fatG = Math.round((calories * 0.3) / 9);
  const proteinCalories = proteinG * 4;
  const fatCalories = fatG * 9;
  const carbsG = Math.max(0, Math.round((calories - proteinCalories - fatCalories) / 4));
  const fiberG = Math.round((calories / 1000) * 14);

  return {
    proteinG,
    fatG,
    carbsG,
    fiberG,
    sodiumMg: 2300,
  };
}
