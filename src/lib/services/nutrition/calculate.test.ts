import { describe, expect, it } from "vitest";
import {
  calculateIngredientNutrition,
  sumNutrientTotals,
  averageNutrientTotals,
  compareToTarget,
  findNutrientPer100g,
} from "./calculate";
import { CORE_NUTRIENTS, type NutrientAmount } from "./types";

const chickenBreastPer100g: NutrientAmount[] = [
  { name: CORE_NUTRIENTS.ENERGY, unit: "KCAL", amountPer100g: 165 },
  { name: CORE_NUTRIENTS.PROTEIN, unit: "G", amountPer100g: 31 },
  { name: CORE_NUTRIENTS.FAT, unit: "G", amountPer100g: 3.6 },
  { name: CORE_NUTRIENTS.CARBS, unit: "G", amountPer100g: 0 },
  { name: CORE_NUTRIENTS.FIBER, unit: "G", amountPer100g: 0 },
  { name: CORE_NUTRIENTS.SODIUM, unit: "MG", amountPer100g: 74 },
];

describe("findNutrientPer100g", () => {
  it("is case-insensitive", () => {
    expect(findNutrientPer100g(chickenBreastPer100g, "energy")).toBe(165);
  });

  it("returns 0 when the nutrient is absent", () => {
    expect(findNutrientPer100g(chickenBreastPer100g, "Vitamin C")).toBe(0);
  });
});

describe("calculateIngredientNutrition", () => {
  it("scales nutrients from a 100g basis using grams directly", () => {
    const result = calculateIngredientNutrition(200, "g", chickenBreastPer100g);
    expect(result.calories).toBe(330);
    expect(result.proteinG).toBe(62);
    expect(result.fatG).toBe(7.2);
    expect(result.sodiumMg).toBe(148);
  });

  it("converts ounces to grams before scaling", () => {
    // 4 oz ≈ 113.398g -> ~1.13398x the per-100g values
    const result = calculateIngredientNutrition(4, "oz", chickenBreastPer100g);
    expect(result.calories).toBeCloseTo(165 * 1.13398, 0);
  });

  it("never invents a value for a nutrient the food data doesn't have", () => {
    const noSodiumData: NutrientAmount[] = [{ name: CORE_NUTRIENTS.ENERGY, unit: "KCAL", amountPer100g: 100 }];
    const result = calculateIngredientNutrition(100, "g", noSodiumData);
    expect(result.sodiumMg).toBe(0);
  });
});

describe("sumNutrientTotals / averageNutrientTotals", () => {
  it("sums multiple ingredients into a meal total", () => {
    const chicken = calculateIngredientNutrition(100, "g", chickenBreastPer100g);
    const total = sumNutrientTotals([chicken, chicken]);
    expect(total.calories).toBe(330);
    expect(total.proteinG).toBe(62);
  });

  it("averages daily totals into a plan-level average", () => {
    const day1 = { calories: 2000, proteinG: 150, carbsG: 200, fatG: 60, fiberG: 25, sodiumMg: 2000 };
    const day2 = { calories: 2200, proteinG: 170, carbsG: 220, fatG: 70, fiberG: 30, sodiumMg: 2200 };
    const avg = averageNutrientTotals([day1, day2]);
    expect(avg.calories).toBe(2100);
    expect(avg.proteinG).toBe(160);
  });

  it("returns zeroed totals when averaging an empty list", () => {
    const avg = averageNutrientTotals([]);
    expect(avg.calories).toBe(0);
  });
});

describe("compareToTarget", () => {
  it("computes the difference between plan totals and practitioner targets", () => {
    const actual = { calories: 2165, proteinG: 171, carbsG: 210, fatG: 65, fiberG: 28, sodiumMg: 2100 };
    const target = { calories: 2200, proteinG: 175 };
    const comparison = compareToTarget(actual, target);

    expect(comparison.calories).toEqual({ target: 2200, actual: 2165, difference: -35 });
    expect(comparison.proteinG).toEqual({ target: 175, actual: 171, difference: -4 });
  });

  it("returns a null difference when no target is set for a nutrient", () => {
    const actual = { calories: 2000, proteinG: 150, carbsG: 200, fatG: 60, fiberG: 25, sodiumMg: 2000 };
    const comparison = compareToTarget(actual, {});
    expect(comparison.fiberG).toEqual({ target: null, actual: 25, difference: null });
  });
});
