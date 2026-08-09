import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AllergyBadges } from "@/components/patients/allergy-badges";
import { calculateAge } from "@/lib/utils/date";
import type { PatientListItem } from "@/lib/data/patients";

const GOAL_LABELS: Record<string, string> = {};

function formatGoal(patient: PatientListItem) {
  if (patient.primary_goal === "Other" && patient.primary_goal_custom) return patient.primary_goal_custom;
  return patient.primary_goal ?? GOAL_LABELS[patient.primary_goal ?? ""] ?? "—";
}

export function PatientsTable({ patients }: { patients: PatientListItem[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
            <TableHead>Age</TableHead>
            <TableHead>Primary goal</TableHead>
            <TableHead>Allergies</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.map((patient) => {
            const age = calculateAge(patient.date_of_birth);
            return (
              <TableRow key={patient.id} className="cursor-pointer">
                <TableCell>
                  <Link href={`/patients/${patient.id}`} className="font-medium text-foreground hover:text-primary">
                    {patient.first_name} {patient.last_name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{age ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{formatGoal(patient)}</TableCell>
                <TableCell>
                  <AllergyBadges allergens={patient.topAllergens} overflowCount={Math.max(0, patient.allergyCount - 3)} size="sm" />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
