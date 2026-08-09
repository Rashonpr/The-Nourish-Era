"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  estimateEnergyNeeds,
  suggestMacros,
  type EnergyFormula,
  type EnergyEstimateInput,
} from "@/lib/services/nutrition/energy-calculator";

const SEX_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
];

const ACTIVITY_LEVEL_OPTIONS = [
  { value: "sedentary", label: "Sedentary" },
  { value: "lightly_active", label: "Lightly active" },
  { value: "moderately_active", label: "Moderately active" },
  { value: "very_active", label: "Very active" },
  { value: "extra_active", label: "Extra active" },
];

const FORMULA_OPTIONS = [
  { value: "mifflin_st_jeor", label: "Mifflin-St Jeor" },
  { value: "harris_benedict", label: "Harris-Benedict (revised)" },
];

const ADJUSTMENT_OPTIONS = [
  { value: "-500", label: "Deficit for weight loss (-500 kcal/day, ~1 lb/week)" },
  { value: "-250", label: "Mild deficit (-250 kcal/day)" },
  { value: "0", label: "Maintenance (no adjustment)" },
  { value: "250", label: "Mild surplus (+250 kcal/day)" },
  { value: "500", label: "Surplus for weight gain (+500 kcal/day)" },
];

export function NutritionTargetCalculator({
  defaultWeightKg,
  defaultHeightCm,
  defaultAge,
  defaultSex,
  defaultActivityLevel,
  onApply,
}: {
  defaultWeightKg?: number;
  defaultHeightCm?: number;
  defaultAge?: number;
  defaultSex?: "male" | "female";
  defaultActivityLevel?: EnergyEstimateInput["activityLevel"];
  onApply: (values: { calories: number; proteinG: number; carbsG: number; fatG: number; fiberG: number; sodiumMg: number; calcMethod: string; calcInputs: Record<string, unknown> }) => void;
}) {
  const [weightKg, setWeightKg] = useState(defaultWeightKg?.toString() ?? "");
  const [heightCm, setHeightCm] = useState(defaultHeightCm?.toString() ?? "");
  const [age, setAge] = useState(defaultAge?.toString() ?? "");
  const [sex, setSex] = useState<"male" | "female">(defaultSex ?? "female");
  const [activityLevel, setActivityLevel] = useState<EnergyEstimateInput["activityLevel"]>(
    defaultActivityLevel ?? "sedentary",
  );
  const [formula, setFormula] = useState<EnergyFormula>("mifflin_st_jeor");
  const [adjustment, setAdjustment] = useState("0");

  const canCalculate = Number(weightKg) > 0 && Number(heightCm) > 0 && Number(age) > 0;

  const result = useMemo(() => {
    if (!canCalculate) return null;
    return estimateEnergyNeeds({
      weightKg: Number(weightKg),
      heightCm: Number(heightCm),
      age: Number(age),
      sex,
      activityLevel,
      formula,
      calorieAdjustment: Number(adjustment),
    });
  }, [canCalculate, weightKg, heightCm, age, sex, activityLevel, formula, adjustment]);

  const macros = result ? suggestMacros(result.estimatedCalories, Number(weightKg)) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="size-4.5" />
          Starting-point calculator
        </CardTitle>
        <CardDescription>
          Generates an estimate only — review the calculation and override any value before saving.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Weight (kg)</Label>
            <Input type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Height (cm)</Label>
            <Input type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Age</Label>
            <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Sex</Label>
            <Select value={sex} onValueChange={(v) => setSex(v as "male" | "female")} items={SEX_OPTIONS}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="male">Male</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Activity level</Label>
            <Select
              value={activityLevel}
              onValueChange={(v) => setActivityLevel(v as typeof activityLevel)}
              items={ACTIVITY_LEVEL_OPTIONS}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sedentary">Sedentary</SelectItem>
                <SelectItem value="lightly_active">Lightly active</SelectItem>
                <SelectItem value="moderately_active">Moderately active</SelectItem>
                <SelectItem value="very_active">Very active</SelectItem>
                <SelectItem value="extra_active">Extra active</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Formula</Label>
            <Select value={formula} onValueChange={(v) => setFormula(v as EnergyFormula)} items={FORMULA_OPTIONS}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mifflin_st_jeor">Mifflin-St Jeor</SelectItem>
                <SelectItem value="harris_benedict">Harris-Benedict (revised)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Goal adjustment</Label>
            <Select value={adjustment} onValueChange={(v) => setAdjustment(v ?? "0")} items={ADJUSTMENT_OPTIONS}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADJUSTMENT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {result && macros ? (
          <div className="space-y-3 rounded-md bg-secondary p-4">
            <ul className="space-y-1 text-sm text-secondary-foreground">
              {result.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
            <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm sm:grid-cols-4">
              <div>
                <p className="text-muted-foreground">Calories</p>
                <p className="font-medium text-foreground">{result.estimatedCalories}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Protein</p>
                <p className="font-medium text-foreground">{macros.proteinG} g</p>
              </div>
              <div>
                <p className="text-muted-foreground">Carbs</p>
                <p className="font-medium text-foreground">{macros.carbsG} g</p>
              </div>
              <div>
                <p className="text-muted-foreground">Fat</p>
                <p className="font-medium text-foreground">{macros.fatG} g</p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() =>
                onApply({
                  calories: result.estimatedCalories,
                  proteinG: macros.proteinG,
                  carbsG: macros.carbsG,
                  fatG: macros.fatG,
                  fiberG: macros.fiberG,
                  sodiumMg: macros.sodiumMg,
                  calcMethod: result.formula,
                  calcInputs: { weightKg: Number(weightKg), heightCm: Number(heightCm), age: Number(age), sex, activityLevel, calorieAdjustment: Number(adjustment) },
                })
              }
            >
              Apply to targets below
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Enter weight, height, and age to see an estimate.</p>
        )}
      </CardContent>
    </Card>
  );
}
