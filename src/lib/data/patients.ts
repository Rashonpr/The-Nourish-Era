import { createClient } from "@/lib/supabase/server";
import type { Database, PatientStatus } from "@/types/database";

export type PatientRow = Database["public"]["Tables"]["patients"]["Row"];
export type PatientListItem = PatientRow & {
  allergyCount: number;
  topAllergens: string[];
};

export async function listPatients(
  practitionerId: string,
  opts: { status?: PatientStatus; search?: string } = {},
): Promise<PatientListItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("patients")
    .select("*, patient_allergies(allergen)")
    .eq("practitioner_id", practitionerId)
    .order("updated_at", { ascending: false });

  if (opts.status) {
    query = query.eq("status", opts.status);
  }
  if (opts.search) {
    // Escape PostgREST filter-syntax characters (comma/parens separate
    // clauses in .or()) so a search term can't alter the query structure.
    // RLS already scopes every query to this practitioner's own rows, so
    // this only prevents odd-shaped filters, not cross-tenant access —
    // still worth doing properly rather than trusting that backstop.
    const escaped = opts.search.replace(/[,()]/g, "").trim();
    if (escaped) {
      query = query.or(`first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%`);
    }
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => {
    const { patient_allergies, ...patient } = row as unknown as PatientRow & {
      patient_allergies: { allergen: string }[];
    };
    return {
      ...patient,
      allergyCount: patient_allergies.length,
      topAllergens: patient_allergies.slice(0, 3).map((a) => a.allergen),
    };
  });
}

export type PatientDetail = {
  patient: PatientRow;
  allergies: Database["public"]["Tables"]["patient_allergies"]["Row"][];
  dietaryPreferences: Database["public"]["Tables"]["patient_dietary_preferences"]["Row"][];
  foodPreferences: Database["public"]["Tables"]["patient_food_preferences"]["Row"][];
  lifestyle: Database["public"]["Tables"]["patient_lifestyle"]["Row"] | null;
  conditions: Database["public"]["Tables"]["patient_conditions"]["Row"][];
  medicationsNotes: string | null;
  activeNutritionTarget: Database["public"]["Tables"]["nutrition_targets"]["Row"] | null;
};

export async function getPatientDetail(patientId: string): Promise<PatientDetail | null> {
  const supabase = await createClient();

  const { data: patient, error } = await supabase.from("patients").select("*").eq("id", patientId).single();
  if (error || !patient) return null;

  const [allergiesRes, dietaryRes, foodRes, lifestyleRes, conditionsRes, medicationsRes, targetRes] =
    await Promise.all([
      supabase.from("patient_allergies").select("*").eq("patient_id", patientId).order("created_at"),
      supabase.from("patient_dietary_preferences").select("*").eq("patient_id", patientId).order("created_at"),
      supabase.from("patient_food_preferences").select("*").eq("patient_id", patientId).order("created_at"),
      supabase.from("patient_lifestyle").select("*").eq("patient_id", patientId).maybeSingle(),
      supabase.from("patient_conditions").select("*").eq("patient_id", patientId).order("created_at"),
      supabase
        .from("patient_medications")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("nutrition_targets").select("*").eq("patient_id", patientId).eq("is_active", true).maybeSingle(),
    ]);

  return {
    patient,
    allergies: allergiesRes.data ?? [],
    dietaryPreferences: dietaryRes.data ?? [],
    foodPreferences: foodRes.data ?? [],
    lifestyle: lifestyleRes.data ?? null,
    conditions: conditionsRes.data ?? [],
    medicationsNotes: medicationsRes.data?.notes ?? null,
    activeNutritionTarget: targetRes.data ?? null,
  };
}
