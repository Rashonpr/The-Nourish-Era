import "server-only";
import { UsdaFoodDataCentralProvider } from "./providers/usda-provider";
import type { NutritionProvider } from "./types";

let cachedProvider: NutritionProvider | null = null;

/**
 * Returns the active nutrition data provider. Swapping food databases
 * later means adding a new class that implements `NutritionProvider` and
 * changing what's constructed here — nothing else in the app changes.
 */
export function getNutritionProvider(): NutritionProvider {
  if (!cachedProvider) {
    cachedProvider = new UsdaFoodDataCentralProvider(process.env.USDA_FDC_API_KEY ?? "");
  }
  return cachedProvider;
}
