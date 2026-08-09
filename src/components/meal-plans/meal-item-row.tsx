"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, X, Sparkles, Repeat } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SubstituteIngredientDialog } from "@/components/meal-plans/substitute-ingredient-dialog";
import { updateMealItemQuantityAction, deleteMealItemAction } from "@/lib/actions/meal-items";
import type { MealItemWithFood } from "@/lib/data/meal-plans";

export function MealItemRow({ item }: { item: MealItemWithFood }) {
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [unit, setUnit] = useState(item.unit);
  const [isPending, startTransition] = useTransition();

  const displayName = item.foods?.description ?? item.custom_food_name ?? "Ingredient";

  function handleBlurSave() {
    if (Number(quantity) === item.quantity && unit === item.unit) return;
    if (!Number(quantity) || Number(quantity) <= 0) return;
    startTransition(async () => {
      const result = await updateMealItemQuantityAction({ mealItemId: item.id, quantity: Number(quantity), unit });
      if (result.error) toast.error(result.error);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteMealItemAction(item.id);
      if (result.error) toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border py-2 last:border-0">
      <div className="min-w-32 flex-1">
        <p className="text-sm text-foreground">{displayName}</p>
        <p className="text-xs text-muted-foreground">
          {item.calories ?? 0} kcal · {item.protein_g ?? 0}g P · {item.carbs_g ?? 0}g C · {item.fat_g ?? 0}g F
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          onBlur={handleBlurSave}
          className="h-8 w-20"
        />
        <Input
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          onBlur={handleBlurSave}
          className="h-8 w-20"
        />
      </div>
      {item.nutrition_source === "manual" && (
        <Tooltip>
          <TooltipTrigger render={<span className="text-xs text-muted-foreground">manual</span>} />
          <TooltipContent>Manually entered — not verified against the food database</TooltipContent>
        </Tooltip>
      )}
      {item.nutrition_source === "ai_unverified" && (
        <Tooltip>
          <TooltipTrigger render={<Sparkles className="size-3.5 text-accent-foreground" />} />
          <TooltipContent>AI-suggested — not yet matched to verified nutrition data</TooltipContent>
        </Tooltip>
      )}
      <SubstituteIngredientDialog
        mealItemId={item.id}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label="Find alternative">
            <Repeat className="size-4" />
          </Button>
        }
      />
      <Button variant="ghost" size="icon-sm" onClick={handleDelete} disabled={isPending} aria-label="Remove ingredient">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
      </Button>
    </div>
  );
}
