import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type TemplateRow = Database["public"]["Tables"]["templates"]["Row"];

export async function listTemplates(practitionerId: string): Promise<TemplateRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("practitioner_id", practitionerId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
