import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MealPlanStatus } from "@/types/database";

const STATUS_CONFIG: Record<MealPlanStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  ai_draft: { label: "AI Draft", className: "bg-accent text-accent-foreground" },
  in_review: { label: "In Review", className: "bg-warning/20 text-warning-foreground" },
  approved: { label: "Approved", className: "bg-success/15 text-success" },
  archived: { label: "Archived", className: "bg-muted text-muted-foreground" },
};

export function PlanStatusBadge({ status, className }: { status: MealPlanStatus; className?: string }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge className={cn(config.className, className)}>
      {status === "ai_draft" && <Sparkles />}
      {config.label}
    </Badge>
  );
}
