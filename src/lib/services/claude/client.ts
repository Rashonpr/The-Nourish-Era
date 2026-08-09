import "server-only";
import Anthropic from "@anthropic-ai/sdk";

let cachedClient: Anthropic | null = null;

/** Server-only Claude client. Never import this file from client code. */
export function getClaudeClient(): Anthropic {
  if (!cachedClient) {
    cachedClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return cachedClient;
}

export const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";
