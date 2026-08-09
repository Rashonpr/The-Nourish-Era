"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createMealPlanAction } from "@/lib/actions/meal-plans";

type PatientOption = { id: string; first_name: string; last_name: string };

export function NewMealPlanForm({ patients, defaultPatientId }: { patients: PatientOption[]; defaultPatientId?: string }) {
  const [patientId, setPatientId] = useState(defaultPatientId ?? "");
  const [name, setName] = useState("");
  const [numDays, setNumDays] = useState("7");
  const [mealsPerDay, setMealsPerDay] = useState("3");
  const [snacksPerDay, setSnacksPerDay] = useState("1");
  const [startDate, setStartDate] = useState("");
  const [isPending, startTransition] = useTransition();

  function handlePatientChange(id: string) {
    setPatientId(id);
    if (!name) {
      const patient = patients.find((p) => p.id === id);
      if (patient) setName(`${patient.first_name}'s Meal Plan`);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createMealPlanAction({
        patientId,
        name,
        numDays: Number(numDays),
        mealsPerDay: Number(mealsPerDay),
        snacksPerDay: Number(snacksPerDay),
        startDate,
      });
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select patient</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={patientId}
            onValueChange={(v) => v && handlePatientChange(v)}
            items={patients.map((p) => ({ value: p.id, label: `${p.first_name} ${p.last_name}` }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a patient…" />
            </SelectTrigger>
            <SelectContent>
              {patients.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.first_name} {p.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Plan name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Number of days</Label>
            <Input type="number" min={1} max={28} value={numDays} onChange={(e) => setNumDays(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Start date (optional)</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Meals per day</Label>
            <Input type="number" min={1} max={8} value={mealsPerDay} onChange={(e) => setMealsPerDay(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Snacks per day</Label>
            <Input type="number" min={0} max={6} value={snacksPerDay} onChange={(e) => setSnacksPerDay(e.target.value)} required />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending || !patientId || !name.trim()}>
          {isPending && <Loader2 className="animate-spin" />}
          Create plan
        </Button>
      </div>
    </form>
  );
}
