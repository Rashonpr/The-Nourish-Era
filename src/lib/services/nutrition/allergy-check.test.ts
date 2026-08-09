import { describe, expect, it } from "vitest";
import { findAllergenMatches, containsAnyAllergen, partitionByAllergySafety } from "./allergy-check";

describe("findAllergenMatches", () => {
  it("matches a direct allergen name", () => {
    expect(findAllergenMatches("Roasted peanuts", ["Peanuts"])).toEqual(["Peanuts"]);
  });

  it("matches known synonyms for common allergens", () => {
    expect(findAllergenMatches("Cheddar cheese sauce", ["Milk"])).toEqual(["Milk"]);
    expect(findAllergenMatches("Grilled shrimp skewers", ["Shellfish"])).toEqual(["Shellfish"]);
    expect(findAllergenMatches("Whole wheat bread", ["Wheat"])).toEqual(["Wheat"]);
  });

  it("matches a custom (patient-specific) allergen as a literal substring", () => {
    expect(findAllergenMatches("Sesame-crusted tofu", ["sesame"])).toEqual(["sesame"]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(findAllergenMatches("Grilled chicken breast with rice", ["Peanuts", "Shellfish"])).toEqual([]);
  });

  it("is case-insensitive", () => {
    expect(findAllergenMatches("PEANUT BUTTER sandwich", ["peanuts"])).toEqual(["peanuts"]);
  });
});

describe("containsAnyAllergen", () => {
  it("returns true when at least one allergen matches", () => {
    expect(containsAnyAllergen("Almond-crusted salmon", ["Tree nuts", "Soy"])).toBe(true);
  });

  it("returns false when no allergen matches", () => {
    expect(containsAnyAllergen("Steamed broccoli", ["Tree nuts", "Soy"])).toBe(false);
  });
});

describe("partitionByAllergySafety", () => {
  it("separates ingredients that violate an allergy from safe ones", () => {
    const ingredients = [
      { description: "Grilled chicken breast" },
      { description: "Peanut satay sauce" },
      { description: "Steamed rice" },
      { description: "Shrimp scampi" },
    ];

    const { safe, flagged } = partitionByAllergySafety(ingredients, ["Peanuts", "Shellfish"]);

    expect(safe).toEqual([{ description: "Grilled chicken breast" }, { description: "Steamed rice" }]);
    expect(flagged).toHaveLength(2);
    expect(flagged[0].matchedAllergens).toEqual(["Peanuts"]);
    expect(flagged[1].matchedAllergens).toEqual(["Shellfish"]);
  });

  it("treats every ingredient as safe when the patient has no allergies", () => {
    const ingredients = [{ description: "Peanut butter" }];
    const { safe, flagged } = partitionByAllergySafety(ingredients, []);
    expect(safe).toHaveLength(1);
    expect(flagged).toHaveLength(0);
  });
});
