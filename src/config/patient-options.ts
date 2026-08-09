export const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentary (little or no exercise)" },
  { value: "lightly_active", label: "Lightly active (1-3 days/week)" },
  { value: "moderately_active", label: "Moderately active (3-5 days/week)" },
  { value: "very_active", label: "Very active (6-7 days/week)" },
  { value: "extra_active", label: "Extra active (physical job or 2x/day training)" },
] as const;

export const PRIMARY_GOALS = [
  "Weight loss",
  "Weight gain",
  "Weight maintenance",
  "Muscle gain",
  "Improved athletic performance",
  "General healthy eating",
  "Blood sugar management",
  "Heart healthy eating",
  "Other",
] as const;

export const DIETARY_PREFERENCE_OPTIONS = [
  "No preference",
  "Vegetarian",
  "Vegan",
  "Pescatarian",
  "Mediterranean",
  "Low carbohydrate",
  "High protein",
  "Gluten free",
  "Dairy free",
] as const;

export const COMMON_ALLERGENS = [
  "Peanuts",
  "Tree nuts",
  "Shellfish",
  "Fish",
  "Milk",
  "Eggs",
  "Soy",
  "Wheat",
] as const;

export const ALLERGY_SEVERITIES = [
  { value: "unspecified", label: "Unspecified" },
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderate" },
  { value: "severe", label: "Severe" },
] as const;

export const COOKING_ABILITIES = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
] as const;

export const BUDGET_LEVELS = [
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
] as const;

export const CLINICAL_CONDITION_OPTIONS = [
  "Diabetes",
  "Prediabetes",
  "Hypertension",
  "Hyperlipidemia",
  "Kidney-related dietary considerations",
  "Gastrointestinal considerations",
  "Pregnancy-related considerations",
  "Sports nutrition considerations",
] as const;

export const SEX_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
  { value: "unspecified", label: "Prefer not to say" },
] as const;
