import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProgressPanel } from "@/components/patients/progress-panel";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Progress" };

export default async function PatientProgressPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const supabase = await createClient();

  const [{ data: patient }, { data: entries }] = await Promise.all([
    supabase.from("patients").select("preferred_units").eq("id", patientId).single(),
    supabase.from("progress_entries").select("*").eq("patient_id", patientId).order("entry_date", { ascending: false }),
  ]);

  if (!patient) notFound();

  return <ProgressPanel patientId={patientId} entries={entries ?? []} preferredUnits={patient.preferred_units} />;
}
