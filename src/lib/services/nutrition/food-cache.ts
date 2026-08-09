import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getNutritionProvider } from "./provider";
import type { NutrientAmount } from "./types";
import type { Database } from "@/types/database";

export type CachedFood = Database["public"]["Tables"]["foods"]["Row"];
export type CachedNutrient = Database["public"]["Tables"]["nutrition_data"]["Row"];

export type CachedFoodWithNutrients = CachedFood & { nutrients: CachedNutrient[] };

/** Converts cached DB nutrient rows into the shape the calculation engine expects. */
export function toNutrientAmounts(rows: CachedNutrient[]): NutrientAmount[] {
  return rows.map((r) => ({
    nutrientId: r.nutrient_id ?? undefined,
    name: r.nutrient_name,
    unit: r.unit_name,
    amountPer100g: r.amount_per_100g,
  }));
}

/**
 * Returns a food + its nutrient data from our shared cache, fetching and
 * persisting it from the nutrition provider on first use. `externalId` is
 * the provider-specific id (USDA's fdcId today).
 */
export async function getOrCacheFood(externalId: string): Promise<CachedFoodWithNutrients | null> {
  const supabase = await createClient();
  const fdcId = Number(externalId);

  const existing = await supabase.from("foods").select("*").eq("fdc_id", fdcId).maybeSingle();
  if (existing.data) {
    const nutrients = await supabase.from("nutrition_data").select("*").eq("food_id", existing.data.id);
    return { ...existing.data, nutrients: nutrients.data ?? [] };
  }

  const provider = getNutritionProvider();
  const details = await provider.getFoodDetails(externalId);
  if (!details) return null;

  const insertedFood = await supabase
    .from("foods")
    .insert({
      fdc_id: fdcId,
      description: details.description,
      data_type: details.dataType ?? null,
      brand_owner: details.brandOwner ?? null,
      serving_size: details.servingSize ?? null,
      serving_size_unit: details.servingSizeUnit ?? null,
      household_serving_text: details.householdServingText ?? null,
    })
    .select("*")
    .single();

  if (insertedFood.error || !insertedFood.data) {
    throw new Error("Failed to cache food");
  }

  const food = insertedFood.data;

  if (details.nutrients.length > 0) {
    const nutrientRows = details.nutrients.map((n) => ({
      food_id: food.id,
      nutrient_id: n.nutrientId ?? null,
      nutrient_name: n.name,
      unit_name: n.unit,
      amount_per_100g: n.amountPer100g,
    }));
    const insertedNutrients = await supabase.from("nutrition_data").insert(nutrientRows as never).select("*");
    return { ...food, nutrients: insertedNutrients.data ?? [] };
  }

  return { ...food, nutrients: [] };
}
