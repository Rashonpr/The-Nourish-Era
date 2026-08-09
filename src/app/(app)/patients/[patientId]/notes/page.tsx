import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { NotesPanel } from "@/components/patients/notes-panel";

export const metadata: Metadata = { title: "Notes" };

export default async function PatientNotesPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const supabase = await createClient();
  const { data: notes } = await supabase
    .from("practitioner_notes")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl">
      <NotesPanel patientId={patientId} initialNotes={notes ?? []} />
    </div>
  );
}
