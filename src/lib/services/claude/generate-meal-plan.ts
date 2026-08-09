import "server-only";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getClaudeClient, CLAUDE_MODEL } from "./client";
import { aiMealPlanSchema, type AiMealPlanOutput, type GenerateMealPlanRequest } from "@/lib/validation/ai-meal-plan";

const SYSTEM_PROMPT = `You are a meal-planning assistant working for a registered dietitian. You propose foods, portions, and meal structure for a patient's meal plan — you do NOT calculate or state nutrition values (calories, protein, carbs, fat, fiber, sodium). A separate system looks up verified nutrition data for every ingredient you propose, so never include numbers for those.

Hard rules:
- NEVER include any ingredient that matches a listed allergy, even as a minor component (e.g. a sauce, garnish, or seasoning). Treat allergies as absolute constraints, not preferences.
- Respect every listed dietary restriction as a hard constraint (e.g. a vegetarian patient must never receive meat or fish).
- Respect excluded foods.
- Favor the patient's food preferences and cuisine preferences where reasonable.
- Keep ingredient descriptions short and specific, matching how a food would appear in a nutrition database (e.g. "boneless skinless chicken breast", "cooked brown rice", "raw baby spinach") rather than a recipe name or brand.
- Quantities must be realistic, single-serving-appropriate amounts with a common unit (g, oz, cup, tbsp, tsp, each, slice).
- Prep instructions should be concise and appropriate for the patient's cooking ability and available time.
- You are assisting a licensed practitioner who will review and edit everything before it reaches the patient. Do not present this plan as final or medically authoritative.
- Do not diagnose any condition or suggest medication changes.`;

function buildUserPrompt(request: GenerateMealPlanRequest): string {
  return `Generate a ${request.numberOfDays}-day meal plan with ${request.numberOfMeals} meals and ${request.numberOfSnacks} snacks per day.

Patient context (JSON):
${JSON.stringify(
  {
    dietaryPreferences: request.patientPreferences,
    allergies: request.allergies,
    excludedFoods: request.excludedFoods,
    dietaryRestrictions: request.dietaryRestrictions,
    calorieTarget: request.calorieTarget,
    proteinTargetG: request.proteinTarget,
    carbohydrateTargetG: request.carbohydrateTarget,
    fatTargetG: request.fatTarget,
    fiberTargetG: request.fiberTarget,
    sodiumTargetMg: request.sodiumTarget,
    cuisinePreferences: request.cuisinePreferences,
    foodsToPrioritize: request.foodsToPrioritize,
    maxPreparationTimeMinutes: request.preparationTime,
    budgetPreference: request.budgetPreference,
    mealVarietyPreference: request.varietyPreference,
    repeatingMealsAllowed: request.repeatingMealsAllowed,
  },
  null,
  2,
)}

Use the calorie/macro targets to guide portion sizes and food choices — a downstream system will calculate exact totals from verified nutrition data and may ask for adjustments afterward, so aim to be reasonably close rather than exact. If repeating meals is not allowed, avoid using the same meal name twice across the plan. Write practitionerNotes as a short (2-4 sentence) explanation of your overall approach for the reviewing dietitian.`;
}

export type GenerationResult =
  | { success: true; plan: AiMealPlanOutput; model: string }
  | { success: false; error: string };

const MAX_ATTEMPTS = 3;

/**
 * Calls Claude to propose a meal plan's structure (foods, portions, meal
 * names, prep instructions). Retries on invalid/incomplete structured
 * output. Never returns nutrition values — see aiMealPlanSchema.
 */
export async function generateMealPlanDraft(request: GenerateMealPlanRequest): Promise<GenerationResult> {
  const client = getClaudeClient();
  let lastError = "Unknown error";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const stream = client.messages.stream({
        model: CLAUDE_MODEL,
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(request) }],
        output_config: {
          format: zodOutputFormat(aiMealPlanSchema),
        },
      });

      const message = await stream.finalMessage();

      if (message.stop_reason === "refusal") {
        lastError = "The AI declined to generate this plan. Try adjusting the request.";
        continue;
      }

      if (!message.parsed_output) {
        lastError = "The AI response could not be parsed into a valid meal plan.";
        continue;
      }

      const parsed = aiMealPlanSchema.safeParse(message.parsed_output);
      if (!parsed.success) {
        lastError = "The AI response didn't match the expected structure.";
        continue;
      }

      if (parsed.data.days.length === 0) {
        lastError = "The AI returned an empty plan.";
        continue;
      }

      return { success: true, plan: parsed.data, model: CLAUDE_MODEL };
    } catch (error) {
      console.error(`Claude meal plan generation attempt ${attempt} failed`, error);
      lastError = "The AI service is temporarily unavailable.";
    }
  }

  return { success: false, error: lastError };
}
