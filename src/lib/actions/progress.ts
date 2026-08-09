"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { addProgressEntrySchema, type AddProgressEntryInput } from "@/lib/validation/progress";

export type ProgressActionResult = { error?: string };

export async function addProgressEntryAction(patientId: string, input: AddProgressEntryInput): Promise<ProgressActionResult> {
  const parsed = addProgressEntrySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Please log in again." };

  const { error } = await supabase.from("progress_entries").upsert(
    {
      patient_id: patientId,
      entry_date: parsed.data.entryDate,
      weight_kg: parsed.data.weightKg ?? null,
      notes: parsed.data.notes || null,
      adherence_pct: parsed.data.adherencePct ?? null,
      hunger_rating: parsed.data.hungerRating ?? null,
      energy_rating: parsed.data.energyRating ?? null,
      practitioner_notes: parsed.data.practitionerNotes || null,
      created_by: user.id,
    } as never,
    { onConflict: "patient_id,entry_date" },
  );

  if (error) return { error: "Couldn't save this entry. Please try again." };

  revalidatePath(`/patients/${patientId}/progress`);
  return {};
}

export async function deleteProgressEntryAction(patientId: string, entryId: string): Promise<ProgressActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("progress_entries").delete().eq("id", entryId);
  if (error) return { error: "Couldn't delete this entry." };

  revalidatePath(`/patients/${patientId}/progress`);
  return {};
}
