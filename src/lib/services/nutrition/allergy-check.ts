/**
 * Keyword-based allergen screening. This is a safety net, not a medical
 * device: it flags likely matches in a food description so a practitioner
 * can double-check before approving a plan — it does not replace their
 * judgment. Custom (patient-specific) allergens are matched as literal
 * substrings; the eight common allergens get a short synonym list so
 * "cheese" still flags a milk allergy, etc.
 */

const COMMON_ALLERGEN_SYNONYMS: Record<string, string[]> = {
  peanuts: ["peanut", "peanuts", "groundnut", "groundnuts"],
  "tree nuts": [
    "almond",
    "walnut",
    "cashew",
    "pecan",
    "pistachio",
    "hazelnut",
    "macadamia",
    "brazil nut",
    "pine nut",
  ],
  shellfish: ["shrimp", "prawn", "crab", "lobster", "crawfish", "crayfish", "scallop", "clam", "mussel", "oyster"],
  fish: ["salmon", "tuna", "cod", "tilapia", "halibut", "trout", "anchovy", "sardine", "haddock", "fish"],
  milk: ["milk", "dairy", "cheese", "yogurt", "yoghurt", "butter", "cream", "whey", "casein"],
  eggs: ["egg", "eggs", "mayonnaise", "meringue"],
  soy: ["soy", "soya", "soybean", "tofu", "edamame", "tempeh"],
  wheat: ["wheat", "flour", "bread", "pasta", "couscous", "seitan"],
};

function keywordsFor(allergen: string): string[] {
  const normalized = allergen.trim().toLowerCase();
  return COMMON_ALLERGEN_SYNONYMS[normalized] ?? [normalized];
}

/**
 * Returns the allergen(s) from `allergens` that appear to match
 * `foodDescription`, or an empty array if none match.
 */
export function findAllergenMatches(foodDescription: string, allergens: string[]): string[] {
  const description = foodDescription.toLowerCase();
  return allergens.filter((allergen) => keywordsFor(allergen).some((keyword) => description.includes(keyword)));
}

export function containsAnyAllergen(foodDescription: string, allergens: string[]): boolean {
  return findAllergenMatches(foodDescription, allergens).length > 0;
}

export type IngredientLike = { description: string };

/** Splits ingredients into those safe to use and those that violate an allergy. */
export function partitionByAllergySafety<T extends IngredientLike>(
  ingredients: T[],
  allergens: string[],
): { safe: T[]; flagged: { ingredient: T; matchedAllergens: string[] }[] } {
  const safe: T[] = [];
  const flagged: { ingredient: T; matchedAllergens: string[] }[] = [];

  for (const ingredient of ingredients) {
    const matches = findAllergenMatches(ingredient.description, allergens);
    if (matches.length > 0) {
      flagged.push({ ingredient, matchedAllergens: matches });
    } else {
      safe.push(ingredient);
    }
  }

  return { safe, flagged };
}
