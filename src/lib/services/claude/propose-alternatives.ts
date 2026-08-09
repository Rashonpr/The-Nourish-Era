import "server-only";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getClaudeClient, CLAUDE_MODEL } from "./client";
import {
  alternativeIngredientsResponseSchema,
  alternativeMealsResponseSchema,
  type AlternativeIngredient,
  type AlternativeMeal,
  type SubstitutionReason,
} from "@/lib/validation/ai-substitution";

const BASE_SYSTEM_PROMPT = `You are assisting a registered dietitian by proposing food substitutions. You suggest foods, portions, and structure only — never nutrition values (a separate verified database calculates those). A licensed practitioner reviews and chooses among your proposals before anything is applied.

Hard rules:
- NEVER propose an ingredient that matches a listed allergy, even as a minor component.
- Respect every listed dietary restriction as a hard constraint.
- Respect excluded/disliked foods unless the reason for the request is specifically to replace one of them.
- Keep ingredient descriptions short and specific, matching how a food would appear in a nutrition database.
- Give a one-sentence rationale for each alternative you propose.`;

type PatientContext = {
  allergies: string[];
  dietaryRestrictions: string[];
  excludedFoods: string[];
};

function reasonInstruction(reason: SubstitutionReason, customInstruction?: string): string {
  switch (reason) {
    case "dislikes":
      return "The patient dislikes the current item. Propose alternatives with a similar nutritional role.";
    case "too_expensive":
      return "The current item is too expensive. Propose more budget-friendly alternatives with a similar nutritional role.";
    case "allergy":
      return "The current item conflicts with an allergy. Propose safe alternatives with a similar nutritional role.";
    case "dietary_preference":
      return "The current item doesn't fit the patient's dietary preference. Propose alternatives that do.";
    case "increase_protein":
      return "Propose alternatives with meaningfully higher protein content for a similar role in the meal.";
    case "reduce_carbs":
      return "Propose alternatives with meaningfully lower carbohydrate content for a similar role in the meal.";
    case "reduce_sodium":
      return "Propose alternatives with meaningfully lower sodium content for a similar role in the meal.";
    case "reduce_calories":
      return "Propose lower-calorie alternatives for a similar role in the meal.";
    case "increase_calories":
      return "Propose higher-calorie alternatives for a similar role in the meal.";
    case "faster_prep":
      return "Propose alternatives that are faster or simpler to prepare.";
    case "custom":
      return customInstruction || "Propose reasonable alternatives.";
  }
}

export type AlternativesResult<T> = { success: true; alternatives: T[] } | { success: false; error: string };

export async function proposeIngredientAlternatives(
  currentDescription: string,
  currentQuantity: number,
  currentUnit: string,
  reason: SubstitutionReason,
  customInstruction: string | undefined,
  patient: PatientContext,
): Promise<AlternativesResult<AlternativeIngredient>> {
  const client = getClaudeClient();

  const prompt = `Current ingredient: "${currentDescription}" (${currentQuantity} ${currentUnit})

Reason for substitution: ${reasonInstruction(reason, customInstruction)}

Patient context (JSON):
${JSON.stringify(patient, null, 2)}

Propose exactly 3 distinct alternative ingredients, each with a suggested quantity and unit sized to serve a similar role in the meal as the original.`;

  try {
    const stream = client.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      system: BASE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
      output_config: { format: zodOutputFormat(alternativeIngredientsResponseSchema) },
    });
    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal" || !message.parsed_output) {
      return { success: false, error: "The AI couldn't generate alternatives for this ingredient." };
    }
    return { success: true, alternatives: message.parsed_output.alternatives.slice(0, 3) };
  } catch (error) {
    console.error("Ingredient alternative generation failed", error);
    return { success: false, error: "The AI service is temporarily unavailable." };
  }
}

export async function proposeMealAlternatives(
  currentMeal: { name: string; ingredients: { description: string; quantity: number; unit: string }[] },
  reason: SubstitutionReason,
  customInstruction: string | undefined,
  patient: PatientContext,
): Promise<AlternativesResult<AlternativeMeal>> {
  const client = getClaudeClient();

  const prompt = `Current meal: ${JSON.stringify(currentMeal, null, 2)}

Reason for replacement: ${reasonInstruction(reason, customInstruction)}

Patient context (JSON):
${JSON.stringify(patient, null, 2)}

Propose exactly 3 distinct whole-meal alternatives that could replace this meal.`;

  try {
    const stream = client.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      system: BASE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
      output_config: { format: zodOutputFormat(alternativeMealsResponseSchema) },
    });
    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal" || !message.parsed_output) {
      return { success: false, error: "The AI couldn't generate alternatives for this meal." };
    }
    return { success: true, alternatives: message.parsed_output.alternatives.slice(0, 3) };
  } catch (error) {
    console.error("Meal alternative generation failed", error);
    return { success: false, error: "The AI service is temporarily unavailable." };
  }
}
