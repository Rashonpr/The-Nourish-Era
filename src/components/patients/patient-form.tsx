"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { patientFormSchema, type PatientFormInput } from "@/lib/validation/patient";
import { createPatientAction, updatePatientAction } from "@/lib/actions/patients";
import { cmToFeetInches, feetInchesToCm, kgToLbs, lbsToKg } from "@/lib/utils/units";
import {
  ACTIVITY_LEVELS,
  PRIMARY_GOALS,
  DIETARY_PREFERENCE_OPTIONS,
  COOKING_ABILITIES,
  BUDGET_LEVELS,
  CLINICAL_CONDITION_OPTIONS,
  SEX_OPTIONS,
} from "@/config/patient-options";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TagInput } from "@/components/shared/tag-input";
import { AllergyPicker } from "@/components/patients/allergy-picker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

export type PatientFormMode = { kind: "create" } | { kind: "edit"; patientId: string };

export function PatientForm({
  mode,
  defaultValues,
}: {
  mode: PatientFormMode;
  defaultValues?: Partial<PatientFormInput>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      preferredUnits: "imperial",
      dietaryPreferences: [],
      allergies: [],
      favoriteFoods: [],
      dislikedFoods: [],
      refusedFoods: [],
      conditions: [],
      ...defaultValues,
    },
  });

  const { register, handleSubmit, control, watch, setValue, formState } = form;

  const preferredUnits = watch("preferredUnits");
  const primaryGoal = watch("primaryGoal");

  // Imperial-unit UI state — canonical cm/kg values live on the RHF fields.
  const initialImperialHeight = defaultValues?.heightCm ? cmToFeetInches(defaultValues.heightCm) : null;
  const [heightFeet, setHeightFeet] = useState(initialImperialHeight?.feet ?? "");
  const [heightInches, setHeightInches] = useState(initialImperialHeight?.inches ?? "");
  const [weightLbs, setWeightLbs] = useState(
    defaultValues?.currentWeightKg ? String(kgToLbs(defaultValues.currentWeightKg)) : "",
  );
  const [goalWeightLbs, setGoalWeightLbs] = useState(
    defaultValues?.goalWeightKg ? String(kgToLbs(defaultValues.goalWeightKg)) : "",
  );

  useEffect(() => {
    if (preferredUnits !== "imperial") return;
    const feet = Number(heightFeet) || 0;
    const inches = Number(heightInches) || 0;
    setValue("heightCm", feet || inches ? feetInchesToCm(feet, inches) : undefined);
  }, [preferredUnits, heightFeet, heightInches, setValue]);

  useEffect(() => {
    if (preferredUnits !== "imperial") return;
    setValue("currentWeightKg", weightLbs ? lbsToKg(Number(weightLbs)) : undefined);
  }, [preferredUnits, weightLbs, setValue]);

  useEffect(() => {
    if (preferredUnits !== "imperial") return;
    setValue("goalWeightKg", goalWeightLbs ? lbsToKg(Number(goalWeightLbs)) : undefined);
  }, [preferredUnits, goalWeightLbs, setValue]);

  async function onSubmit(data: PatientFormInput) {
    setSubmitError(null);
    startTransition(async () => {
      const result =
        mode.kind === "create"
          ? await createPatientAction(data)
          : await updatePatientAction(mode.patientId, data);

      if (result?.error) {
        setSubmitError(result.error);
        toast.error(result.error);
      }
      // On success the action redirects server-side.
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" {...register("firstName")} aria-invalid={!!formState.errors.firstName} />
              {formState.errors.firstName && (
                <p className="text-xs text-destructive">{formState.errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" {...register("lastName")} aria-invalid={!!formState.errors.lastName} />
              {formState.errors.lastName && (
                <p className="text-xs text-destructive">{formState.errors.lastName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of birth</Label>
              <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
            </div>
            <div className="space-y-2">
              <Label>Sex</Label>
              <Controller
                control={control}
                name="sex"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange} items={SEX_OPTIONS}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {SEX_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Units</Label>
            <Controller
              control={control}
              name="preferredUnits"
              render={({ field }) => (
                <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="imperial" /> Imperial (ft/in, lb)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="metric" /> Metric (cm, kg)
                  </label>
                </RadioGroup>
              )}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            {preferredUnits === "imperial" ? (
              <>
                <div className="space-y-2">
                  <Label>Height</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type="number"
                        value={heightFeet}
                        onChange={(e) => setHeightFeet(e.target.value)}
                        placeholder="5"
                      />
                      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
                        ft
                      </span>
                    </div>
                    <div className="relative flex-1">
                      <Input
                        type="number"
                        value={heightInches}
                        onChange={(e) => setHeightInches(e.target.value)}
                        placeholder="8"
                      />
                      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
                        in
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Current weight (lb)</Label>
                  <Input type="number" value={weightLbs} onChange={(e) => setWeightLbs(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Goal weight (lb)</Label>
                  <Input type="number" value={goalWeightLbs} onChange={(e) => setGoalWeightLbs(e.target.value)} />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="heightCm">Height (cm)</Label>
                  <Input id="heightCm" type="number" {...register("heightCm")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentWeightKg">Current weight (kg)</Label>
                  <Input id="currentWeightKg" type="number" {...register("currentWeightKg")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goalWeightKg">Goal weight (kg)</Label>
                  <Input id="goalWeightKg" type="number" {...register("goalWeightKg")} />
                </div>
              </>
            )}
          </div>
          <div className="space-y-2">
            <Label>Activity level</Label>
            <Controller
              control={control}
              name="activityLevel"
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange} items={ACTIVITY_LEVELS}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_LEVELS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Primary goal */}
      <Card>
        <CardHeader>
          <CardTitle>Primary goal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Controller
            control={control}
            name="primaryGoal"
            render={({ field }) => (
              <RadioGroup value={field.value ?? ""} onValueChange={field.onChange} className="grid gap-2.5 sm:grid-cols-2">
                {PRIMARY_GOALS.map((goal) => (
                  <label key={goal} className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value={goal} /> {goal}
                  </label>
                ))}
              </RadioGroup>
            )}
          />
          {primaryGoal === "Other" && (
            <div className="space-y-2">
              <Label htmlFor="primaryGoalCustom">Describe the goal</Label>
              <Input id="primaryGoalCustom" {...register("primaryGoalCustom")} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dietary preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Dietary preferences</CardTitle>
          <CardDescription>Select any that apply, or add a custom preference.</CardDescription>
        </CardHeader>
        <CardContent>
          <Controller
            control={control}
            name="dietaryPreferences"
            render={({ field }) => (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {DIETARY_PREFERENCE_OPTIONS.map((opt) => {
                    const checked = field.value.includes(opt);
                    return (
                      <label key={opt} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(c) =>
                            field.onChange(c ? [...field.value, opt] : field.value.filter((v) => v !== opt))
                          }
                        />
                        {opt}
                      </label>
                    );
                  })}
                </div>
                <TagInput
                  value={field.value.filter((v) => !(DIETARY_PREFERENCE_OPTIONS as readonly string[]).includes(v))}
                  onChange={(customOnes) =>
                    field.onChange([
                      ...field.value.filter((v) => (DIETARY_PREFERENCE_OPTIONS as readonly string[]).includes(v)),
                      ...customOnes,
                    ])
                  }
                  placeholder="Add a custom dietary preference…"
                />
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Allergies */}
      <Card>
        <CardHeader>
          <CardTitle>Allergies</CardTitle>
          <CardDescription>Treated as hard constraints when generating or reviewing meal plans.</CardDescription>
        </CardHeader>
        <CardContent>
          <Controller
            control={control}
            name="allergies"
            render={({ field }) => <AllergyPicker value={field.value} onChange={field.onChange} />}
          />
        </CardContent>
      </Card>

      {/* Food preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Food preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Favorite foods</Label>
            <Controller
              control={control}
              name="favoriteFoods"
              render={({ field }) => <TagInput value={field.value} onChange={field.onChange} />}
            />
          </div>
          <div className="space-y-2">
            <Label>Foods the patient dislikes</Label>
            <Controller
              control={control}
              name="dislikedFoods"
              render={({ field }) => <TagInput value={field.value} onChange={field.onChange} />}
            />
          </div>
          <div className="space-y-2">
            <Label>Foods the patient refuses to eat</Label>
            <Controller
              control={control}
              name="refusedFoods"
              render={({ field }) => <TagInput value={field.value} onChange={field.onChange} />}
            />
          </div>
        </CardContent>
      </Card>

      {/* Lifestyle */}
      <Card>
        <CardHeader>
          <CardTitle>Lifestyle</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="mealsPerDay">Meals per day</Label>
            <Input id="mealsPerDay" type="number" {...register("mealsPerDay")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="snacksPerDay">Snacks per day</Label>
            <Input id="snacksPerDay" type="number" {...register("snacksPerDay")} />
          </div>
          <div className="space-y-2">
            <Label>Cooking ability</Label>
            <Controller
              control={control}
              name="cookingAbility"
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange} items={COOKING_ABILITIES}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {COOKING_ABILITIES.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prepTimeMinutes">Meal prep time available (minutes)</Label>
            <Input id="prepTimeMinutes" type="number" {...register("prepTimeMinutes")} />
          </div>
          <div className="space-y-2">
            <Label>Budget level</Label>
            <Controller
              control={control}
              name="budgetLevel"
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange} items={BUDGET_LEVELS}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUDGET_LEVELS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eatingOutFrequency">Eating out frequency</Label>
            <Input id="eatingOutFrequency" placeholder="e.g. 2-3x/week" {...register("eatingOutFrequency")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exerciseFrequency">Exercise frequency</Label>
            <Input id="exerciseFrequency" placeholder="e.g. 4x/week" {...register("exerciseFrequency")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exerciseType">Exercise type</Label>
            <Input id="exerciseType" placeholder="e.g. strength training, running" {...register("exerciseType")} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="workScheduleNotes">Work schedule notes</Label>
            <Textarea id="workScheduleNotes" rows={2} {...register("workScheduleNotes")} />
          </div>
        </CardContent>
      </Card>

      {/* Clinical considerations */}
      <Card>
        <CardHeader>
          <CardTitle>Clinical considerations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info />
            <AlertTitle>For practitioner documentation only</AlertTitle>
            <AlertDescription>
              This does not diagnose a condition. Clinical nutrition recommendations should be individualized
              by a qualified healthcare professional.
            </AlertDescription>
          </Alert>
          <Controller
            control={control}
            name="conditions"
            render={({ field }) => (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {CLINICAL_CONDITION_OPTIONS.map((opt) => {
                    const checked = field.value.includes(opt);
                    return (
                      <label key={opt} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(c) =>
                            field.onChange(c ? [...field.value, opt] : field.value.filter((v) => v !== opt))
                          }
                        />
                        {opt}
                      </label>
                    );
                  })}
                </div>
                <TagInput
                  value={field.value.filter((v) => !(CLINICAL_CONDITION_OPTIONS as readonly string[]).includes(v))}
                  onChange={(customOnes) =>
                    field.onChange([
                      ...field.value.filter((v) => (CLINICAL_CONDITION_OPTIONS as readonly string[]).includes(v)),
                      ...customOnes,
                    ])
                  }
                  placeholder="Add another consideration…"
                />
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Medications / supplements */}
      <Card>
        <CardHeader>
          <CardTitle>Medications &amp; supplements</CardTitle>
          <CardDescription>Optional notes. This tool does not recommend medication changes.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea rows={3} placeholder="e.g. Metformin 500mg, daily multivitamin" {...register("medicationsNotes")} />
        </CardContent>
      </Card>

      {submitError && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {submitError}
        </p>
      )}

      <div className="flex justify-end gap-3 pb-8">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="animate-spin" />}
          {mode.kind === "create" ? "Create patient" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
