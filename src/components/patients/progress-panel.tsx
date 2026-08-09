"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Loader2, Plus, Trash2, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { TrendingUp } from "lucide-react";
import { ProgressChart } from "@/components/patients/progress-chart";
import { addProgressEntryAction, deleteProgressEntryAction } from "@/lib/actions/progress";
import { summarizeProgressAction } from "@/lib/actions/progress-summary";
import { kgToLbs, lbsToKg } from "@/lib/utils/units";
import type { Database, PreferredUnits } from "@/types/database";

type ProgressEntry = Database["public"]["Tables"]["progress_entries"]["Row"];

export function ProgressPanel({
  patientId,
  entries,
  preferredUnits,
}: {
  patientId: string;
  entries: ProgressEntry[];
  preferredUnits: PreferredUnits;
}) {
  const [isPending, startTransition] = useTransition();
  const [isSummarizing, startSummarizing] = useTransition();
  const [summary, setSummary] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    entryDate: format(new Date(), "yyyy-MM-dd"),
    weight: "",
    notes: "",
    adherencePct: "",
    hungerRating: "",
    energyRating: "",
    practitionerNotes: "",
  });

  const isImperial = preferredUnits === "imperial";
  const unitLabel = isImperial ? "lb" : "kg";

  const chartPoints = [...entries]
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
    .map((e) => ({
      date: e.entry_date,
      weight: e.weight_kg ? (isImperial ? kgToLbs(e.weight_kg) : e.weight_kg) : null,
    }));

  function handleAdd() {
    const weightKg = form.weight ? (isImperial ? lbsToKg(Number(form.weight)) : Number(form.weight)) : undefined;
    startTransition(async () => {
      const result = await addProgressEntryAction(patientId, {
        entryDate: form.entryDate,
        weightKg,
        notes: form.notes,
        adherencePct: form.adherencePct ? Number(form.adherencePct) : undefined,
        hungerRating: form.hungerRating ? Number(form.hungerRating) : undefined,
        energyRating: form.energyRating ? Number(form.energyRating) : undefined,
        practitionerNotes: form.practitionerNotes,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Entry saved");
        setShowForm(false);
        setForm((f) => ({ ...f, weight: "", notes: "", adherencePct: "", hungerRating: "", energyRating: "", practitionerNotes: "" }));
      }
    });
  }

  function handleDelete(entryId: string) {
    startTransition(async () => {
      const result = await deleteProgressEntryAction(patientId, entryId);
      if (result.error) toast.error(result.error);
    });
  }

  function handleSummarize() {
    startSummarizing(async () => {
      const result = await summarizeProgressAction(patientId);
      if (result.error) toast.error(result.error);
      else setSummary(result.summary ?? null);
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Weight trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ProgressChart points={chartPoints} unitLabel={unitLabel} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4.5" />
            AI trend observations
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleSummarize} disabled={isSummarizing || entries.length < 2}>
            {isSummarizing ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Summarize trends
          </Button>
        </CardHeader>
        <CardContent>
          {summary ? (
            <p className="text-sm whitespace-pre-wrap text-foreground">{summary}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {entries.length < 2
                ? "Add at least two entries to generate an AI summary."
                : "Generate an AI summary of this patient's trends — always framed as observations for your review, never a diagnosis."}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Entries</CardTitle>
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus />
            Add entry
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {showForm && (
            <div className="grid gap-4 rounded-md border border-border p-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={form.entryDate} onChange={(e) => setForm((f) => ({ ...f, entryDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Weight ({unitLabel})</Label>
                <Input type="number" value={form.weight} onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Adherence %</Label>
                <Input type="number" min={0} max={100} value={form.adherencePct} onChange={(e) => setForm((f) => ({ ...f, adherencePct: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Hunger (1-5)</Label>
                <Input type="number" min={1} max={5} value={form.hungerRating} onChange={(e) => setForm((f) => ({ ...f, hungerRating: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Energy (1-5)</Label>
                <Input type="number" min={1} max={5} value={form.energyRating} onChange={(e) => setForm((f) => ({ ...f, energyRating: e.target.value }))} />
              </div>
              <div className="space-y-1.5 sm:col-span-3">
                <Label>Patient notes</Label>
                <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="space-y-1.5 sm:col-span-3">
                <Label>Practitioner notes</Label>
                <Textarea rows={2} value={form.practitionerNotes} onChange={(e) => setForm((f) => ({ ...f, practitionerNotes: e.target.value }))} />
              </div>
              <div className="sm:col-span-3">
                <Button onClick={handleAdd} disabled={isPending}>
                  {isPending && <Loader2 className="animate-spin" />}
                  Save entry
                </Button>
              </div>
            </div>
          )}

          {entries.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No progress entries yet" description="Add an entry after each check-in to track trends over time." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Adherence</TableHead>
                    <TableHead>Hunger</TableHead>
                    <TableHead>Energy</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...entries]
                    .sort((a, b) => b.entry_date.localeCompare(a.entry_date))
                    .map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{format(parseISO(entry.entry_date), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          {entry.weight_kg ? `${isImperial ? kgToLbs(entry.weight_kg) : entry.weight_kg} ${unitLabel}` : "—"}
                        </TableCell>
                        <TableCell>{entry.adherence_pct ?? "—"}</TableCell>
                        <TableCell>{entry.hunger_rating ?? "—"}</TableCell>
                        <TableCell>{entry.energy_rating ?? "—"}</TableCell>
                        <TableCell className="max-w-48 truncate text-muted-foreground">{entry.notes ?? "—"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(entry.id)} disabled={isPending} aria-label="Delete entry">
                            <Trash2 className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
