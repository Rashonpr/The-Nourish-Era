import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type GroceryListRow = Database["public"]["Tables"]["grocery_lists"]["Row"];
export type GroceryListItemRow = Database["public"]["Tables"]["grocery_list_items"]["Row"];

export type GroceryListDetail = {
  list: GroceryListRow;
  items: GroceryListItemRow[];
};

export async function getGroceryList(planId: string): Promise<GroceryListDetail | null> {
  const supabase = await createClient();

  const { data: list } = await supabase.from("grocery_lists").select("*").eq("meal_plan_id", planId).maybeSingle();
  if (!list) return null;

  const { data: items } = await supabase
    .from("grocery_list_items")
    .select("*")
    .eq("grocery_list_id", list.id)
    .order("category")
    .order("position");

  return { list, items: items ?? [] };
}
