"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { createAdjustedPlanDraft } from "@/lib/services/meal-plan-generation";

const instructionSchema = z.string().trim().min(5, "Describe the change you'd like").max(1000);

export type AdjustPlanActionResult = { error?: string; newPlanId?: string };

export async function requestAiAdjustmentAction(planId: string, instruction: string): Promise<AdjustPlanActionResult> {
  const parsed = instructionSchema.safeParse(instruction);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Please log in again." };

  const rate = checkRateLimit(`ai-adjustment:${user.id}`, { limit: 10, windowMs: 60 * 60_000 });
  if (!rate.allowed) return { error: "You've reached the AI generation limit for now. Please try again in a bit." };

  const result = await createAdjustedPlanDraft(planId, user.id, parsed.data);
  if (result.error) return { error: result.error };
  return { newPlanId: result.newPlanId };
}
