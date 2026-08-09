"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SeedDataResult = { error?: string; success?: boolean };

/**
 * Creates fictional sample data (three patients with distinct goals/
 * restrictions/allergies, two sample meal plans) scoped to the current
 * practitioner — for exploring the app in development. All data is
 * clearly labeled as fictional in the patient names/notes.
 */
export async function loadSampleDataAction(): Promise<SeedDataResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Please log in again." };

  try {
    // ── Patient 1: weight loss, vegetarian, peanut allergy ──────────────
    const { data: p1 } = await supabase
      .from("patients")
      .insert({
        practitioner_id: user.id,
        first_name: "Alex",
        last_name: "Rivera (Sample)",
        date_of_birth: "1990-04-12",
        sex: "female",
        height_cm: 165,
        current_weight_kg: 78,
        goal_weight_kg: 68,
        preferred_units: "imperial",
        activity_level: "lightly_active",
        primary_goal: "Weight loss",
        status: "active",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (p1) {
      await Promise.all([
        supabase.from("patient_allergies").insert({ patient_id: p1.id, allergen: "Peanuts", is_custom: false, severity: "severe" }),
        supabase.from("patient_dietary_preferences").insert({ patient_id: p1.id, preference: "Vegetarian", is_custom: false }),
        supabase.from("patient_food_preferences").insert([
          { patient_id: p1.id, category: "favorite", food_name: "Lentils" },
          { patient_id: p1.id, category: "dislike", food_name: "Mushrooms" },
        ]),
        supabase.from("patient_lifestyle").insert({
          patient_id: p1.id,
          meals_per_day: 3,
          snacks_per_day: 1,
          cooking_ability: "intermediate",
          prep_time_minutes: 30,
          budget_level: "moderate",
          exercise_frequency: "3x/week",
          exercise_type: "Walking, yoga",
        }),
        supabase.from("nutrition_targets").insert({
          patient_id: p1.id,
          calories: 1700,
          protein_g: 110,
          carbs_g: 170,
          fat_g: 57,
          fiber_g: 28,
          sodium_mg: 2000,
          calc_method: "mifflin_st_jeor",
          is_active: true,
          created_by: user.id,
        }),
      ]);
    }

    // ── Patient 2: muscle gain, high protein, shellfish allergy ─────────
    const { data: p2 } = await supabase
      .from("patients")
      .insert({
        practitioner_id: user.id,
        first_name: "Jordan",
        last_name: "Kim (Sample)",
        date_of_birth: "1996-09-03",
        sex: "male",
        height_cm: 180,
        current_weight_kg: 75,
        goal_weight_kg: 82,
        preferred_units: "imperial",
        activity_level: "very_active",
        primary_goal: "Muscle gain",
        status: "active",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (p2) {
      await Promise.all([
        supabase.from("patient_allergies").insert({ patient_id: p2.id, allergen: "Shellfish", is_custom: false, severity: "moderate" }),
        supabase.from("patient_dietary_preferences").insert({ patient_id: p2.id, preference: "High protein", is_custom: false }),
        supabase.from("patient_lifestyle").insert({
          patient_id: p2.id,
          meals_per_day: 4,
          snacks_per_day: 2,
          cooking_ability: "advanced",
          prep_time_minutes: 45,
          budget_level: "high",
          exercise_frequency: "6x/week",
          exercise_type: "Strength training",
        }),
        supabase.from("nutrition_targets").insert({
          patient_id: p2.id,
          calories: 3000,
          protein_g: 180,
          carbs_g: 340,
          fat_g: 80,
          fiber_g: 35,
          sodium_mg: 2300,
          calc_method: "mifflin_st_jeor",
          is_active: true,
          created_by: user.id,
        }),
      ]);
    }

    // ── Patient 3: blood sugar management, gluten free, dairy allergy ──
    const { data: p3 } = await supabase
      .from("patients")
      .insert({
        practitioner_id: user.id,
        first_name: "Morgan",
        last_name: "Chen (Sample)",
        date_of_birth: "1965-01-22",
        sex: "other",
        height_cm: 170,
        current_weight_kg: 84,
        preferred_units: "imperial",
        activity_level: "sedentary",
        primary_goal: "Blood sugar management",
        status: "active",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (p3) {
      await Promise.all([
        supabase.from("patient_allergies").insert({ patient_id: p3.id, allergen: "Milk", is_custom: false, severity: "mild" }),
        supabase.from("patient_dietary_preferences").insert({ patient_id: p3.id, preference: "Gluten free", is_custom: false }),
        supabase.from("patient_conditions").insert({ patient_id: p3.id, condition: "Prediabetes", is_custom: false }),
        supabase.from("patient_lifestyle").insert({
          patient_id: p3.id,
          meals_per_day: 3,
          snacks_per_day: 1,
          cooking_ability: "beginner",
          prep_time_minutes: 20,
          budget_level: "low",
          exercise_frequency: "1x/week",
          exercise_type: "Walking",
        }),
        supabase.from("nutrition_targets").insert({
          patient_id: p3.id,
          calories: 1900,
          protein_g: 95,
          carbs_g: 190,
          fat_g: 63,
          fiber_g: 30,
          sodium_mg: 1800,
          added_sugar_g: 25,
          calc_method: "mifflin_st_jeor",
          is_active: true,
          created_by: user.id,
        }),
      ]);

      // Sample plan for Morgan: draft, manual entries with pre-set nutrition
      // (no live USDA lookups needed for seed data).
      const { data: plan } = await supabase
        .from("meal_plans")
        .insert({
          patient_id: p3.id,
          practitioner_id: user.id,
          name: "Sample 3-Day Starter Plan (fictional)",
          status: "draft",
          source: "manual",
          num_days: 3,
          meals_per_day: 3,
          snacks_per_day: 1,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (plan) {
        const { data: day1 } = await supabase
          .from("meal_plan_days")
          .insert({ meal_plan_id: plan.id, day_number: 1 })
          .select("id")
          .single();
        await supabase.from("meal_plan_days").insert([
          { meal_plan_id: plan.id, day_number: 2 },
          { meal_plan_id: plan.id, day_number: 3 },
        ]);

        if (day1) {
          const { data: breakfast } = await supabase
            .from("meals")
            .insert({
              meal_plan_day_id: day1.id,
              meal_type: "breakfast",
              name: "Oatmeal with berries",
              prep_instructions: "Cook oats with water, top with fresh berries and a spoon of almond butter.",
              servings: 1,
              position: 0,
            })
            .select("id")
            .single();

          if (breakfast) {
            await supabase.from("meal_items").insert([
              {
                meal_id: breakfast.id,
                custom_food_name: "Rolled oats (dry)",
                quantity: 60,
                unit: "g",
                calories: 228,
                protein_g: 8,
                carbs_g: 39,
                fat_g: 4,
                fiber_g: 6,
                sodium_mg: 2,
                nutrition_source: "manual",
                position: 0,
              },
              {
                meal_id: breakfast.id,
                custom_food_name: "Mixed berries",
                quantity: 100,
                unit: "g",
                calories: 50,
                protein_g: 1,
                carbs_g: 12,
                fat_g: 0.3,
                fiber_g: 4,
                sodium_mg: 1,
                nutrition_source: "manual",
                position: 1,
              },
            ] as never);
          }
        }
      }
    }

    if (p1) {
      const { data: plan } = await supabase
        .from("meal_plans")
        .insert({
          patient_id: p1.id,
          practitioner_id: user.id,
          name: "Approved Sample Plan (fictional)",
          status: "approved",
          source: "manual",
          num_days: 1,
          meals_per_day: 3,
          snacks_per_day: 1,
          created_by: user.id,
          approved_at: new Date().toISOString(),
          approved_by: user.id,
        })
        .select("id")
        .single();

      if (plan) {
        const { data: day1 } = await supabase
          .from("meal_plan_days")
          .insert({ meal_plan_id: plan.id, day_number: 1 })
          .select("id")
          .single();

        if (day1) {
          const { data: lunch } = await supabase
            .from("meals")
            .insert({
              meal_plan_day_id: day1.id,
              meal_type: "lunch",
              name: "Lentil and vegetable bowl",
              prep_instructions: "Simmer lentils until tender, serve over greens with roasted vegetables.",
              servings: 1,
              position: 0,
            })
            .select("id")
            .single();

          if (lunch) {
            await supabase.from("meal_items").insert({
              meal_id: lunch.id,
              custom_food_name: "Cooked green lentils",
              quantity: 200,
              unit: "g",
              calories: 230,
              protein_g: 18,
              carbs_g: 40,
              fat_g: 1,
              fiber_g: 16,
              sodium_mg: 4,
              nutrition_source: "manual",
              position: 0,
            } as never);
          }
        }
      }
    }

    revalidatePath("/patients");
    revalidatePath("/meal-plans");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Sample data seed failed", error);
    return { error: "Couldn't load sample data. Please try again." };
  }
}
