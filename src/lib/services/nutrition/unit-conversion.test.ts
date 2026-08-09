import { describe, expect, it } from "vitest";
import { convertQuantityToGrams } from "./unit-conversion";

describe("convertQuantityToGrams", () => {
  it("passes grams through unchanged", () => {
    expect(convertQuantityToGrams(150, "g")).toBe(150);
  });

  it("converts kilograms", () => {
    expect(convertQuantityToGrams(1.5, "kg")).toBe(1500);
  });

  it("converts ounces", () => {
    expect(convertQuantityToGrams(4, "oz")).toBeCloseTo(113.398, 2);
  });

  it("converts pounds", () => {
    expect(convertQuantityToGrams(1, "lb")).toBeCloseTo(453.592, 2);
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(convertQuantityToGrams(2, " OZ ")).toBeCloseTo(56.699, 2);
  });

  it("uses the food's serving size for serving-based units", () => {
    const grams = convertQuantityToGrams(2, "serving", { servingSize: 85, servingSizeUnit: "g" });
    expect(grams).toBe(170);
  });

  it("falls back to treating the quantity as grams when the unit is unknown and no serving size exists", () => {
    expect(convertQuantityToGrams(3, "cup")).toBe(3);
  });
});
