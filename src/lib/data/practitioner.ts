import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type Practitioner = Database["public"]["Tables"]["practitioners"]["Row"];

/** Fetches the signed-in practitioner's profile row. Null if not authenticated. */
export async function getCurrentPractitioner(): Promise<Practitioner | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase.from("practitioners").select("*").eq("id", user.id).single();
  return data;
}
