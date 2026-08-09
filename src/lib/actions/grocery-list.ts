"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { aggregateGroceryItems, type GroceryIngredient } from "@/lib/services/grocery-list";
import type { GroceryCategory } from "@/types/database";

export type GroceryActionResult = { error?: string };

export async function generateGroceryListAction(planId: string): Promise<GroceryActionResult> {
  const supabase = await createClient();

  const { data: meals } = await supabase
    .from("meal_plan_days")
    .select("meals(meal_items(quantity, unit, custom_food_name, foods(description)))")
    .eq("meal_plan_id", planId);

  if (!meals) return { error: "Couldn't load this plan's ingredients." };

  const ingredients: GroceryIngredient[] = [];
  for (const day of meals as unknown as {
    meals: { meal_items: { quantity: number; unit: string; custom_food_name: string | null; foods: { description: string } | null }[] }[];
  }[]) {
    for (const meal of day.meals) {
      for (const item of meal.meal_items) {
        ingredients.push({
          description: item.foods?.description ?? item.custom_food_name ?? "ingredient",
          quantity: item.quantity,
          unit: item.unit,
        });
      }
    }
  }

  if (ingredients.length === 0) {
    return { error: "This plan has no ingredients yet — add meals before generating a grocery list." };
  }

  let { data: list } = await supabase.from("grocery_lists").select("id").eq("meal_plan_id", planId).maybeSingle();

  if (!list) {
    const inserted = await supabase.from("grocery_lists").insert({ meal_plan_id: planId }).select("id").single();
    if (inserted.error || !inserted.data) return { error: "Couldn't create the grocery list." };
    list = inserted.data;
  } else {
    await supabase.from("grocery_lists").update({ generated_at: new Date().toISOString() }).eq("id", list.id);
    // Regenerating replaces auto-generated items but preserves manual additions.
    await supabase.from("grocery_list_items").delete().eq("grocery_list_id", list.id).eq("is_manual", false);
  }

  const aggregated = aggregateGroceryItems(ingredients);
  const rows = aggregated.map((item, index) => ({
    grocery_list_id: list!.id,
    category: item.category,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    is_manual: false,
    position: index,
  }));

  const insertRes = await supabase.from("grocery_list_items").insert(rows as never);
  if (insertRes.error) return { error: "Couldn't save the grocery list items." };

  revalidatePath(`/meal-plans/${planId}/grocery-list`);
  return {};
}

const manualItemSchema = z.object({
  category: z.enum(["produce", "meat_seafood", "dairy", "grains", "pantry", "frozen", "spices_seasonings", "other"]),
  name: z.string().trim().min(1).max(200),
  quantity: z.coerce.number().min(0).max(10000).optional(),
  unit: z.string().trim().max(30).optional(),
});

export async function addManualGroceryItemAction(
  groceryListId: string,
  input: { category: GroceryCategory; name: string; quantity?: number; unit?: string },
): Promise<GroceryActionResult> {
  const parsed = manualItemSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.from("grocery_list_items").insert({
    grocery_list_id: groceryListId,
    category: parsed.data.category,
    name: parsed.data.name,
    quantity: parsed.data.quantity ?? null,
    unit: parsed.data.unit ?? null,
    is_manual: true,
  } as never);

  if (error) return { error: "Couldn't add the item." };
  revalidatePath("/meal-plans", "layout");
  return {};
}

export async function toggleGroceryItemCheckedAction(itemId: string, checked: boolean): Promise<GroceryActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("grocery_list_items").update({ is_checked: checked }).eq("id", itemId);
  if (error) return { error: "Couldn't update the item." };
  return {};
}

export async function deleteGroceryItemAction(itemId: string): Promise<GroceryActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("grocery_list_items").delete().eq("id", itemId);
  if (error) return { error: "Couldn't remove the item." };
  revalidatePath("/meal-plans", "layout");
  return {};
}
