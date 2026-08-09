"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COMMON_ALLERGENS, ALLERGY_SEVERITIES } from "@/config/patient-options";
import type { AllergyInput } from "@/lib/validation/patient";

export function AllergyPicker({
  value,
  onChange,
}: {
  value: AllergyInput[];
  onChange: (next: AllergyInput[]) => void;
}) {
  const [customDraft, setCustomDraft] = useState("");

  function findIndex(allergen: string) {
    return value.findIndex((a) => a.allergen.toLowerCase() === allergen.toLowerCase());
  }

  function toggleCommon(allergen: string, checked: boolean) {
    if (checked) {
      onChange([...value, { allergen, isCustom: false, severity: "unspecified" }]);
    } else {
      onChange(value.filter((a) => a.allergen.toLowerCase() !== allergen.toLowerCase()));
    }
  }

  function setSeverity(allergen: string, severity: AllergyInput["severity"]) {
    onChange(value.map((a) => (a.allergen === allergen ? { ...a, severity } : a)));
  }

  function addCustom() {
    const allergen = customDraft.trim();
    if (!allergen || findIndex(allergen) !== -1) {
      setCustomDraft("");
      return;
    }
    onChange([...value, { allergen, isCustom: true, severity: "unspecified" }]);
    setCustomDraft("");
  }

  function removeAllergy(allergen: string) {
    onChange(value.filter((a) => a.allergen !== allergen));
  }

  const customAllergies = value.filter((a) => a.isCustom);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {COMMON_ALLERGENS.map((allergen) => {
          const idx = findIndex(allergen);
          const checked = idx !== -1;
          return (
            <label
              key={allergen}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm has-[[data-checked]]:border-destructive/40 has-[[data-checked]]:bg-destructive/5"
            >
              <Checkbox checked={checked} onCheckedChange={(c) => toggleCommon(allergen, c === true)} />
              {allergen}
            </label>
          );
        })}
      </div>

      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((a) => (
            <div
              key={a.allergen}
              className="flex flex-wrap items-center gap-2.5 rounded-md bg-destructive/5 px-3 py-2"
            >
              <span className="text-sm font-medium text-foreground">{a.allergen}</span>
              <Select
                value={a.severity}
                onValueChange={(v) => setSeverity(a.allergen, v as AllergyInput["severity"])}
                items={ALLERGY_SEVERITIES}
              >
                <SelectTrigger size="sm" className="ml-auto w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALLERGY_SEVERITIES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeAllergy(a.allergen)}
                aria-label={`Remove ${a.allergen}`}
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={customDraft}
          onChange={(e) => setCustomDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Add another allergy…"
        />
        <Button type="button" variant="outline" onClick={addCustom}>
          Add
        </Button>
      </div>
      {customAllergies.length === 0 && (
        <Label className="font-normal text-muted-foreground">
          Allergies are treated as hard constraints when generating meal plans.
        </Label>
      )}
    </div>
  );
}
