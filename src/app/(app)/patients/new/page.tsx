import type { Metadata } from "next";
import { PatientForm } from "@/components/patients/patient-form";

export const metadata: Metadata = { title: "Add Patient" };

export default function NewPatientPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Add patient</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Capture the details that shape this patient&apos;s nutrition plan. Everything here can be edited later.
        </p>
      </div>
      <PatientForm mode={{ kind: "create" }} />
    </div>
  );
}
