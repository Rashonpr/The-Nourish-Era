import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PatientHeader } from "@/components/patients/patient-header";
import { PatientProfileTabs } from "@/components/patients/patient-profile-tabs";

export default async function PatientProfileLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;
  const supabase = await createClient();
  const { data: patient } = await supabase.from("patients").select("*").eq("id", patientId).single();

  if (!patient) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PatientHeader patient={patient} />
      <PatientProfileTabs patientId={patientId} />
      <div className="pb-8">{children}</div>
    </div>
  );
}
