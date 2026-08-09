import { describe, expect, it } from "vitest";
import { canTransitionMealPlanStatus } from "./meal-plan-status";

describe("canTransitionMealPlanStatus", () => {
  it("allows a draft to move to in_review or archived", () => {
    expect(canTransitionMealPlanStatus("draft", "in_review")).toBe(true);
    expect(canTransitionMealPlanStatus("draft", "archived")).toBe(true);
  });

  it("only allows approval from in_review, not directly from draft", () => {
    expect(canTransitionMealPlanStatus("in_review", "approved")).toBe(true);
    expect(canTransitionMealPlanStatus("draft", "approved")).toBe(false);
    expect(canTransitionMealPlanStatus("ai_draft", "approved")).toBe(false);
  });

  it("allows an ai_draft to be converted to a manual draft for editing", () => {
    expect(canTransitionMealPlanStatus("ai_draft", "draft")).toBe(true);
  });

  it("allows restoring an archived plan only back to draft", () => {
    expect(canTransitionMealPlanStatus("archived", "draft")).toBe(true);
    expect(canTransitionMealPlanStatus("archived", "approved")).toBe(false);
    expect(canTransitionMealPlanStatus("archived", "in_review")).toBe(false);
  });

  it("allows reopening an approved plan for review but not back to raw draft", () => {
    expect(canTransitionMealPlanStatus("approved", "in_review")).toBe(true);
    expect(canTransitionMealPlanStatus("approved", "draft")).toBe(false);
  });
});
