import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PatientStatusButton } from "@/components/patients/patient-status-button";
import { calculateAge } from "@/lib/utils/date";
import type { PatientRow } from "@/lib/data/patients";

const SEX_LABELS: Record<string, string> = {
  female: "Female",
  male: "Male",
  other: "Other",
  unspecified: "",
};

export function PatientHeader({ patient }: { patient: PatientRow }) {
  const age = calculateAge(patient.date_of_birth);
  const sexLabel = patient.sex ? SEX_LABELS[patient.sex] : "";
  const metaParts = [age ? `${age} yrs` : null, sexLabel || null].filter(Boolean);

  return (
    <div className="space-y-4">
      <Link href="/patients" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Patients
      </Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            {patient.first_name} {patient.last_name}
          </h1>
          {patient.status === "archived" && <Badge variant="secondary">Archived</Badge>}
          {metaParts.length > 0 && <span className="text-sm text-muted-foreground">{metaParts.join(" · ")}</span>}
        </div>
        <div className="flex gap-2.5">
          <Button variant="outline" nativeButton={false} render={<Link href={`/patients/${patient.id}/edit`} />}>
            <Pencil />
            Edit
          </Button>
          <PatientStatusButton patientId={patient.id} status={patient.status} />
        </div>
      </div>
    </div>
  );
}
