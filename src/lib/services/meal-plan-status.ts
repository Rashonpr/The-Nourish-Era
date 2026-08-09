import type { MealPlanStatus } from "@/types/database";

/**
 * Valid meal-plan status transitions. Only an "approved" plan is considered
 * finalized — everything else is either a working draft or something a
 * practitioner explicitly archived.
 */
export const STATUS_TRANSITIONS: Record<MealPlanStatus, MealPlanStatus[]> = {
  draft: ["in_review", "archived"],
  ai_draft: ["in_review", "draft", "archived"],
  in_review: ["approved", "draft", "archived"],
  approved: ["archived", "in_review"],
  archived: ["draft"],
};

export function canTransitionMealPlanStatus(from: MealPlanStatus, to: MealPlanStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
