import Link from "next/link";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanStatusBadge } from "@/components/meal-plans/plan-status-badge";
import { PlanStatusControls } from "@/components/meal-plans/plan-status-controls";
import { PlanRenameDialog } from "@/components/meal-plans/plan-rename-dialog";
import { SaveAsTemplateDialog } from "@/components/meal-plans/save-as-template-dialog";
import { ExportPdfDialog } from "@/components/meal-plans/export-pdf-dialog";
import type { MealPlanRow } from "@/lib/data/meal-plans";

export function PlanHeader({ plan, patient }: { plan: MealPlanRow; patient: { id: string; first_name: string; last_name: string } }) {
  return (
    <div className="space-y-4">
      <Link href="/meal-plans" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Meal Plans
      </Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-semibold text-foreground">{plan.name}</h1>
            <PlanRenameDialog planId={plan.id} currentName={plan.name} />
            <PlanStatusBadge status={plan.status} />
          </div>
          <Link href={`/patients/${patient.id}`} className="text-sm text-muted-foreground hover:text-primary">
            {patient.first_name} {patient.last_name}
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="outline" size="sm" render={<Link href={`/meal-plans/${plan.id}/grocery-list`} />}>
            <ShoppingCart />
            Grocery List
          </Button>
          <SaveAsTemplateDialog planId={plan.id} defaultName={plan.name} />
          <ExportPdfDialog planId={plan.id} planName={plan.name} isApproved={plan.status === "approved"} />
          <PlanStatusControls planId={plan.id} status={plan.status} />
        </div>
      </div>
    </div>
  );
}
