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
import { previewMealAlternativesAction, applyMealAlternativeAction } from "@/lib/actions/substitution";
import type { MealAlternativePreview } from "@/lib/services/substitution";

export function MealAlternativeDialog({ mealId, trigger }: { mealId: string; trigger: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<SubstitutionReason>("custom");
  const [customInstruction, setCustomInstruction] = useState("");
  const [alternatives, setAlternatives] = useState<MealAlternativePreview[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [applyingIndex, setApplyingIndex] = useState<number | null>(null);
  const router = useRouter();

  function reset() {
    setAlternatives(null);
    setError(null);
    setReason("custom");
    setCustomInstruction("");
  }

  function handleFind() {
    setError(null);
    startTransition(async () => {
      const result = await previewMealAlternativesAction(mealId, { reason, customInstruction });
      if (result.error) setError(result.error);
      else setAlternatives(result.alternatives ?? []);
    });
  }

  function handleApply(index: number, alt: MealAlternativePreview) {
    setApplyingIndex(index);
    setError(null);
    startTransition(async () => {
      const result = await applyMealAlternativeAction(mealId, {
        name: alt.name,
        prepInstructions: alt.prepInstructions,
        servings: alt.servings,
        ingredients: alt.ingredients,
      });
      setApplyingIndex(null);
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        toast.success("Meal replaced");
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
          <DialogTitle>Ask AI for a meal alternative</DialogTitle>
          <DialogDescription>
            Claude proposes 3 whole-meal alternatives; nutrition totals are calculated from USDA data.
          </DialogDescription>
        </DialogHeader>

        {!alternatives && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Select value={reason} onValueChange={(v) => v && setReason(v as SubstitutionReason)} items={SUBSTITUTION_REASONS}>
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
            <div className="space-y-1.5">
              <Label>Instruction {reason !== "custom" && "(optional)"}</Label>
              <Textarea
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
                placeholder="e.g. Keep it vegetarian and under 15 minutes to prepare"
                rows={2}
              />
            </div>
            {error && <ErrorState description={error} onRetry={handleFind} />}
            <Button onClick={handleFind} disabled={isPending} className="w-full">
              {isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
              Find alternatives
            </Button>
          </div>
        )}

        {alternatives && (
          <div className="space-y-3">
            {alternatives.length === 0 && <p className="text-sm text-muted-foreground">No alternatives were returned.</p>}
            {alternatives.map((alt, idx) => (
              <Card key={idx}>
                <CardHeader className="pb-2">
                  <p className="text-sm font-medium text-foreground">{alt.name}</p>
                  <p className="text-xs text-muted-foreground">{alt.rationale}</p>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <ul className="text-xs text-muted-foreground">
                    {alt.ingredients.map((ing) => (
                      <li key={ing.description}>
                        {ing.description} — {ing.quantity} {ing.unit}
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{alt.totals.calories} kcal</span>
                    <span>{alt.totals.proteinG}g protein</span>
                    <span>{alt.totals.carbsG}g carbs</span>
                    <span>{alt.totals.fatG}g fat</span>
                  </div>
                  {alt.flaggedIngredients.length > 0 && (
                    <p className="flex items-center gap-1.5 text-xs text-warning-foreground">
                      <AlertTriangle className="size-3.5" />
                      {alt.flaggedIngredients.length} ingredient(s) flagged and will be excluded:{" "}
                      {alt.flaggedIngredients.join(", ")}
                    </p>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    disabled={isPending}
                    onClick={() => handleApply(idx, alt)}
                  >
                    {isPending && applyingIndex === idx ? <Loader2 className="animate-spin" /> : null}
                    Use this meal
                  </Button>
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
