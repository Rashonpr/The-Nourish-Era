"use server";

import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { summarizeProgressTrends } from "@/lib/services/claude/summarize-progress";

export async function summarizeProgressAction(patientId: string): Promise<{ error?: string; summary?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Please log in again." };

  const rate = checkRateLimit(`ai-progress-summary:${user.id}`, { limit: 20, windowMs: 60 * 60_000 });
  if (!rate.allowed) return { error: "You've reached the AI generation limit for now. Please try again in a bit." };

  const { data: entries } = await supabase
    .from("progress_entries")
    .select("entry_date, weight_kg, adherence_pct, hunger_rating, energy_rating")
    .eq("patient_id", patientId)
    .order("entry_date");

  if (!entries || entries.length < 2) {
    return { error: "At least two entries are needed to summarize a trend." };
  }

  const result = await summarizeProgressTrends(
    entries.map((e) => ({
      date: e.entry_date,
      weightKg: e.weight_kg,
      adherencePct: e.adherence_pct,
      hungerRating: e.hunger_rating,
      energyRating: e.energy_rating,
    })),
  );

  if (!result.success) return { error: result.error };
  return { summary: result.summary };
}
