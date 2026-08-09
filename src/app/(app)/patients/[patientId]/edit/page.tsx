import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PatientForm } from "@/components/patients/patient-form";
import { getPatientDetail } from "@/lib/data/patients";
import { patientDetailToFormInput } from "@/lib/mappers/patient";

export const metadata: Metadata = { title: "Edit Patient" };

export default async function EditPatientPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const detail = await getPatientDetail(patientId);
  if (!detail) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Edit {detail.patient.first_name} {detail.patient.last_name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Update this patient&apos;s profile details.</p>
      </div>
      <PatientForm mode={{ kind: "edit", patientId }} defaultValues={patientDetailToFormInput(detail)} />
    </div>
  );
}
