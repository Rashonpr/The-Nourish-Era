"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NutritionTargetCalculator } from "@/components/patients/nutrition-target-calculator";
import { saveNutritionTargetsAction } from "@/lib/actions/nutrition-targets";
import { FORMULA_LABELS, type EnergyEstimateInput } from "@/lib/services/nutrition/energy-calculator";
import type { Database } from "@/types/database";

type NutritionTarget = Database["public"]["Tables"]["nutrition_targets"]["Row"];

type FieldsState = {
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  fiberG: string;
  sodiumMg: string;
  addedSugarG: string;
  saturatedFatG: string;
  waterMl: string;
};

function toFieldsState(target: NutritionTarget | null): FieldsState {
  return {
    calories: target?.calories?.toString() ?? "",
    proteinG: target?.protein_g?.toString() ?? "",
    carbsG: target?.carbs_g?.toString() ?? "",
    fatG: target?.fat_g?.toString() ?? "",
    fiberG: target?.fiber_g?.toString() ?? "",
    sodiumMg: target?.sodium_mg?.toString() ?? "",
    addedSugarG: target?.added_sugar_g?.toString() ?? "",
    saturatedFatG: target?.saturated_fat_g?.toString() ?? "",
    waterMl: target?.water_ml?.toString() ?? "",
  };
}

export function NutritionTargetsForm({
  patientId,
  currentTarget,
  calculatorDefaults,
}: {
  patientId: string;
  currentTarget: NutritionTarget | null;
  calculatorDefaults: {
    weightKg?: number;
    heightCm?: number;
    age?: number;
    sex?: "male" | "female";
    activityLevel?: EnergyEstimateInput["activityLevel"];
  };
}) {
  const [fields, setFields] = useState<FieldsState>(toFieldsState(currentTarget));
  const [calcMethod, setCalcMethod] = useState<string | null>(currentTarget?.calc_method ?? null);
  const [isPending, startTransition] = useTransition();

  function setField(key: keyof FieldsState, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function handleApplyFromCalculator(values: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
    sodiumMg: number;
    calcMethod: string;
  }) {
    setFields((prev) => ({
      ...prev,
      calories: String(values.calories),
      proteinG: String(values.proteinG),
      carbsG: String(values.carbsG),
      fatG: String(values.fatG),
      fiberG: String(values.fiberG),
      sodiumMg: String(values.sodiumMg),
    }));
    setCalcMethod(values.calcMethod);
    toast.success("Estimate applied below — review before saving.");
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveNutritionTargetsAction(patientId, {
        calories: fields.calories ? Number(fields.calories) : undefined,
        proteinG: fields.proteinG ? Number(fields.proteinG) : undefined,
        carbsG: fields.carbsG ? Number(fields.carbsG) : undefined,
        fatG: fields.fatG ? Number(fields.fatG) : undefined,
        fiberG: fields.fiberG ? Number(fields.fiberG) : undefined,
        sodiumMg: fields.sodiumMg ? Number(fields.sodiumMg) : undefined,
        addedSugarG: fields.addedSugarG ? Number(fields.addedSugarG) : undefined,
        saturatedFatG: fields.saturatedFatG ? Number(fields.saturatedFatG) : undefined,
        waterMl: fields.waterMl ? Number(fields.waterMl) : undefined,
        calcMethod: calcMethod ?? undefined,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Nutrition targets saved");
      }
    });
  }

  return (
    <div className="space-y-6">
      <NutritionTargetCalculator
        defaultWeightKg={calculatorDefaults.weightKg}
        defaultHeightCm={calculatorDefaults.heightCm}
        defaultAge={calculatorDefaults.age}
        defaultSex={calculatorDefaults.sex}
        defaultActivityLevel={calculatorDefaults.activityLevel}
        onApply={handleApplyFromCalculator}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Targets</CardTitle>
              <CardDescription>The practitioner is always the final authority — every value here is editable.</CardDescription>
            </div>
            {calcMethod && (
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="size-3" />
                {FORMULA_LABELS[calcMethod as keyof typeof FORMULA_LABELS] ?? calcMethod}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Calories</Label>
              <Input type="number" value={fields.calories} onChange={(e) => setField("calories", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Protein (g)</Label>
              <Input type="number" value={fields.proteinG} onChange={(e) => setField("proteinG", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Carbohydrate (g)</Label>
              <Input type="number" value={fields.carbsG} onChange={(e) => setField("carbsG", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Fat (g)</Label>
              <Input type="number" value={fields.fatG} onChange={(e) => setField("fatG", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Fiber (g)</Label>
              <Input type="number" value={fields.fiberG} onChange={(e) => setField("fiberG", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Sodium (mg)</Label>
              <Input type="number" value={fields.sodiumMg} onChange={(e) => setField("sodiumMg", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Added sugar limit (g)</Label>
              <Input type="number" value={fields.addedSugarG} onChange={(e) => setField("addedSugarG", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Saturated fat limit (g)</Label>
              <Input type="number" value={fields.saturatedFatG} onChange={(e) => setField("saturatedFatG", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Water target (mL)</Label>
              <Input type="number" value={fields.waterMl} onChange={(e) => setField("waterMl", e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              Save targets
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
