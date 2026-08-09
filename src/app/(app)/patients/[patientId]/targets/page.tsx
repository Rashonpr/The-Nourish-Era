import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NutritionTargetsForm } from "@/components/patients/nutrition-targets-form";
import { getPatientDetail } from "@/lib/data/patients";
import { calculateAge } from "@/lib/utils/date";

export const metadata: Metadata = { title: "Nutrition Targets" };

export default async function PatientTargetsPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const detail = await getPatientDetail(patientId);
  if (!detail) notFound();

  const { patient, activeNutritionTarget } = detail;
  const age = calculateAge(patient.date_of_birth) ?? undefined;

  return (
    <div className="mx-auto max-w-3xl">
      <NutritionTargetsForm
        patientId={patientId}
        currentTarget={activeNutritionTarget}
        calculatorDefaults={{
          weightKg: patient.current_weight_kg ?? undefined,
          heightCm: patient.height_cm ?? undefined,
          age,
          sex: patient.sex === "male" || patient.sex === "female" ? patient.sex : undefined,
          activityLevel: patient.activity_level ?? undefined,
        }}
      />
    </div>
  );
}
