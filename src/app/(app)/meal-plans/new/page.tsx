import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { NewMealPlanForm } from "@/components/meal-plans/new-meal-plan-form";
import { getCurrentPractitioner } from "@/lib/data/practitioner";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Create Meal Plan" };

export default async function NewMealPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string }>;
}) {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner) redirect("/login");

  const { patientId } = await searchParams;
  const supabase = await createClient();
  const { data: patients } = await supabase
    .from("patients")
    .select("id, first_name, last_name")
    .eq("practitioner_id", practitioner.id)
    .eq("status", "active")
    .order("first_name");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Create meal plan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a patient and basic settings — you&apos;ll build out meals on the next screen.
        </p>
      </div>

      {!patients || patients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Add a patient first"
          description="You need at least one active patient before you can create a meal plan."
          action={
            <Button nativeButton={false} render={<Link href="/patients/new" />}>Add Patient</Button>
          }
        />
      ) : (
        <NewMealPlanForm patients={patients} defaultPatientId={patientId} />
      )}
    </div>
  );
}
