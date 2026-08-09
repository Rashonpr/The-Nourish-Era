"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const noteSchema = z.string().trim().min(1, "Note can't be empty").max(4000);

export async function addNoteAction(patientId: string, note: string): Promise<{ error?: string }> {
  const parsed = noteSchema.safeParse(note);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Please log in again." };

  const { error } = await supabase
    .from("practitioner_notes")
    .insert({ patient_id: patientId, practitioner_id: user.id, note: parsed.data });

  if (error) return { error: "Couldn't save the note. Please try again." };

  revalidatePath(`/patients/${patientId}/notes`);
  return {};
}

export async function deleteNoteAction(patientId: string, noteId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("practitioner_notes").delete().eq("id", noteId);
  if (error) return { error: "Couldn't delete the note." };

  revalidatePath(`/patients/${patientId}/notes`);
  return {};
}
