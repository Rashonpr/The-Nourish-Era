import type { FoodDetails, FoodSearchResult, NutrientAmount, NutritionProvider } from "../types";

const BASE_URL = "https://api.nal.usda.gov/fdc/v1";

// USDA search/detail responses use two slightly different nutrient shapes
// depending on data type — normalize both defensively.
type RawSearchNutrient = { nutrientId?: number; nutrientName?: string; unitName?: string; value?: number };
type RawDetailNutrient = {
  nutrient?: { id?: number; name?: string; unitName?: string };
  amount?: number;
};
type RawFoodNutrient = RawSearchNutrient & RawDetailNutrient;

type RawFood = {
  fdcId: number;
  description: string;
  dataType?: string;
  brandOwner?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  foodNutrients?: RawFoodNutrient[];
};

function normalizeNutrients(raw: RawFoodNutrient[] | undefined): NutrientAmount[] {
  if (!raw) return [];
  return raw
    .map((n) => {
      const name = n.nutrient?.name ?? n.nutrientName;
      const unit = n.nutrient?.unitName ?? n.unitName;
      const amount = n.amount ?? n.value;
      const nutrientId = n.nutrient?.id ?? n.nutrientId;
      if (!name || !unit || amount === undefined || amount === null) return null;
      return { nutrientId, name, unit, amountPer100g: amount } as NutrientAmount;
    })
    .filter((n): n is NutrientAmount => n !== null);
}

function toSearchResult(food: RawFood): FoodSearchResult {
  return {
    externalId: String(food.fdcId),
    description: food.description,
    dataType: food.dataType,
    brandOwner: food.brandOwner,
    servingSize: food.servingSize,
    servingSizeUnit: food.servingSizeUnit,
    householdServingText: food.householdServingFullText,
  };
}

export class UsdaFoodDataCentralProvider implements NutritionProvider {
  readonly name = "usda_fdc";

  constructor(private readonly apiKey: string) {}

  async searchFoods(query: string, limit = 25): Promise<FoodSearchResult[]> {
    if (!this.apiKey) throw new Error("USDA_FDC_API_KEY is not configured");

    const url = new URL(`${BASE_URL}/foods/search`);
    url.searchParams.set("api_key", this.apiKey);
    url.searchParams.set("query", query);
    url.searchParams.set("pageSize", String(limit));
    url.searchParams.set("dataType", "Foundation,SR Legacy,Survey (FNDDS),Branded");

    const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 } });
    if (!res.ok) {
      throw new Error(`USDA search failed (${res.status})`);
    }
    const data = (await res.json()) as { foods?: RawFood[] };
    return (data.foods ?? []).map(toSearchResult);
  }

  async getFoodDetails(externalId: string): Promise<FoodDetails | null> {
    if (!this.apiKey) throw new Error("USDA_FDC_API_KEY is not configured");

    const url = new URL(`${BASE_URL}/food/${encodeURIComponent(externalId)}`);
    url.searchParams.set("api_key", this.apiKey);

    const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 * 7 } });
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`USDA food lookup failed (${res.status})`);
    }
    const food = (await res.json()) as RawFood;

    return {
      ...toSearchResult(food),
      nutrients: normalizeNutrients(food.foodNutrients),
    };
  }
}
