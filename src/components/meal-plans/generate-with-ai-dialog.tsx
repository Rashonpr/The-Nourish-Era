"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagInput } from "@/components/shared/tag-input";
import { generateAiMealPlanAction } from "@/lib/actions/ai-meal-plan";

export function GenerateWithAiDialog({
  planId,
  trigger,
  defaultBudget,
  defaultPrepTime,
}: {
  planId: string;
  trigger: React.ReactElement;
  defaultBudget?: "low" | "moderate" | "high";
  defaultPrepTime?: number;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [cuisinePreferences, setCuisinePreferences] = useState<string[]>([]);
  const [foodsToPrioritize, setFoodsToPrioritize] = useState<string[]>([]);
  const [additionalExcludedFoods, setAdditionalExcludedFoods] = useState<string[]>([]);
  const [preparationTime, setPreparationTime] = useState(defaultPrepTime ? String(defaultPrepTime) : "");
  const [budgetPreference, setBudgetPreference] = useState<"low" | "moderate" | "high" | undefined>(defaultBudget);
  const [varietyPreference, setVarietyPreference] = useState<"low" | "medium" | "high">("medium");
  const [repeatingMealsAllowed, setRepeatingMealsAllowed] = useState(true);

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateAiMealPlanAction(planId, {
        cuisinePreferences,
        foodsToPrioritize,
        additionalExcludedFoods,
        preparationTime: preparationTime ? Number(preparationTime) : undefined,
        budgetPreference,
        varietyPreference,
        repeatingMealsAllowed,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("AI draft generated — review every meal before approving.");
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && setOpen(next)}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4.5" />
            Generate with AI
          </DialogTitle>
          <DialogDescription>
            Claude proposes meals and portions; every nutrition value is calculated from USDA data
            afterward. The result is a draft — you review and approve everything before it goes to the
            patient.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Cuisine preferences</Label>
            <TagInput value={cuisinePreferences} onChange={setCuisinePreferences} placeholder="e.g. Mediterranean, Mexican…" />
          </div>
          <div className="space-y-1.5">
            <Label>Foods to prioritize</Label>
            <TagInput value={foodsToPrioritize} onChange={setFoodsToPrioritize} placeholder="e.g. lentils, salmon…" />
          </div>
          <div className="space-y-1.5">
            <Label>Additional foods to exclude</Label>
            <TagInput value={additionalExcludedFoods} onChange={setAdditionalExcludedFoods} placeholder="e.g. pork…" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Max prep time (minutes)</Label>
              <Input type="number" value={preparationTime} onChange={(e) => setPreparationTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Budget preference</Label>
              <Select value={budgetPreference ?? ""} onValueChange={(v) => setBudgetPreference(v as typeof budgetPreference)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No preference" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Meal variety</Label>
              <Select value={varietyPreference} onValueChange={(v) => v && setVarietyPreference(v as typeof varietyPreference)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low — more repeats ok</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High — maximize variety</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={repeatingMealsAllowed} onCheckedChange={(c) => setRepeatingMealsAllowed(c === true)} />
                Allow repeating meals
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleGenerate} disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {isPending ? "Generating… this can take a minute" : "Generate draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
