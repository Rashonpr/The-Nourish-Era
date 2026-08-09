import "server-only";
import { getClaudeClient, CLAUDE_MODEL } from "./client";

export type ProgressDataPoint = {
  date: string;
  weightKg?: number | null;
  adherencePct?: number | null;
  hungerRating?: number | null;
  energyRating?: number | null;
};

export type SummarizeProgressResult = { success: true; summary: string } | { success: false; error: string };

/**
 * Summarizes quantitative progress trends only — no free-text notes are
 * sent, to keep PHI exposure to the minimum needed for the summary. The
 * result is always framed as an observation for the practitioner to
 * confirm, never a diagnosis or clinical conclusion.
 */
export async function summarizeProgressTrends(dataPoints: ProgressDataPoint[]): Promise<SummarizeProgressResult> {
  if (dataPoints.length < 2) {
    return { success: false, error: "At least two entries are needed to summarize a trend." };
  }

  const client = getClaudeClient();

  const prompt = `Progress data points, oldest first (JSON):
${JSON.stringify(dataPoints, null, 2)}

Summarize the trend in 3-5 short sentences: direction of weight change, consistency of adherence, and any notable pattern in hunger/energy ratings. Do not diagnose anything or suggest a cause. Frame every statement as an observation for the practitioner to review, not a conclusion.`;

  try {
    const message = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 500,
      system:
        "You summarize a patient's nutrition-progress data for a registered dietitian. You never diagnose, never suggest a medical cause, and never recommend changing medications. Keep the summary factual and framed as observations to be reviewed, not conclusions.",
      messages: [{ role: "user", content: prompt }],
    });

    if (message.stop_reason === "refusal") {
      return { success: false, error: "The AI declined to summarize this data." };
    }

    const text = message.content.find((block) => block.type === "text")?.text;
    if (!text) return { success: false, error: "The AI didn't return a summary." };

    return { success: true, summary: text };
  } catch (error) {
    console.error("Progress summary generation failed", error);
    return { success: false, error: "The AI service is temporarily unavailable." };
  }
}
