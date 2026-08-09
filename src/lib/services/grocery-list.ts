import type { GroceryCategory } from "@/types/database";

const CATEGORY_KEYWORDS: Record<Exclude<GroceryCategory, "other">, string[]> = {
  produce: [
    "apple", "banana", "berry", "berries", "orange", "grape", "lemon", "lime", "melon", "peach", "pear",
    "spinach", "lettuce", "kale", "broccoli", "carrot", "onion", "garlic", "pepper", "tomato", "cucumber",
    "potato", "squash", "zucchini", "avocado", "mushroom", "celery", "cabbage", "corn", "herb", "cilantro",
    "parsley", "basil", "fruit", "vegetable", "greens",
  ],
  meat_seafood: [
    "chicken", "beef", "pork", "turkey", "lamb", "bacon", "sausage", "ham", "steak", "ground meat",
    "salmon", "tuna", "shrimp", "cod", "tilapia", "fish", "shellfish", "crab", "lobster", "scallop",
  ],
  dairy: ["milk", "cheese", "yogurt", "yoghurt", "butter", "cream", "egg", "cottage cheese"],
  grains: [
    "rice", "bread", "pasta", "oats", "oatmeal", "quinoa", "cereal", "tortilla", "bagel", "cracker",
    "flour", "noodle", "couscous", "barley",
  ],
  frozen: ["frozen"],
  spices_seasonings: [
    "salt", "pepper", "spice", "seasoning", "cinnamon", "cumin", "paprika", "oregano", "chili powder",
    "vanilla", "extract",
  ],
  pantry: [
    "oil", "vinegar", "sauce", "broth", "stock", "sugar", "honey", "syrup", "nut", "peanut", "almond",
    "bean", "lentil", "chickpea", "canned", "can of", "jam", "peanut butter", "seed",
  ],
};

// Checked in this order — "frozen" must win over e.g. "vegetable" (produce)
// for "frozen mixed vegetables", since storage location is what matters here.
const CATEGORY_PRIORITY: Exclude<GroceryCategory, "other">[] = [
  "frozen",
  "meat_seafood",
  "dairy",
  "spices_seasonings",
  "grains",
  "produce",
  "pantry",
];

/** Categorizes a grocery item by keyword match against its description. */
export function categorizeGroceryItem(description: string): GroceryCategory {
  const normalized = description.toLowerCase();
  for (const category of CATEGORY_PRIORITY) {
    if (CATEGORY_KEYWORDS[category].some((keyword) => normalized.includes(keyword))) {
      return category;
    }
  }
  return "other";
}

export type GroceryIngredient = { description: string; quantity: number; unit: string };
export type AggregatedGroceryItem = { category: GroceryCategory; name: string; quantity: number; unit: string };

/**
 * Aggregates ingredients across an entire meal plan into a grocery list.
 * Items are combined when their description and unit match exactly;
 * differing units for the same food are kept as separate lines (a simple,
 * honest default rather than guessing an unreliable unit conversion).
 */
export function aggregateGroceryItems(ingredients: GroceryIngredient[]): AggregatedGroceryItem[] {
  const grouped = new Map<string, AggregatedGroceryItem>();

  for (const ingredient of ingredients) {
    const name = ingredient.description.trim();
    const unit = ingredient.unit.trim();
    if (!name) continue;

    const key = `${name.toLowerCase()}::${unit.toLowerCase()}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.quantity = Math.round((existing.quantity + ingredient.quantity) * 100) / 100;
    } else {
      grouped.set(key, { category: categorizeGroceryItem(name), name, quantity: ingredient.quantity, unit });
    }
  }

  return Array.from(grouped.values()).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}
