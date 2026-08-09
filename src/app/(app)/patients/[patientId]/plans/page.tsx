import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { PlanStatusBadge } from "@/components/meal-plans/plan-status-badge";
import { createClient } from "@/lib/supabase/server";
import type { MealPlanStatus } from "@/types/database";

export const metadata: Metadata = { title: "Meal Plans" };

export default async function PatientPlansPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const supabase = await createClient();
  const { data: plans } = await supabase
    .from("meal_plans")
    .select("id, name, status, updated_at")
    .eq("patient_id", patientId)
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" nativeButton={false} render={<Link href={`/meal-plans/new?patientId=${patientId}`} />}>
          <Plus />
          Create Meal Plan
        </Button>
      </div>

      {!plans || plans.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No meal plans yet"
          description="Create a plan to get started — set targets first for the best results."
        />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {plans.map((plan) => (
            <li key={plan.id} className="flex items-center justify-between px-4 py-3">
              <Link href={`/meal-plans/${plan.id}`} className="text-sm font-medium text-foreground hover:text-primary">
                {plan.name}
              </Link>
              <PlanStatusBadge status={plan.status as MealPlanStatus} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
