import { describe, expect, it } from "vitest";
import { categorizeGroceryItem, aggregateGroceryItems } from "./grocery-list";

describe("categorizeGroceryItem", () => {
  it("categorizes common foods correctly", () => {
    expect(categorizeGroceryItem("Boneless skinless chicken breast")).toBe("meat_seafood");
    expect(categorizeGroceryItem("Raw baby spinach")).toBe("produce");
    expect(categorizeGroceryItem("Cheddar cheese")).toBe("dairy");
    expect(categorizeGroceryItem("Cooked brown rice")).toBe("grains");
    expect(categorizeGroceryItem("Ground cumin")).toBe("spices_seasonings");
    expect(categorizeGroceryItem("Olive oil")).toBe("pantry");
    expect(categorizeGroceryItem("Frozen mixed vegetables")).toBe("frozen");
  });

  it("falls back to other for unrecognized foods", () => {
    expect(categorizeGroceryItem("Xyzzyplorp")).toBe("other");
  });
});

describe("aggregateGroceryItems", () => {
  it("combines duplicate ingredients with the same unit", () => {
    const result = aggregateGroceryItems([
      { description: "Chicken breast", quantity: 200, unit: "g" },
      { description: "Chicken breast", quantity: 150, unit: "g" },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(350);
  });

  it("keeps differing units as separate line items", () => {
    const result = aggregateGroceryItems([
      { description: "Chicken breast", quantity: 200, unit: "g" },
      { description: "Chicken breast", quantity: 2, unit: "each" },
    ]);
    expect(result).toHaveLength(2);
  });

  it("is case-insensitive when matching ingredient names", () => {
    const result = aggregateGroceryItems([
      { description: "Chicken Breast", quantity: 100, unit: "g" },
      { description: "chicken breast", quantity: 100, unit: "g" },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(200);
  });

  it("assigns a category to each aggregated item", () => {
    const result = aggregateGroceryItems([{ description: "Cheddar cheese", quantity: 100, unit: "g" }]);
    expect(result[0].category).toBe("dairy");
  });
});
