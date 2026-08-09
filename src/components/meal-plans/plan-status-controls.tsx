"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Eye, Archive, ArchiveRestore, FileEdit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setMealPlanStatusAction } from "@/lib/actions/meal-plans";
import { STATUS_TRANSITIONS } from "@/lib/services/meal-plan-status";
import type { MealPlanStatus } from "@/types/database";

const TRANSITION_META: Record<string, { label: string; icon: typeof CheckCircle2; variant?: "outline" }> = {
  "draft>in_review": { label: "Mark In Review", icon: Eye, variant: "outline" },
  "ai_draft>in_review": { label: "Mark In Review", icon: Eye, variant: "outline" },
  "ai_draft>draft": { label: "Convert to Manual Draft", icon: FileEdit, variant: "outline" },
  "in_review>approved": { label: "Approve Plan", icon: CheckCircle2 },
  "in_review>draft": { label: "Back to Draft", icon: FileEdit, variant: "outline" },
  "approved>in_review": { label: "Reopen for Review", icon: Eye, variant: "outline" },
  "archived>draft": { label: "Restore to Draft", icon: ArchiveRestore, variant: "outline" },
};

export function PlanStatusControls({ planId, status }: { planId: string; status: MealPlanStatus }) {
  const [isPending, startTransition] = useTransition();
  const transitions = STATUS_TRANSITIONS[status] ?? [];

  function handleTransition(next: MealPlanStatus) {
    startTransition(async () => {
      const result = await setMealPlanStatusAction(planId, status, next);
      if (result.error) toast.error(result.error);
      else toast.success("Plan status updated");
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {transitions
        .filter((t) => t !== "archived")
        .map((next) => {
          const meta = TRANSITION_META[`${status}>${next}`];
          if (!meta) return null;
          const Icon = meta.icon;
          return (
            <Button
              key={next}
              variant={meta.variant}
              size="sm"
              onClick={() => handleTransition(next)}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="animate-spin" /> : <Icon />}
              {meta.label}
            </Button>
          );
        })}
      {transitions.includes("archived") && (
        <Button variant="ghost" size="sm" onClick={() => handleTransition("archived")} disabled={isPending}>
          <Archive />
          Archive
        </Button>
      )}
    </div>
  );
}
