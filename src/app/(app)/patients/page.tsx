import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UserPlus, Users, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { PatientsFilterBar } from "@/components/patients/patients-filter-bar";
import { PatientsTable } from "@/components/patients/patients-table";
import { getCurrentPractitioner } from "@/lib/data/practitioner";
import { listPatients } from "@/lib/data/patients";
import type { PatientStatus } from "@/types/database";

export const metadata: Metadata = { title: "Patients" };

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner) redirect("/login");

  const params = await searchParams;
  const status: PatientStatus = params.status === "archived" ? "archived" : "active";
  const search = params.q?.trim();

  const patients = await listPatients(practitioner.id, { status, search });
  const hasFilters = Boolean(search);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Patients</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your patient roster and their nutrition plans.</p>
        </div>
        <Button render={<Link href="/patients/new" />}>
          <UserPlus />
          Add Patient
        </Button>
      </div>

      <PatientsFilterBar />

      {patients.length === 0 ? (
        hasFilters ? (
          <EmptyState icon={SearchX} title="No matching patients" description="Try a different search term." />
        ) : status === "archived" ? (
          <EmptyState icon={Users} title="No archived patients" description="Patients you archive will show up here." />
        ) : (
          <EmptyState
            icon={Users}
            title="No patients yet"
            description="Add your first patient to start building personalized nutrition plans."
            action={
              <Button render={<Link href="/patients/new" />}>
                <UserPlus />
                Add Patient
              </Button>
            }
          />
        )
      ) : (
        <PatientsTable patients={patients} />
      )}
    </div>
  );
}
