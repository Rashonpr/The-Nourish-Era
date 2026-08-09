import { CORE_NUTRIENTS, type NutrientAmount } from "./types";
import { convertQuantityToGrams, type ServingInfo } from "./unit-conversion";

export type NutrientTotals = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sodiumMg: number;
};

export const EMPTY_TOTALS: NutrientTotals = {
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  fiberG: 0,
  sodiumMg: 0,
};

/** Finds a nutrient's per-100g amount by name (case-insensitive). */
export function findNutrientPer100g(nutrients: NutrientAmount[], name: string): number {
  const match = nutrients.find((n) => n.name.toLowerCase() === name.toLowerCase());
  return match?.amountPer100g ?? 0;
}

/**
 * Calculates the nutrition contribution of one ingredient (quantity + unit
 * + its per-100g nutrient profile). This is the only place raw food data
 * gets turned into numbers — never trust an AI-invented value here.
 */
export function calculateIngredientNutrition(
  quantity: number,
  unit: string,
  nutrientsPer100g: NutrientAmount[],
  servingInfo?: ServingInfo,
): NutrientTotals {
  const grams = convertQuantityToGrams(quantity, unit, servingInfo);
  const scale = grams / 100;

  return {
    calories: round(findNutrientPer100g(nutrientsPer100g, CORE_NUTRIENTS.ENERGY) * scale),
    proteinG: round(findNutrientPer100g(nutrientsPer100g, CORE_NUTRIENTS.PROTEIN) * scale),
    carbsG: round(findNutrientPer100g(nutrientsPer100g, CORE_NUTRIENTS.CARBS) * scale),
    fatG: round(findNutrientPer100g(nutrientsPer100g, CORE_NUTRIENTS.FAT) * scale),
    fiberG: round(findNutrientPer100g(nutrientsPer100g, CORE_NUTRIENTS.FIBER) * scale),
    sodiumMg: round(findNutrientPer100g(nutrientsPer100g, CORE_NUTRIENTS.SODIUM) * scale),
  };
}

export function sumNutrientTotals(totals: NutrientTotals[]): NutrientTotals {
  return totals.reduce(
    (acc, t) => ({
      calories: round(acc.calories + t.calories),
      proteinG: round(acc.proteinG + t.proteinG),
      carbsG: round(acc.carbsG + t.carbsG),
      fatG: round(acc.fatG + t.fatG),
      fiberG: round(acc.fiberG + t.fiberG),
      sodiumMg: round(acc.sodiumMg + t.sodiumMg),
    }),
    { ...EMPTY_TOTALS },
  );
}

export function averageNutrientTotals(totals: NutrientTotals[]): NutrientTotals {
  if (totals.length === 0) return { ...EMPTY_TOTALS };
  const sum = sumNutrientTotals(totals);
  return {
    calories: round(sum.calories / totals.length),
    proteinG: round(sum.proteinG / totals.length),
    carbsG: round(sum.carbsG / totals.length),
    fatG: round(sum.fatG / totals.length),
    fiberG: round(sum.fiberG / totals.length),
    sodiumMg: round(sum.sodiumMg / totals.length),
  };
}

export type NutrientDiff = {
  target: number | null;
  actual: number;
  difference: number | null;
};

export type TargetComparison = {
  calories: NutrientDiff;
  proteinG: NutrientDiff;
  carbsG: NutrientDiff;
  fatG: NutrientDiff;
  fiberG: NutrientDiff;
  sodiumMg: NutrientDiff;
};

export type NutritionTargetLike = {
  calories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  fiberG?: number | null;
  sodiumMg?: number | null;
};

function diff(target: number | null | undefined, actual: number): NutrientDiff {
  const t = target ?? null;
  return { target: t, actual, difference: t === null ? null : round(actual - t) };
}

/** Compares calculated totals against a patient's nutrition targets. */
export function compareToTarget(actual: NutrientTotals, target: NutritionTargetLike): TargetComparison {
  return {
    calories: diff(target.calories, actual.calories),
    proteinG: diff(target.proteinG, actual.proteinG),
    carbsG: diff(target.carbsG, actual.carbsG),
    fatG: diff(target.fatG, actual.fatG),
    fiberG: diff(target.fiberG, actual.fiberG),
    sodiumMg: diff(target.sodiumMg, actual.sodiumMg),
  };
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
