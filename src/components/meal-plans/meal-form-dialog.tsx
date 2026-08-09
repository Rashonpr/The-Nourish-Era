"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addMealAction, updateMealAction } from "@/lib/actions/meals";
import type { MealType } from "@/types/database";

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
  { value: "other", label: "Other" },
];

type MealFormDialogProps = {
  trigger: React.ReactElement;
} & (
  | { mode: "add"; mealPlanDayId: string }
  | {
      mode: "edit";
      mealId: string;
      defaultValues: { mealType: MealType; name: string; prepInstructions: string | null; servings: number };
    }
);

export function MealFormDialog(props: MealFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const defaults =
    props.mode === "edit"
      ? props.defaultValues
      : { mealType: "breakfast" as MealType, name: "", prepInstructions: "", servings: 1 };

  const [mealType, setMealType] = useState<MealType>(defaults.mealType);
  const [name, setName] = useState(defaults.name);
  const [prepInstructions, setPrepInstructions] = useState(defaults.prepInstructions ?? "");
  const [servings, setServings] = useState(String(defaults.servings));

  function handleSubmit() {
    startTransition(async () => {
      const result =
        props.mode === "add"
          ? await addMealAction({
              mealPlanDayId: props.mealPlanDayId,
              mealType,
              name,
              prepInstructions,
              servings: Number(servings) || 1,
            })
          : await updateMealAction(props.mealId, {
              mealType,
              name,
              prepInstructions,
              servings: Number(servings) || 1,
            });

      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(props.mode === "add" ? "Meal added" : "Meal updated");
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={props.trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{props.mode === "add" ? "Add meal" : "Edit meal"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label>Meal type</Label>
              <Select value={mealType} onValueChange={(v) => v && setMealType(v as MealType)} items={MEAL_TYPES}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEAL_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-28 space-y-1.5">
              <Label>Servings</Label>
              <Input type="number" value={servings} onChange={(e) => setServings(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Meal name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Greek yogurt parfait" />
          </div>
          <div className="space-y-1.5">
            <Label>Preparation instructions</Label>
            <Textarea rows={3} value={prepInstructions} onChange={(e) => setPrepInstructions(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isPending || !name.trim()}>
            {isPending && <Loader2 className="animate-spin" />}
            {props.mode === "add" ? "Add meal" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
