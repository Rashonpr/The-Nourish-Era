"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/error-state";
import { requestAiAdjustmentAction } from "@/lib/actions/meal-plan-adjustment";

const EXAMPLES = [
  "Increase the plan to at least 180 grams of protein without exceeding 2,300 calories.",
  "Replace all seafood with chicken, turkey, or vegetarian alternatives.",
  "Make breakfast options easier to prepare.",
  "Reduce sodium while keeping calories similar.",
  "Create more meal variety.",
];

export function AiAdjustmentBox({ planId }: { planId: string }) {
  const [instruction, setInstruction] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await requestAiAdjustmentAction(planId, instruction);
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else if (result.newPlanId) {
        toast.success("Proposed changes are ready in a new draft — the original plan is unchanged.");
        router.push(`/meal-plans/${result.newPlanId}`);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4.5" />
          Ask AI to adjust this plan
        </CardTitle>
        <CardDescription>
          Describe the change you want. This creates a new draft plan with the proposed changes — the
          current plan is never modified until you review and choose to use the draft.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder={EXAMPLES[0]}
          rows={3}
        />
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setInstruction(example)}
              className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              {example}
            </button>
          ))}
        </div>
        {error && <ErrorState description={error} onRetry={handleSubmit} />}
        <Button onClick={handleSubmit} disabled={isPending || instruction.trim().length < 5}>
          {isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {isPending ? "Generating proposed changes…" : "Propose changes"}
        </Button>
      </CardContent>
    </Card>
  );
}
