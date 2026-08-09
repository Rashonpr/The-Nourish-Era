import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function AllergyBadges({
  allergens,
  overflowCount = 0,
  size = "default",
  className,
}: {
  allergens: string[];
  overflowCount?: number;
  size?: "default" | "sm";
  className?: string;
}) {
  if (allergens.length === 0) {
    return <span className={cn("text-sm text-muted-foreground", className)}>None recorded</span>;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {allergens.map((allergen) => (
        <Badge
          key={allergen}
          className={cn(
            "gap-1 bg-destructive/10 text-destructive",
            size === "sm" ? "h-5" : "h-6 px-2.5 text-[0.8rem]",
          )}
        >
          <AlertTriangle className={size === "sm" ? "size-3" : "size-3.5"} />
          {allergen}
        </Badge>
      ))}
      {overflowCount > 0 && (
        <Badge variant="secondary" className={size === "sm" ? "h-5" : "h-6 px-2.5 text-[0.8rem]"}>
          +{overflowCount} more
        </Badge>
      )}
    </div>
  );
}
