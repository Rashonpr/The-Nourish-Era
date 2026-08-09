"use client";

import { useMemo, useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MealCard } from "@/components/meal-plans/meal-card";
import { MealFormDialog } from "@/components/meal-plans/meal-form-dialog";
import { GenerateWithAiDialog } from "@/components/meal-plans/generate-with-ai-dialog";
import { TargetComparisonTable } from "@/components/meal-plans/nutrition-summary";
import { EmptyState } from "@/components/shared/empty-state";
import { UtensilsCrossed } from "lucide-react";
import {
  sumNutrientTotals,
  averageNutrientTotals,
  compareToTarget,
  type NutritionTargetLike,
} from "@/lib/services/nutrition/calculate";
import type { DayWithMeals } from "@/lib/data/meal-plans";

export function PlanEditor({
  planId,
  days,
  target,
  budgetPreference,
  prepTime,
}: {
  planId: string;
  days: DayWithMeals[];
  target: NutritionTargetLike | null;
  budgetPreference?: "low" | "moderate" | "high";
  prepTime?: number;
}) {
  const [activeDayId, setActiveDayId] = useState(days[0]?.id ?? "");
  const activeDay = days.find((d) => d.id === activeDayId) ?? days[0];

  const dayTotals = useMemo(
    () =>
      days.map((day) =>
        sumNutrientTotals(
          day.meals.flatMap((meal) =>
            meal.meal_items.map((item) => ({
              calories: item.calories ?? 0,
              proteinG: item.protein_g ?? 0,
              carbsG: item.carbs_g ?? 0,
              fatG: item.fat_g ?? 0,
              fiberG: item.fiber_g ?? 0,
              sodiumMg: item.sodium_mg ?? 0,
            })),
          ),
        ),
      ),
    [days],
  );

  const planAverage = useMemo(() => averageNutrientTotals(dayTotals), [dayTotals]);
  const activeDayIndex = days.findIndex((d) => d.id === activeDay?.id);
  const activeDayTotals = dayTotals[activeDayIndex] ?? sumNutrientTotals([]);
  const isPlanEmpty = days.every((d) => d.meals.length === 0);

  if (!activeDay) {
    return (
      <EmptyState icon={UtensilsCrossed} title="This plan has no days" description="Something went wrong setting up this plan." />
    );
  }

  return (
    <div className="space-y-6">
      {isPlanEmpty && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col items-start gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 font-heading text-base font-semibold text-foreground">
                <Sparkles className="size-4.5 text-primary" />
                Start with an AI draft
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Claude proposes meals and portions; every nutrition value is calculated from USDA data. You
                review and approve before anything reaches the patient.
              </p>
            </div>
            <GenerateWithAiDialog
              planId={planId}
              defaultBudget={budgetPreference}
              defaultPrepTime={prepTime}
              trigger={
                <Button className="shrink-0">
                  <Sparkles />
                  Generate with AI
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Plan average vs. targets</CardTitle>
        </CardHeader>
        <CardContent>
          <TargetComparisonTable comparison={compareToTarget(planAverage, target ?? {})} />
        </CardContent>
      </Card>

      <Tabs value={activeDay.id} onValueChange={(v) => v && setActiveDayId(v)}>
        <TabsList>
          {days.map((day) => (
            <TabsTrigger key={day.id} value={day.id}>
              Day {day.day_number}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Day {activeDay.day_number} totals vs. targets</CardTitle>
        </CardHeader>
        <CardContent>
          <TargetComparisonTable comparison={compareToTarget(activeDayTotals, target ?? {})} />
        </CardContent>
      </Card>

      <div className="space-y-4">
        {activeDay.meals.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title="No meals yet"
            description="Add breakfast, lunch, dinner, or a snack to get started."
            action={
              <MealFormDialog
                mode="add"
                mealPlanDayId={activeDay.id}
                trigger={
                  <Button size="sm">
                    <Plus />
                    Add meal
                  </Button>
                }
              />
            }
          />
        ) : (
          <>
            {activeDay.meals.map((meal, idx) => (
              <MealCard
                key={meal.id}
                meal={meal}
                canMoveUp={idx > 0}
                canMoveDown={idx < activeDay.meals.length - 1}
              />
            ))}
            <MealFormDialog
              mode="add"
              mealPlanDayId={activeDay.id}
              trigger={
                <Button variant="outline">
                  <Plus />
                  Add meal
                </Button>
              }
            />
          </>
        )}
      </div>
    </div>
  );
}
