/**
 * Hand-authored types mirroring supabase/migrations/0001_init_schema.sql.
 * If the schema changes, update this file (or replace it with output from
 * `supabase gen types typescript` once a live project is linked).
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type PatientSex = "female" | "male" | "other" | "unspecified";
export type PreferredUnits = "imperial" | "metric";
export type ActivityLevel = "sedentary" | "lightly_active" | "moderately_active" | "very_active" | "extra_active";
export type PatientStatus = "active" | "archived";
export type AllergySeverity = "mild" | "moderate" | "severe" | "unspecified";
export type FoodPreferenceCategory = "favorite" | "dislike" | "refuse";
export type CookingAbility = "beginner" | "intermediate" | "advanced";
export type BudgetLevel = "low" | "moderate" | "high";
export type MealPlanStatus = "draft" | "ai_draft" | "in_review" | "approved" | "archived";
export type MealPlanSource = "manual" | "ai";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack" | "other";
export type NutritionSource = "usda" | "manual" | "ai_unverified";
export type GroceryCategory =
  | "produce"
  | "meat_seafood"
  | "dairy"
  | "grains"
  | "pantry"
  | "frozen"
  | "spices_seasonings"
  | "other";
export type AiGenerationType = "plan" | "substitution" | "adjustment" | "alternative";
export type AiGenerationStatus = "pending" | "accepted" | "rejected";

type Tables = Database["public"]["Tables"];

export interface Database {
  public: {
    Tables: {
      practitioners: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          credentials: string | null;
          clinic_name: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Tables["practitioners"]["Row"]> & {
          id: string;
          email: string;
          full_name: string;
        };
        Update: Partial<Tables["practitioners"]["Row"]>;
        Relationships: [];
      };
      patients: {
        Row: {
          id: string;
          practitioner_id: string;
          first_name: string;
          last_name: string;
          date_of_birth: string | null;
          sex: PatientSex | null;
          height_cm: number | null;
          current_weight_kg: number | null;
          goal_weight_kg: number | null;
          preferred_units: PreferredUnits;
          activity_level: ActivityLevel | null;
          primary_goal: string | null;
          primary_goal_custom: string | null;
          status: PatientStatus;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: Partial<Tables["patients"]["Row"]> & {
          practitioner_id: string;
          first_name: string;
          last_name: string;
        };
        Update: Partial<Tables["patients"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "patients_practitioner_id_fkey";
            columns: ["practitioner_id"];
            isOneToOne: false;
            referencedRelation: "practitioners";
            referencedColumns: ["id"];
          },
        ];
      };
      patient_allergies: {
        Row: {
          id: string;
          patient_id: string;
          allergen: string;
          is_custom: boolean;
          severity: AllergySeverity;
          notes: string | null;
          created_at: string;
        };
        Insert: Partial<Tables["patient_allergies"]["Row"]> & {
          patient_id: string;
          allergen: string;
        };
        Update: Partial<Tables["patient_allergies"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "patient_allergies_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
      patient_dietary_preferences: {
        Row: {
          id: string;
          patient_id: string;
          preference: string;
          is_custom: boolean;
          created_at: string;
        };
        Insert: Partial<Tables["patient_dietary_preferences"]["Row"]> & {
          patient_id: string;
          preference: string;
        };
        Update: Partial<Tables["patient_dietary_preferences"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "patient_dietary_preferences_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
      patient_food_preferences: {
        Row: {
          id: string;
          patient_id: string;
          category: FoodPreferenceCategory;
          food_name: string;
          created_at: string;
        };
        Insert: Partial<Tables["patient_food_preferences"]["Row"]> & {
          patient_id: string;
          category: FoodPreferenceCategory;
          food_name: string;
        };
        Update: Partial<Tables["patient_food_preferences"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "patient_food_preferences_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
      patient_lifestyle: {
        Row: {
          id: string;
          patient_id: string;
          meals_per_day: number | null;
          snacks_per_day: number | null;
          cooking_ability: CookingAbility | null;
          prep_time_minutes: number | null;
          budget_level: BudgetLevel | null;
          eating_out_frequency: string | null;
          work_schedule_notes: string | null;
          exercise_frequency: string | null;
          exercise_type: string | null;
          updated_at: string;
        };
        Insert: Partial<Tables["patient_lifestyle"]["Row"]> & {
          patient_id: string;
        };
        Update: Partial<Tables["patient_lifestyle"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "patient_lifestyle_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: true;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
      patient_conditions: {
        Row: {
          id: string;
          patient_id: string;
          condition: string;
          is_custom: boolean;
          notes: string | null;
          created_at: string;
        };
        Insert: Partial<Tables["patient_conditions"]["Row"]> & {
          patient_id: string;
          condition: string;
        };
        Update: Partial<Tables["patient_conditions"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "patient_conditions_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
      patient_medications: {
        Row: {
          id: string;
          patient_id: string;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Tables["patient_medications"]["Row"]> & {
          patient_id: string;
          notes: string;
        };
        Update: Partial<Tables["patient_medications"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "patient_medications_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
      nutrition_targets: {
        Row: {
          id: string;
          patient_id: string;
          calories: number | null;
          protein_g: number | null;
          carbs_g: number | null;
          fat_g: number | null;
          fiber_g: number | null;
          sodium_mg: number | null;
          added_sugar_g: number | null;
          saturated_fat_g: number | null;
          water_ml: number | null;
          micronutrients: Json;
          calc_method: string | null;
          calc_inputs: Json | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: Partial<Tables["nutrition_targets"]["Row"]> & {
          patient_id: string;
        };
        Update: Partial<Tables["nutrition_targets"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "nutrition_targets_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
      foods: {
        Row: {
          id: string;
          fdc_id: number | null;
          description: string;
          data_type: string | null;
          brand_owner: string | null;
          category: string | null;
          serving_size: number | null;
          serving_size_unit: string | null;
          household_serving_text: string | null;
          raw: Json | null;
          last_synced_at: string;
          created_at: string;
        };
        Insert: Partial<Tables["foods"]["Row"]> & {
          description: string;
        };
        Update: Partial<Tables["foods"]["Row"]>;
        Relationships: [];
      };
      nutrition_data: {
        Row: {
          id: string;
          food_id: string;
          nutrient_id: number | null;
          nutrient_name: string;
          unit_name: string;
          amount_per_100g: number;
          created_at: string;
        };
        Insert: Partial<Tables["nutrition_data"]["Row"]> & {
          food_id: string;
          nutrient_name: string;
          unit_name: string;
          amount_per_100g: number;
        };
        Update: Partial<Tables["nutrition_data"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "nutrition_data_food_id_fkey";
            columns: ["food_id"];
            isOneToOne: false;
            referencedRelation: "foods";
            referencedColumns: ["id"];
          },
        ];
      };
      templates: {
        Row: {
          id: string;
          practitioner_id: string;
          name: string;
          description: string | null;
          category: string | null;
          num_days: number;
          meals_per_day: number | null;
          snacks_per_day: number | null;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Tables["templates"]["Row"]> & {
          practitioner_id: string;
          name: string;
        };
        Update: Partial<Tables["templates"]["Row"]>;
        Relationships: [];
      };
      template_days: {
        Row: { id: string; template_id: string; day_number: number };
        Insert: Partial<Tables["template_days"]["Row"]> & {
          template_id: string;
          day_number: number;
        };
        Update: Partial<Tables["template_days"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "template_days_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "templates";
            referencedColumns: ["id"];
          },
        ];
      };
      template_meals: {
        Row: {
          id: string;
          template_day_id: string;
          meal_type: MealType;
          name: string;
          position: number;
          prep_instructions: string | null;
          servings: number;
        };
        Insert: Partial<Tables["template_meals"]["Row"]> & {
          template_day_id: string;
          meal_type: MealType;
          name: string;
        };
        Update: Partial<Tables["template_meals"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "template_meals_template_day_id_fkey";
            columns: ["template_day_id"];
            isOneToOne: false;
            referencedRelation: "template_days";
            referencedColumns: ["id"];
          },
        ];
      };
      template_meal_items: {
        Row: {
          id: string;
          template_meal_id: string;
          food_id: string | null;
          custom_food_name: string | null;
          quantity: number;
          unit: string;
          calories: number | null;
          protein_g: number | null;
          carbs_g: number | null;
          fat_g: number | null;
          fiber_g: number | null;
          sodium_mg: number | null;
          nutrition_source: NutritionSource;
          position: number;
        };
        Insert: Partial<Tables["template_meal_items"]["Row"]> & {
          template_meal_id: string;
          quantity: number;
          unit: string;
        };
        Update: Partial<Tables["template_meal_items"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "template_meal_items_template_meal_id_fkey";
            columns: ["template_meal_id"];
            isOneToOne: false;
            referencedRelation: "template_meals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "template_meal_items_food_id_fkey";
            columns: ["food_id"];
            isOneToOne: false;
            referencedRelation: "foods";
            referencedColumns: ["id"];
          },
        ];
      };
      meal_plans: {
        Row: {
          id: string;
          patient_id: string;
          practitioner_id: string;
          name: string;
          status: MealPlanStatus;
          start_date: string | null;
          num_days: number;
          meals_per_day: number | null;
          snacks_per_day: number | null;
          settings: Json;
          source: MealPlanSource;
          template_id: string | null;
          duplicated_from: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          approved_at: string | null;
          approved_by: string | null;
        };
        Insert: Partial<Tables["meal_plans"]["Row"]> & {
          patient_id: string;
          practitioner_id: string;
          name: string;
        };
        Update: Partial<Tables["meal_plans"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "meal_plans_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meal_plans_practitioner_id_fkey";
            columns: ["practitioner_id"];
            isOneToOne: false;
            referencedRelation: "practitioners";
            referencedColumns: ["id"];
          },
        ];
      };
      meal_plan_days: {
        Row: {
          id: string;
          meal_plan_id: string;
          day_number: number;
          date: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Partial<Tables["meal_plan_days"]["Row"]> & {
          meal_plan_id: string;
          day_number: number;
        };
        Update: Partial<Tables["meal_plan_days"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "meal_plan_days_meal_plan_id_fkey";
            columns: ["meal_plan_id"];
            isOneToOne: false;
            referencedRelation: "meal_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      meals: {
        Row: {
          id: string;
          meal_plan_day_id: string;
          meal_type: MealType;
          name: string;
          position: number;
          prep_instructions: string | null;
          servings: number;
          notes: string | null;
          is_ai_generated: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Tables["meals"]["Row"]> & {
          meal_plan_day_id: string;
          meal_type: MealType;
          name: string;
        };
        Update: Partial<Tables["meals"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "meals_meal_plan_day_id_fkey";
            columns: ["meal_plan_day_id"];
            isOneToOne: false;
            referencedRelation: "meal_plan_days";
            referencedColumns: ["id"];
          },
        ];
      };
      meal_items: {
        Row: {
          id: string;
          meal_id: string;
          food_id: string | null;
          custom_food_name: string | null;
          quantity: number;
          unit: string;
          calories: number | null;
          protein_g: number | null;
          carbs_g: number | null;
          fat_g: number | null;
          fiber_g: number | null;
          sodium_mg: number | null;
          nutrition_source: NutritionSource;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Tables["meal_items"]["Row"]> & {
          meal_id: string;
          quantity: number;
          unit: string;
        };
        Update: Partial<Tables["meal_items"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "meal_items_meal_id_fkey";
            columns: ["meal_id"];
            isOneToOne: false;
            referencedRelation: "meals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meal_items_food_id_fkey";
            columns: ["food_id"];
            isOneToOne: false;
            referencedRelation: "foods";
            referencedColumns: ["id"];
          },
        ];
      };
      grocery_lists: {
        Row: { id: string; meal_plan_id: string; generated_at: string; created_at: string; updated_at: string };
        Insert: Partial<Tables["grocery_lists"]["Row"]> & {
          meal_plan_id: string;
        };
        Update: Partial<Tables["grocery_lists"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "grocery_lists_meal_plan_id_fkey";
            columns: ["meal_plan_id"];
            isOneToOne: true;
            referencedRelation: "meal_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      grocery_list_items: {
        Row: {
          id: string;
          grocery_list_id: string;
          category: GroceryCategory;
          name: string;
          quantity: number | null;
          unit: string | null;
          is_checked: boolean;
          is_manual: boolean;
          position: number;
        };
        Insert: Partial<Tables["grocery_list_items"]["Row"]> & {
          grocery_list_id: string;
          name: string;
        };
        Update: Partial<Tables["grocery_list_items"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "grocery_list_items_grocery_list_id_fkey";
            columns: ["grocery_list_id"];
            isOneToOne: false;
            referencedRelation: "grocery_lists";
            referencedColumns: ["id"];
          },
        ];
      };
      progress_entries: {
        Row: {
          id: string;
          patient_id: string;
          entry_date: string;
          weight_kg: number | null;
          notes: string | null;
          adherence_pct: number | null;
          hunger_rating: number | null;
          energy_rating: number | null;
          practitioner_notes: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: Partial<Tables["progress_entries"]["Row"]> & {
          patient_id: string;
          entry_date: string;
        };
        Update: Partial<Tables["progress_entries"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "progress_entries_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
      practitioner_notes: {
        Row: {
          id: string;
          patient_id: string;
          practitioner_id: string;
          note: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Tables["practitioner_notes"]["Row"]> & {
          patient_id: string;
          practitioner_id: string;
          note: string;
        };
        Update: Partial<Tables["practitioner_notes"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "practitioner_notes_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_generations: {
        Row: {
          id: string;
          practitioner_id: string;
          patient_id: string | null;
          meal_plan_id: string | null;
          generation_type: AiGenerationType;
          model: string;
          status: AiGenerationStatus;
          request_summary: Json | null;
          draft_ref: string | null;
          final_ref: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Tables["ai_generations"]["Row"]> & {
          practitioner_id: string;
          generation_type: AiGenerationType;
          model: string;
        };
        Update: Partial<Tables["ai_generations"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "ai_generations_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_generations_meal_plan_id_fkey";
            columns: ["meal_plan_id"];
            isOneToOne: false;
            referencedRelation: "meal_plans";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
