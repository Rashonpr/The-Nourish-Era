import { cn } from "@/lib/utils";
import type { NutrientTotals, TargetComparison } from "@/lib/services/nutrition/calculate";

const ROWS: { key: keyof NutrientTotals; label: string; unit: string }[] = [
  { key: "calories", label: "Calories", unit: "" },
  { key: "proteinG", label: "Protein", unit: "g" },
  { key: "carbsG", label: "Carbs", unit: "g" },
  { key: "fatG", label: "Fat", unit: "g" },
  { key: "fiberG", label: "Fiber", unit: "g" },
  { key: "sodiumMg", label: "Sodium", unit: "mg" },
];

/** Compact inline totals — used at the meal level. */
export function NutritionTotalsInline({ totals }: { totals: NutrientTotals }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span>{totals.calories} kcal</span>
      <span>{totals.proteinG}g protein</span>
      <span>{totals.carbsG}g carbs</span>
      <span>{totals.fatG}g fat</span>
      <span>{totals.fiberG}g fiber</span>
      <span>{totals.sodiumMg}mg sodium</span>
    </div>
  );
}

/** Full target-vs-actual comparison — used at day and plan level. */
export function TargetComparisonTable({ comparison, title }: { comparison: TargetComparison; title?: string }) {
  return (
    <div>
      {title && <p className="mb-2 text-sm font-medium text-foreground">{title}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {ROWS.map((row) => {
          const d = comparison[row.key];
          return (
            <div key={row.key} className="rounded-md bg-muted px-3 py-2">
              <p className="text-xs text-muted-foreground">{row.label}</p>
              <p className="font-medium text-foreground">
                {d.actual}
                {row.unit}
              </p>
              {d.target !== null && (
                <p className="text-xs text-muted-foreground">
                  Target: {d.target}
                  {row.unit}
                  {" · "}
                  <span
                    className={cn(
                      d.difference === 0
                        ? "text-muted-foreground"
                        : (d.difference ?? 0) > 0
                          ? "text-warning-foreground"
                          : "text-success",
                    )}
                  >
                    {d.difference !== null && d.difference > 0 ? "+" : ""}
                    {d.difference}
                    {row.unit}
                  </span>
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
