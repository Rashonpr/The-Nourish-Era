import { describe, expect, it } from "vitest";
import {
  createMealPlanSchema,
  addMealItemFromFoodSchema,
  addCustomMealItemSchema,
} from "./meal-plan";

describe("createMealPlanSchema", () => {
  const valid = {
    patientId: "123e4567-e89b-12d3-a456-426614174000",
    name: "Sample plan",
    numDays: 7,
    mealsPerDay: 3,
    snacksPerDay: 1,
  };

  it("accepts a valid plan creation payload", () => {
    expect(createMealPlanSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a non-UUID patientId", () => {
    const result = createMealPlanSchema.safeParse({ ...valid, patientId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects a plan with no name", () => {
    const result = createMealPlanSchema.safeParse({ ...valid, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a plan longer than 28 days", () => {
    const result = createMealPlanSchema.safeParse({ ...valid, numDays: 40 });
    expect(result.success).toBe(false);
  });

  it("rejects zero meals per day", () => {
    const result = createMealPlanSchema.safeParse({ ...valid, mealsPerDay: 0 });
    expect(result.success).toBe(false);
  });
});

describe("addMealItemFromFoodSchema", () => {
  it("accepts a valid USDA-matched ingredient", () => {
    const result = addMealItemFromFoodSchema.safeParse({
      mealId: "123e4567-e89b-12d3-a456-426614174000",
      externalId: "171077",
      description: "Chicken breast",
      quantity: 150,
      unit: "g",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-positive quantity", () => {
    const result = addMealItemFromFoodSchema.safeParse({
      mealId: "123e4567-e89b-12d3-a456-426614174000",
      externalId: "171077",
      description: "Chicken breast",
      quantity: 0,
      unit: "g",
    });
    expect(result.success).toBe(false);
  });
});

describe("addCustomMealItemSchema", () => {
  it("accepts a manual entry with no nutrition values", () => {
    const result = addCustomMealItemSchema.safeParse({
      mealId: "123e4567-e89b-12d3-a456-426614174000",
      customFoodName: "Homemade lentil soup",
      quantity: 1,
      unit: "bowl",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a negative calorie value", () => {
    const result = addCustomMealItemSchema.safeParse({
      mealId: "123e4567-e89b-12d3-a456-426614174000",
      customFoodName: "Homemade lentil soup",
      quantity: 1,
      unit: "bowl",
      calories: -50,
    });
    expect(result.success).toBe(false);
  });
});
