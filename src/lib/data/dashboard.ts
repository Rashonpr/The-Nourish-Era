import { createClient } from "@/lib/supabase/server";

export type DashboardStats = {
  activePatientCount: number;
  plansCreatedThisMonth: number;
  patientsNeedingFollowUp: number;
  recentPatients: { id: string; firstName: string; lastName: string; updatedAt: string }[];
  recentPlans: { id: string; name: string; status: string; patientName: string; updatedAt: string }[];
};

const FOLLOW_UP_WINDOW_DAYS = 30;

/**
 * Aggregates dashboard stats from live tables (RLS already scopes every
 * query to the signed-in practitioner). Returns zeroed/empty results for a
 * brand-new account — the dashboard renders its own empty states for that.
 */
export async function getDashboardStats(practitionerId: string): Promise<DashboardStats> {
  const supabase = await createClient();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const followUpCutoff = new Date();
  followUpCutoff.setDate(followUpCutoff.getDate() - FOLLOW_UP_WINDOW_DAYS);

  const [activePatientsRes, plansThisMonthRes, recentPatientsRes, recentPlansRes, allActivePatientsRes] =
    await Promise.all([
      supabase
        .from("patients")
        .select("id", { count: "exact", head: true })
        .eq("practitioner_id", practitionerId)
        .eq("status", "active"),
      supabase
        .from("meal_plans")
        .select("id", { count: "exact", head: true })
        .eq("practitioner_id", practitionerId)
        .gte("created_at", startOfMonth.toISOString()),
      supabase
        .from("patients")
        .select("id, first_name, last_name, updated_at")
        .eq("practitioner_id", practitionerId)
        .order("updated_at", { ascending: false })
        .limit(5),
      supabase
        .from("meal_plans")
        .select("id, name, status, updated_at, patients(first_name, last_name)")
        .eq("practitioner_id", practitionerId)
        .order("updated_at", { ascending: false })
        .limit(5),
      supabase
        .from("patients")
        .select("id, meal_plans(created_at)")
        .eq("practitioner_id", practitionerId)
        .eq("status", "active"),
    ]);

  const patientsNeedingFollowUp = (allActivePatientsRes.data ?? []).filter((patient) => {
    const plans = (patient as unknown as { meal_plans: { created_at: string }[] }).meal_plans ?? [];
    if (plans.length === 0) return true;
    const mostRecent = plans.reduce((latest, plan) => (plan.created_at > latest ? plan.created_at : latest), plans[0].created_at);
    return new Date(mostRecent) < followUpCutoff;
  }).length;

  return {
    activePatientCount: activePatientsRes.count ?? 0,
    plansCreatedThisMonth: plansThisMonthRes.count ?? 0,
    patientsNeedingFollowUp,
    recentPatients: (recentPatientsRes.data ?? []).map((p) => ({
      id: p.id,
      firstName: p.first_name,
      lastName: p.last_name,
      updatedAt: p.updated_at,
    })),
    recentPlans: (recentPlansRes.data ?? []).map((p) => {
      const patient = (p as unknown as { patients: { first_name: string; last_name: string } | null }).patients;
      return {
        id: p.id,
        name: p.name,
        status: p.status,
        patientName: patient ? `${patient.first_name} ${patient.last_name}` : "Unknown patient",
        updatedAt: p.updated_at,
      };
    }),
  };
}
