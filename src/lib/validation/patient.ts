import { z } from "zod";

const optionalTrimmedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const allergyInputSchema = z.object({
  allergen: z.string().trim().min(1).max(120),
  isCustom: z.boolean(),
  severity: z.enum(["mild", "moderate", "severe", "unspecified"]),
});
export type AllergyInput = z.infer<typeof allergyInputSchema>;

export const patientFormSchema = z.object({
  // Basic information
  firstName: z.string().trim().min(1, "First name is required").max(120),
  lastName: z.string().trim().min(1, "Last name is required").max(120),
  dateOfBirth: z.string().optional().or(z.literal("")),
  sex: z.enum(["female", "male", "other", "unspecified"]).optional(),
  preferredUnits: z.enum(["imperial", "metric"]),
  heightCm: z.coerce.number().positive().max(300).optional(),
  currentWeightKg: z.coerce.number().positive().max(500).optional(),
  goalWeightKg: z.coerce.number().positive().max(500).optional(),
  activityLevel: z
    .enum(["sedentary", "lightly_active", "moderately_active", "very_active", "extra_active"])
    .optional(),

  // Primary goal
  primaryGoal: z.string().trim().max(120).optional().or(z.literal("")),
  primaryGoalCustom: optionalTrimmedString(200),

  // Dietary preferences (each entry is either a known option or a custom one)
  dietaryPreferences: z.array(z.string().trim().min(1).max(120)),

  // Allergies
  allergies: z.array(allergyInputSchema),

  // Food preferences
  favoriteFoods: z.array(z.string().trim().min(1).max(120)),
  dislikedFoods: z.array(z.string().trim().min(1).max(120)),
  refusedFoods: z.array(z.string().trim().min(1).max(120)),

  // Lifestyle
  mealsPerDay: z.coerce.number().int().min(0).max(10).optional(),
  snacksPerDay: z.coerce.number().int().min(0).max(10).optional(),
  cookingAbility: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  prepTimeMinutes: z.coerce.number().int().min(0).max(600).optional(),
  budgetLevel: z.enum(["low", "moderate", "high"]).optional(),
  eatingOutFrequency: optionalTrimmedString(120),
  workScheduleNotes: optionalTrimmedString(500),
  exerciseFrequency: optionalTrimmedString(120),
  exerciseType: optionalTrimmedString(200),

  // Clinical considerations
  conditions: z.array(z.string().trim().min(1).max(160)),

  // Medications / supplements
  medicationsNotes: optionalTrimmedString(2000),
});
export type PatientFormInput = z.infer<typeof patientFormSchema>;
