import "server-only";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getClaudeClient, CLAUDE_MODEL } from "./client";
import { aiMealPlanSchema, type AiMealPlanOutput } from "@/lib/validation/ai-meal-plan";

const SYSTEM_PROMPT = `You are assisting a registered dietitian by revising an existing meal plan per their instruction. You propose foods, portions, and structure only — never nutrition values (a separate verified database calculates those). A licensed practitioner reviews everything before it reaches the patient.

Hard rules:
- NEVER include any ingredient that matches a listed allergy.
- Respect every listed dietary restriction as a hard constraint.
- Respect excluded foods.
- Keep the same number of days and the same day numbering as the current plan unless the instruction explicitly asks to change the day count.
- Keep ingredient descriptions short and specific, matching how a food would appear in a nutrition database.
- Apply the practitioner's instruction as precisely as possible while keeping the rest of the plan reasonably intact — don't rewrite meals the instruction doesn't concern.
- Do not diagnose any condition or suggest medication changes.`;

export type CurrentPlanSummary = {
  days: {
    dayNumber: number;
    meals: {
      mealType: string;
      name: string;
      ingredients: { description: string; quantity: number; unit: string }[];
    }[];
  }[];
};

export type AdjustmentContext = {
  allergies: string[];
  dietaryRestrictions: string[];
  excludedFoods: string[];
  calorieTarget?: number;
  proteinTarget?: number;
  carbohydrateTarget?: number;
  fatTarget?: number;
  fiberTarget?: number;
  sodiumTarget?: number;
};

export type AdjustmentResult =
  | { success: true; plan: AiMealPlanOutput }
  | { success: false; error: string };

const MAX_ATTEMPTS = 3;

export async function reviseMealPlan(
  currentPlan: CurrentPlanSummary,
  instruction: string,
  context: AdjustmentContext,
): Promise<AdjustmentResult> {
  const client = getClaudeClient();

  const prompt = `Current plan (JSON):
${JSON.stringify(currentPlan, null, 2)}

Practitioner instruction: "${instruction}"

Patient context and targets (JSON):
${JSON.stringify(context, null, 2)}

Return the full revised plan — every day and every meal, including meals you didn't change. Write practitionerNotes as a short (2-4 sentence) explanation of what you changed and why.`;

  let lastError = "Unknown error";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const stream = client.messages.stream({
        model: CLAUDE_MODEL,
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
        output_config: { format: zodOutputFormat(aiMealPlanSchema) },
      });
      const message = await stream.finalMessage();

      if (message.stop_reason === "refusal") {
        lastError = "The AI declined to revise this plan. Try rephrasing the instruction.";
        continue;
      }
      if (!message.parsed_output) {
        lastError = "The AI response could not be parsed.";
        continue;
      }
      const parsed = aiMealPlanSchema.safeParse(message.parsed_output);
      if (!parsed.success || parsed.data.days.length === 0) {
        lastError = "The AI response didn't match the expected structure.";
        continue;
      }
      return { success: true, plan: parsed.data };
    } catch (error) {
      console.error(`Meal plan adjustment attempt ${attempt} failed`, error);
      lastError = "The AI service is temporarily unavailable.";
    }
  }

  return { success: false, error: lastError };
}
