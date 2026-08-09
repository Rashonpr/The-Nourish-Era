import type { Metadata } from "next";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Users, CalendarCheck, AlertCircle, Plus, UserPlus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PlanStatusBadge } from "@/components/meal-plans/plan-status-badge";
import { getCurrentPractitioner } from "@/lib/data/practitioner";
import { getDashboardStats } from "@/lib/data/dashboard";
import type { MealPlanStatus } from "@/types/database";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner) redirect("/login");

  const stats = await getDashboardStats(practitioner.id);
  const firstName = practitioner.full_name.split(" ")[0];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Welcome back, {firstName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Here&apos;s what&apos;s happening with your patients.</p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="outline" nativeButton={false} render={<Link href="/patients/new" />}>
            <UserPlus />
            Add Patient
          </Button>
          <Button nativeButton={false} render={<Link href="/meal-plans" />}>
            <Plus />
            Create Meal Plan
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active patients" value={stats.activePatientCount} icon={Users} />
        <StatCard label="Meal plans this month" value={stats.plansCreatedThisMonth} icon={CalendarCheck} />
        <StatCard
          label="Patients needing follow-up"
          value={stats.patientsNeedingFollowUp}
          icon={AlertCircle}
          tone={stats.patientsNeedingFollowUp > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recently edited patients</CardTitle>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/patients" />}>
              View all
              <ChevronRight />
            </Button>
          </CardHeader>
          <CardContent>
            {stats.recentPatients.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No patients yet"
                description="Add your first patient to start building nutrition plans."
                action={
                  <Button size="sm" nativeButton={false} render={<Link href="/patients/new" />}>
                    <UserPlus />
                    Add Patient
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {stats.recentPatients.map((patient) => (
                  <li key={patient.id}>
                    <Link
                      href={`/patients/${patient.id}`}
                      className="flex items-center justify-between py-3 text-sm hover:text-primary"
                    >
                      <span className="font-medium text-foreground">
                        {patient.firstName} {patient.lastName}
                      </span>
                      <span className="text-muted-foreground">
                        {formatDistanceToNow(new Date(patient.updatedAt), { addSuffix: true })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent meal plans</CardTitle>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/meal-plans" />}>
              View all
              <ChevronRight />
            </Button>
          </CardHeader>
          <CardContent>
            {stats.recentPlans.length === 0 ? (
              <EmptyState
                icon={CalendarCheck}
                title="No meal plans yet"
                description="Create a plan once you've added a patient and set their nutrition targets."
              />
            ) : (
              <ul className="divide-y divide-border">
                {stats.recentPlans.map((plan) => (
                  <li key={plan.id}>
                    <Link
                      href={`/meal-plans/${plan.id}`}
                      className="flex items-center justify-between gap-3 py-3 text-sm hover:text-primary"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground">{plan.name}</span>
                        <span className="text-muted-foreground">{plan.patientName}</span>
                      </span>
                      <PlanStatusBadge status={plan.status as MealPlanStatus} className="shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
