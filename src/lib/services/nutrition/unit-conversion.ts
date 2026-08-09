/**
 * Converts a meal-item quantity to grams so it can be scaled against a
 * food's per-100g nutrient data. Mass units convert exactly. Volume/count
 * units ("cup", "serving", "each", ...) fall back to the food's own
 * `servingSize` (assumed grams — a documented approximation for liquids
 * measured in mL) when available, and otherwise to treating the quantity
 * as grams directly, since that's the best available estimate without a
 * fuller unit/density database.
 */

const MASS_TO_GRAMS: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  kilogram: 1000,
  oz: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
  lb: 453.592,
  lbs: 453.592,
  pound: 453.592,
  pounds: 453.592,
};

export type ServingInfo = {
  servingSize?: number | null;
  servingSizeUnit?: string | null;
};

export function convertQuantityToGrams(quantity: number, unit: string, food?: ServingInfo): number {
  const normalizedUnit = unit.trim().toLowerCase();

  const massFactor = MASS_TO_GRAMS[normalizedUnit];
  if (massFactor) {
    return quantity * massFactor;
  }

  if (food?.servingSize && ["serving", "servings", "each", "unit", "units"].includes(normalizedUnit)) {
    return quantity * food.servingSize;
  }

  // No known conversion — assume the caller already means grams.
  return quantity;
}
