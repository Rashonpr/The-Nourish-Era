"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Copy, Trash2, ChevronUp, ChevronDown, ChefHat, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MealItemRow } from "@/components/meal-plans/meal-item-row";
import { NutritionTotalsInline } from "@/components/meal-plans/nutrition-summary";
import { MealFormDialog } from "@/components/meal-plans/meal-form-dialog";
import { AddIngredientDialog } from "@/components/meal-plans/add-ingredient-dialog";
import { MealAlternativeDialog } from "@/components/meal-plans/meal-alternative-dialog";
import { deleteMealAction, duplicateMealAction, moveMealAction } from "@/lib/actions/meals";
import { sumNutrientTotals } from "@/lib/services/nutrition/calculate";
import type { MealWithItems } from "@/lib/data/meal-plans";

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
  other: "Other",
};

export function MealCard({
  meal,
  canMoveUp,
  canMoveDown,
}: {
  meal: MealWithItems;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const totals = sumNutrientTotals(
    meal.meal_items.map((item) => ({
      calories: item.calories ?? 0,
      proteinG: item.protein_g ?? 0,
      carbsG: item.carbs_g ?? 0,
      fatG: item.fat_g ?? 0,
      fiberG: item.fiber_g ?? 0,
      sodiumMg: item.sodium_mg ?? 0,
    })),
  );

  function handleMove(direction: "up" | "down") {
    startTransition(async () => {
      const result = await moveMealAction(meal.id, direction);
      if (result?.error) toast.error(result.error);
    });
  }

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicateMealAction(meal.id);
      if (result?.error) toast.error(result.error);
      else toast.success("Meal duplicated");
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteMealAction(meal.id);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <Card className={isPending ? "opacity-60" : undefined}>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{MEAL_TYPE_LABELS[meal.meal_type] ?? meal.meal_type}</Badge>
            {meal.is_ai_generated && (
              <Badge className="gap-1 bg-accent text-accent-foreground">AI-suggested</Badge>
            )}
          </div>
          <h3 className="mt-1.5 font-heading text-base font-semibold text-foreground">{meal.name}</h3>
          {meal.servings !== 1 && <p className="text-xs text-muted-foreground">{meal.servings} servings</p>}
        </div>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon-sm" onClick={() => handleMove("up")} disabled={!canMoveUp || isPending} aria-label="Move up">
            <ChevronUp className="size-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => handleMove("down")} disabled={!canMoveDown || isPending} aria-label="Move down">
            <ChevronDown className="size-4" />
          </Button>
          <MealFormDialog
            mode="edit"
            mealId={meal.id}
            defaultValues={{
              mealType: meal.meal_type,
              name: meal.name,
              prepInstructions: meal.prep_instructions,
              servings: meal.servings,
            }}
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label="Edit meal">
                <Pencil className="size-4" />
              </Button>
            }
          />
          <Button variant="ghost" size="icon-sm" onClick={handleDuplicate} disabled={isPending} aria-label="Duplicate meal">
            <Copy className="size-4" />
          </Button>
          <MealAlternativeDialog
            mealId={meal.id}
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label="Ask AI for alternative">
                <Sparkles className="size-4" />
              </Button>
            }
          />
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Delete meal" />}>
              <Trash2 className="size-4" />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this meal?</AlertDialogTitle>
                <AlertDialogDescription>
                  &quot;{meal.name}&quot; and its ingredients will be removed from the plan. This can&apos;t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete meal</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent>
        {meal.prep_instructions && (
          <p className="mb-3 flex items-start gap-1.5 text-sm text-muted-foreground">
            <ChefHat className="mt-0.5 size-4 shrink-0" />
            {meal.prep_instructions}
          </p>
        )}

        {meal.meal_items.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">No ingredients yet.</p>
        ) : (
          <div>
            {meal.meal_items.map((item) => (
              <MealItemRow key={item.id} item={item} />
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <NutritionTotalsInline totals={totals} />
          <AddIngredientDialog
            mealId={meal.id}
            trigger={
              <Button variant="outline" size="sm">
                <Plus />
                Add ingredient
              </Button>
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
