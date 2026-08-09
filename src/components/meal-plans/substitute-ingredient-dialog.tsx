"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Sparkles, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ErrorState } from "@/components/shared/error-state";
import { SUBSTITUTION_REASONS, type SubstitutionReason } from "@/lib/validation/ai-substitution";
import {
  previewIngredientAlternativesAction,
  applyIngredientSubstitutionAction,
} from "@/lib/actions/substitution";
import type { IngredientAlternativePreview } from "@/lib/services/substitution";

function DeltaBadge({ label, value, unit }: { label: string; value: number; unit: string }) {
  if (value === 0) return null;
  return (
    <span className={value > 0 ? "text-success" : "text-destructive"}>
      {value > 0 ? "+" : ""}
      {value}
      {unit} {label}
    </span>
  );
}

export function SubstituteIngredientDialog({ mealItemId, trigger }: { mealItemId: string; trigger: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<SubstitutionReason>("dislikes");
  const [customInstruction, setCustomInstruction] = useState("");
  const [alternatives, setAlternatives] = useState<IngredientAlternativePreview[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [applyingIndex, setApplyingIndex] = useState<number | null>(null);
  const router = useRouter();

  function reset() {
    setAlternatives(null);
    setError(null);
    setReason("dislikes");
    setCustomInstruction("");
  }

  function handleFindAlternatives() {
    setError(null);
    startTransition(async () => {
      const result = await previewIngredientAlternativesAction(mealItemId, { reason, customInstruction });
      if (result.error) setError(result.error);
      else setAlternatives(result.alternatives ?? []);
    });
  }

  function handleApply(index: number, alt: IngredientAlternativePreview) {
    setApplyingIndex(index);
    setError(null);
    startTransition(async () => {
      const result = await applyIngredientSubstitutionAction(mealItemId, {
        description: alt.description,
        quantity: alt.quantity,
        unit: alt.unit,
      });
      setApplyingIndex(null);
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        toast.success("Ingredient replaced");
        setOpen(false);
        reset();
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Find an alternative</DialogTitle>
          <DialogDescription>
            Claude proposes 3 alternatives; nutrition for each is calculated from USDA data, not estimated.
          </DialogDescription>
        </DialogHeader>

        {!alternatives && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Select value={reason} onValueChange={(v) => v && setReason(v as SubstitutionReason)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBSTITUTION_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {reason === "custom" && (
              <div className="space-y-1.5">
                <Label>Instruction</Label>
                <Textarea
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  placeholder="e.g. Swap for something higher in fiber"
                  rows={2}
                />
              </div>
            )}
            {error && <ErrorState description={error} onRetry={handleFindAlternatives} />}
            <Button onClick={handleFindAlternatives} disabled={isPending} className="w-full">
              {isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
              Find alternatives
            </Button>
          </div>
        )}

        {alternatives && (
          <div className="space-y-3">
            {alternatives.length === 0 && <p className="text-sm text-muted-foreground">No alternatives were returned.</p>}
            {alternatives.map((alt, idx) => (
              <Card key={idx} className={alt.flaggedAllergen ? "border-destructive/40" : undefined}>
                <CardHeader className="pb-2">
                  <p className="text-sm font-medium text-foreground">
                    {alt.description} — {alt.quantity} {alt.unit}
                  </p>
                  <p className="text-xs text-muted-foreground">{alt.rationale}</p>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{alt.nutrition.calories} kcal</span>
                    <span>{alt.nutrition.proteinG}g protein</span>
                    <span>{alt.nutrition.carbsG}g carbs</span>
                    <span>{alt.nutrition.fatG}g fat</span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium">
                    <DeltaBadge label="kcal" value={alt.diff.calories} unit="" />
                    <DeltaBadge label="protein" value={alt.diff.proteinG} unit="g" />
                    <DeltaBadge label="carbs" value={alt.diff.carbsG} unit="g" />
                    <DeltaBadge label="fat" value={alt.diff.fatG} unit="g" />
                    <DeltaBadge label="sodium" value={alt.diff.sodiumMg} unit="mg" />
                  </div>
                  {alt.flaggedAllergen ? (
                    <p className="flex items-center gap-1.5 text-xs text-destructive">
                      <AlertTriangle className="size-3.5" />
                      Conflicts with a documented allergy — can&apos;t be applied.
                    </p>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      disabled={isPending}
                      onClick={() => handleApply(idx, alt)}
                    >
                      {isPending && applyingIndex === idx ? <Loader2 className="animate-spin" /> : null}
                      Use this
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
            {error && <ErrorState description={error} />}
            <Button variant="ghost" size="sm" onClick={reset} className="w-full">
              Start over
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
