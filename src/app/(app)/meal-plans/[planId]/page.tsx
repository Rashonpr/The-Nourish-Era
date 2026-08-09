import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GitCompareArrows } from "lucide-react";
import { PlanHeader } from "@/components/meal-plans/plan-header";
import { AiDraftBanner } from "@/components/meal-plans/ai-draft-banner";
import { PlanEditor } from "@/components/meal-plans/plan-editor";
import { AiAdjustmentBox } from "@/components/meal-plans/ai-adjustment-box";
import { getMealPlanDetail } from "@/lib/data/meal-plans";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Meal Plan" };

export default async function MealPlanDetailPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const detail = await getMealPlanDetail(planId);
  if (!detail) notFound();

  const { plan, patient, activeTarget, days } = detail;
  const hasMeals = days.some((d) => d.meals.length > 0);

  const supabase = await createClient();
  const [{ data: lifestyle }, { data: originalPlan }] = await Promise.all([
    supabase
      .from("patient_lifestyle")
      .select("budget_level, prep_time_minutes")
      .eq("patient_id", plan.patient_id)
      .maybeSingle(),
    plan.duplicated_from
      ? supabase.from("meal_plans").select("id, name").eq("id", plan.duplicated_from).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <PlanHeader plan={plan} patient={patient} />
      {originalPlan && (
        <Link
          href={`/meal-plans/${originalPlan.id}`}
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <GitCompareArrows className="size-4" />
          AI-adjusted from &quot;{originalPlan.name}&quot; — view original
        </Link>
      )}
      {plan.status === "ai_draft" && <AiDraftBanner />}
      <PlanEditor
        planId={planId}
        days={days}
        budgetPreference={lifestyle?.budget_level ?? undefined}
        prepTime={lifestyle?.prep_time_minutes ?? undefined}
        target={
          activeTarget
            ? {
                calories: activeTarget.calories,
                proteinG: activeTarget.protein_g,
                carbsG: activeTarget.carbs_g,
                fatG: activeTarget.fat_g,
                fiberG: activeTarget.fiber_g,
                sodiumMg: activeTarget.sodium_mg,
              }
            : null
        }
      />
      {hasMeals && <AiAdjustmentBox planId={planId} />}
    </div>
  );
}
