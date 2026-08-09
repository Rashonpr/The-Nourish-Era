import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { PlanStatusBadge } from "@/components/meal-plans/plan-status-badge";
import { getCurrentPractitioner } from "@/lib/data/practitioner";
import { listMealPlans } from "@/lib/data/meal-plans";
import { formatDistanceToNow } from "date-fns";

export const metadata: Metadata = { title: "Meal Plans" };

export default async function MealPlansPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string }>;
}) {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner) redirect("/login");

  const { patientId } = await searchParams;
  const plans = await listMealPlans(practitioner.id, { patientId });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Meal Plans</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create, review, and export personalized meal plans.</p>
        </div>
        <Button nativeButton={false} render={<Link href={patientId ? `/meal-plans/new?patientId=${patientId}` : "/meal-plans/new"} />}>
          <Plus />
          Create Meal Plan
        </Button>
      </div>

      {plans.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No meal plans yet"
          description="Create a plan once you've added a patient and set their nutrition targets."
          action={
            <Button nativeButton={false} render={<Link href="/meal-plans/new" />}>
              <Plus />
              Create Meal Plan
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {plans.map((plan) => (
            <li key={plan.id}>
              <Link href={`/meal-plans/${plan.id}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/50">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{plan.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {plan.patientName} · {formatDistanceToNow(new Date(plan.updated_at), { addSuffix: true })}
                  </p>
                </div>
                <PlanStatusBadge status={plan.status} className="shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
