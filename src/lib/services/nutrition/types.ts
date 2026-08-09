/**
 * Provider-agnostic nutrition data types. `NutritionProvider` is the
 * abstraction every food-data source (USDA today, others later) must
 * implement, so the rest of the app never talks to a specific API.
 */

export type FoodSearchResult = {
  /** Provider-specific identifier (e.g. USDA's fdcId), as a string. */
  externalId: string;
  description: string;
  dataType?: string;
  brandOwner?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingText?: string;
};

export type NutrientAmount = {
  nutrientId?: number;
  name: string;
  unit: string;
  /** Amount per 100g of the food, as reported by the provider. */
  amountPer100g: number;
};

export type FoodDetails = FoodSearchResult & {
  nutrients: NutrientAmount[];
};

export interface NutritionProvider {
  readonly name: string;
  searchFoods(query: string, limit?: number): Promise<FoodSearchResult[]>;
  getFoodDetails(externalId: string): Promise<FoodDetails | null>;
}

/** Canonical nutrient keys the calculation engine relies on. */
export const CORE_NUTRIENTS = {
  ENERGY: "Energy",
  PROTEIN: "Protein",
  FAT: "Total lipid (fat)",
  CARBS: "Carbohydrate, by difference",
  FIBER: "Fiber, total dietary",
  SODIUM: "Sodium, Na",
  SUGARS: "Sugars, total including NLEA",
  SATURATED_FAT: "Fatty acids, total saturated",
} as const;
