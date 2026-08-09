-- TheNourishEra — initial schema
-- Multi-tenant model: every row is reachable back to exactly one practitioner
-- (auth.users.id). RLS enforces tenant isolation on every table below.

create extension if not exists pgcrypto;

-- ============================================================================
-- Utility: updated_at trigger
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- practitioners (1:1 with auth.users)
-- ============================================================================
create table public.practitioners (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  credentials text,
  clinic_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.practitioners
  for each row execute function public.set_updated_at();

-- Auto-provision a practitioner row when someone signs up via Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.practitioners (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- patients
-- ============================================================================
create table public.patients (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references public.practitioners(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  date_of_birth date,
  sex text check (sex in ('female', 'male', 'other', 'unspecified')),
  height_cm numeric,
  current_weight_kg numeric,
  goal_weight_kg numeric,
  preferred_units text not null default 'imperial' check (preferred_units in ('imperial', 'metric')),
  activity_level text check (
    activity_level in ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active')
  ),
  primary_goal text,
  primary_goal_custom text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.practitioners(id)
);

create index patients_practitioner_id_idx on public.patients (practitioner_id);
create index patients_status_idx on public.patients (practitioner_id, status);

create trigger set_updated_at before update on public.patients
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Patient sub-records
-- ============================================================================
create table public.patient_allergies (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  allergen text not null,
  is_custom boolean not null default false,
  severity text check (severity in ('mild', 'moderate', 'severe', 'unspecified')) default 'unspecified',
  notes text,
  created_at timestamptz not null default now()
);
create index patient_allergies_patient_id_idx on public.patient_allergies (patient_id);

create table public.patient_dietary_preferences (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  preference text not null,
  is_custom boolean not null default false,
  created_at timestamptz not null default now()
);
create index patient_dietary_preferences_patient_id_idx on public.patient_dietary_preferences (patient_id);

create table public.patient_food_preferences (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  category text not null check (category in ('favorite', 'dislike', 'refuse')),
  food_name text not null,
  created_at timestamptz not null default now()
);
create index patient_food_preferences_patient_id_idx on public.patient_food_preferences (patient_id);

create table public.patient_lifestyle (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null unique references public.patients(id) on delete cascade,
  meals_per_day integer,
  snacks_per_day integer,
  cooking_ability text check (cooking_ability in ('beginner', 'intermediate', 'advanced')),
  prep_time_minutes integer,
  budget_level text check (budget_level in ('low', 'moderate', 'high')),
  eating_out_frequency text,
  work_schedule_notes text,
  exercise_frequency text,
  exercise_type text,
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.patient_lifestyle
  for each row execute function public.set_updated_at();

create table public.patient_conditions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  condition text not null,
  is_custom boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);
create index patient_conditions_patient_id_idx on public.patient_conditions (patient_id);

create table public.patient_medications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  notes text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index patient_medications_patient_id_idx on public.patient_medications (patient_id);

create trigger set_updated_at before update on public.patient_medications
  for each row execute function public.set_updated_at();

-- ============================================================================
-- nutrition_targets — history-preserving; only one active row per patient
-- ============================================================================
create table public.nutrition_targets (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  calories integer,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  fiber_g numeric,
  sodium_mg numeric,
  added_sugar_g numeric,
  saturated_fat_g numeric,
  water_ml numeric,
  micronutrients jsonb not null default '{}'::jsonb,
  calc_method text,
  calc_inputs jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.practitioners(id)
);

create index nutrition_targets_patient_id_idx on public.nutrition_targets (patient_id);
create unique index nutrition_targets_one_active_per_patient
  on public.nutrition_targets (patient_id) where (is_active);

create trigger set_updated_at before update on public.nutrition_targets
  for each row execute function public.set_updated_at();

-- ============================================================================
-- foods + nutrition_data — shared USDA FoodData Central cache
-- ============================================================================
create table public.foods (
  id uuid primary key default gen_random_uuid(),
  fdc_id integer unique,
  description text not null,
  data_type text,
  brand_owner text,
  category text,
  serving_size numeric,
  serving_size_unit text,
  household_serving_text text,
  raw jsonb,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index foods_description_idx on public.foods using gin (to_tsvector('english', description));

create table public.nutrition_data (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references public.foods(id) on delete cascade,
  nutrient_id integer,
  nutrient_name text not null,
  unit_name text not null,
  amount_per_100g numeric not null,
  created_at timestamptz not null default now(),
  unique (food_id, nutrient_name)
);
create index nutrition_data_food_id_idx on public.nutrition_data (food_id);

-- ============================================================================
-- templates (practitioner-owned, not patient-specific)
-- ============================================================================
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references public.practitioners(id) on delete cascade,
  name text not null,
  description text,
  category text,
  num_days integer not null default 1,
  meals_per_day integer,
  snacks_per_day integer,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index templates_practitioner_id_idx on public.templates (practitioner_id);

create trigger set_updated_at before update on public.templates
  for each row execute function public.set_updated_at();

create table public.template_days (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates(id) on delete cascade,
  day_number integer not null,
  unique (template_id, day_number)
);
create index template_days_template_id_idx on public.template_days (template_id);

create table public.template_meals (
  id uuid primary key default gen_random_uuid(),
  template_day_id uuid not null references public.template_days(id) on delete cascade,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack', 'other')),
  name text not null,
  position integer not null default 0,
  prep_instructions text,
  servings numeric not null default 1
);
create index template_meals_template_day_id_idx on public.template_meals (template_day_id);

create table public.template_meal_items (
  id uuid primary key default gen_random_uuid(),
  template_meal_id uuid not null references public.template_meals(id) on delete cascade,
  food_id uuid references public.foods(id),
  custom_food_name text,
  quantity numeric not null,
  unit text not null,
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  fiber_g numeric,
  sodium_mg numeric,
  nutrition_source text not null default 'usda' check (nutrition_source in ('usda', 'manual', 'ai_unverified')),
  position integer not null default 0
);
create index template_meal_items_template_meal_id_idx on public.template_meal_items (template_meal_id);

-- ============================================================================
-- meal_plans / meal_plan_days / meals / meal_items
-- ============================================================================
create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  practitioner_id uuid not null references public.practitioners(id) on delete cascade,
  name text not null,
  status text not null default 'draft' check (
    status in ('draft', 'ai_draft', 'in_review', 'approved', 'archived')
  ),
  start_date date,
  num_days integer not null default 1,
  meals_per_day integer,
  snacks_per_day integer,
  settings jsonb not null default '{}'::jsonb,
  source text not null default 'manual' check (source in ('manual', 'ai')),
  template_id uuid references public.templates(id) on delete set null,
  duplicated_from uuid references public.meal_plans(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.practitioners(id),
  approved_at timestamptz,
  approved_by uuid references public.practitioners(id)
);
create index meal_plans_patient_id_idx on public.meal_plans (patient_id);
create index meal_plans_practitioner_id_idx on public.meal_plans (practitioner_id);
create index meal_plans_status_idx on public.meal_plans (practitioner_id, status);

create trigger set_updated_at before update on public.meal_plans
  for each row execute function public.set_updated_at();

create table public.meal_plan_days (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references public.meal_plans(id) on delete cascade,
  day_number integer not null,
  date date,
  notes text,
  created_at timestamptz not null default now(),
  unique (meal_plan_id, day_number)
);
create index meal_plan_days_meal_plan_id_idx on public.meal_plan_days (meal_plan_id);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  meal_plan_day_id uuid not null references public.meal_plan_days(id) on delete cascade,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack', 'other')),
  name text not null,
  position integer not null default 0,
  prep_instructions text,
  servings numeric not null default 1,
  notes text,
  is_ai_generated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index meals_meal_plan_day_id_idx on public.meals (meal_plan_day_id);

create trigger set_updated_at before update on public.meals
  for each row execute function public.set_updated_at();

create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals(id) on delete cascade,
  food_id uuid references public.foods(id),
  custom_food_name text,
  quantity numeric not null,
  unit text not null,
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  fiber_g numeric,
  sodium_mg numeric,
  nutrition_source text not null default 'usda' check (nutrition_source in ('usda', 'manual', 'ai_unverified')),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index meal_items_meal_id_idx on public.meal_items (meal_id);
create index meal_items_food_id_idx on public.meal_items (food_id);

create trigger set_updated_at before update on public.meal_items
  for each row execute function public.set_updated_at();

-- ============================================================================
-- grocery_lists / grocery_list_items
-- ============================================================================
create table public.grocery_lists (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null unique references public.meal_plans(id) on delete cascade,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.grocery_lists
  for each row execute function public.set_updated_at();

create table public.grocery_list_items (
  id uuid primary key default gen_random_uuid(),
  grocery_list_id uuid not null references public.grocery_lists(id) on delete cascade,
  category text not null default 'other' check (
    category in ('produce', 'meat_seafood', 'dairy', 'grains', 'pantry', 'frozen', 'spices_seasonings', 'other')
  ),
  name text not null,
  quantity numeric,
  unit text,
  is_checked boolean not null default false,
  is_manual boolean not null default false,
  position integer not null default 0
);
create index grocery_list_items_grocery_list_id_idx on public.grocery_list_items (grocery_list_id);

-- ============================================================================
-- progress_entries
-- ============================================================================
create table public.progress_entries (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  entry_date date not null,
  weight_kg numeric,
  notes text,
  adherence_pct integer check (adherence_pct between 0 and 100),
  hunger_rating integer check (hunger_rating between 1 and 5),
  energy_rating integer check (energy_rating between 1 and 5),
  practitioner_notes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.practitioners(id),
  unique (patient_id, entry_date)
);
create index progress_entries_patient_id_idx on public.progress_entries (patient_id, entry_date);

-- ============================================================================
-- practitioner_notes
-- ============================================================================
create table public.practitioner_notes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  practitioner_id uuid not null references public.practitioners(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index practitioner_notes_patient_id_idx on public.practitioner_notes (patient_id);

create trigger set_updated_at before update on public.practitioner_notes
  for each row execute function public.set_updated_at();

-- ============================================================================
-- ai_generations — audit trail for AI activity (no raw PHI-bearing prompts)
-- ============================================================================
create table public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references public.practitioners(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete set null,
  meal_plan_id uuid references public.meal_plans(id) on delete set null,
  generation_type text not null check (
    generation_type in ('plan', 'substitution', 'adjustment', 'alternative')
  ),
  model text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  request_summary jsonb,
  draft_ref uuid,
  final_ref uuid,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ai_generations_practitioner_id_idx on public.ai_generations (practitioner_id);
create index ai_generations_patient_id_idx on public.ai_generations (patient_id);
create index ai_generations_meal_plan_id_idx on public.ai_generations (meal_plan_id);

create trigger set_updated_at before update on public.ai_generations
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

-- Ownership helper functions (SECURITY INVOKER — re-applies caller's own RLS
-- on the tables they query, so no privilege escalation and no recursion).
create or replace function public.is_patient_owner(p_patient_id uuid)
returns boolean
language sql stable
as $$
  select exists (
    select 1 from public.patients p
    where p.id = p_patient_id and p.practitioner_id = auth.uid()
  );
$$;

create or replace function public.is_meal_plan_owner(p_meal_plan_id uuid)
returns boolean
language sql stable
as $$
  select exists (
    select 1 from public.meal_plans mp
    where mp.id = p_meal_plan_id and mp.practitioner_id = auth.uid()
  );
$$;

create or replace function public.is_meal_plan_day_owner(p_meal_plan_day_id uuid)
returns boolean
language sql stable
as $$
  select exists (
    select 1 from public.meal_plan_days d
    join public.meal_plans mp on mp.id = d.meal_plan_id
    where d.id = p_meal_plan_day_id and mp.practitioner_id = auth.uid()
  );
$$;

create or replace function public.is_meal_owner(p_meal_id uuid)
returns boolean
language sql stable
as $$
  select exists (
    select 1 from public.meals m
    join public.meal_plan_days d on d.id = m.meal_plan_day_id
    join public.meal_plans mp on mp.id = d.meal_plan_id
    where m.id = p_meal_id and mp.practitioner_id = auth.uid()
  );
$$;

create or replace function public.is_grocery_list_owner(p_grocery_list_id uuid)
returns boolean
language sql stable
as $$
  select exists (
    select 1 from public.grocery_lists gl
    join public.meal_plans mp on mp.id = gl.meal_plan_id
    where gl.id = p_grocery_list_id and mp.practitioner_id = auth.uid()
  );
$$;

create or replace function public.is_template_owner(p_template_id uuid)
returns boolean
language sql stable
as $$
  select exists (
    select 1 from public.templates t
    where t.id = p_template_id and t.practitioner_id = auth.uid()
  );
$$;

create or replace function public.is_template_day_owner(p_template_day_id uuid)
returns boolean
language sql stable
as $$
  select exists (
    select 1 from public.template_days td
    join public.templates t on t.id = td.template_id
    where td.id = p_template_day_id and t.practitioner_id = auth.uid()
  );
$$;

create or replace function public.is_template_meal_owner(p_template_meal_id uuid)
returns boolean
language sql stable
as $$
  select exists (
    select 1 from public.template_meals tm
    join public.template_days td on td.id = tm.template_day_id
    join public.templates t on t.id = td.template_id
    where tm.id = p_template_meal_id and t.practitioner_id = auth.uid()
  );
$$;

alter table public.practitioners enable row level security;
alter table public.patients enable row level security;
alter table public.patient_allergies enable row level security;
alter table public.patient_dietary_preferences enable row level security;
alter table public.patient_food_preferences enable row level security;
alter table public.patient_lifestyle enable row level security;
alter table public.patient_conditions enable row level security;
alter table public.patient_medications enable row level security;
alter table public.nutrition_targets enable row level security;
alter table public.foods enable row level security;
alter table public.nutrition_data enable row level security;
alter table public.templates enable row level security;
alter table public.template_days enable row level security;
alter table public.template_meals enable row level security;
alter table public.template_meal_items enable row level security;
alter table public.meal_plans enable row level security;
alter table public.meal_plan_days enable row level security;
alter table public.meals enable row level security;
alter table public.meal_items enable row level security;
alter table public.grocery_lists enable row level security;
alter table public.grocery_list_items enable row level security;
alter table public.progress_entries enable row level security;
alter table public.practitioner_notes enable row level security;
alter table public.ai_generations enable row level security;

-- practitioners
create policy "practitioners_select_own" on public.practitioners for select using (id = auth.uid());
create policy "practitioners_update_own" on public.practitioners for update using (id = auth.uid());
create policy "practitioners_insert_own" on public.practitioners for insert with check (id = auth.uid());

-- patients
create policy "patients_select_own" on public.patients for select using (practitioner_id = auth.uid());
create policy "patients_insert_own" on public.patients for insert with check (practitioner_id = auth.uid());
create policy "patients_update_own" on public.patients for update using (practitioner_id = auth.uid());
create policy "patients_delete_own" on public.patients for delete using (practitioner_id = auth.uid());

-- generic policy generator for simple patient-child tables
do $$
declare
  t text;
begin
  foreach t in array array[
    'patient_allergies', 'patient_dietary_preferences', 'patient_food_preferences',
    'patient_lifestyle', 'patient_conditions', 'patient_medications',
    'nutrition_targets', 'progress_entries'
  ]
  loop
    execute format(
      'create policy "%1$s_select" on public.%1$s for select using (public.is_patient_owner(patient_id));',
      t
    );
    execute format(
      'create policy "%1$s_insert" on public.%1$s for insert with check (public.is_patient_owner(patient_id));',
      t
    );
    execute format(
      'create policy "%1$s_update" on public.%1$s for update using (public.is_patient_owner(patient_id));',
      t
    );
    execute format(
      'create policy "%1$s_delete" on public.%1$s for delete using (public.is_patient_owner(patient_id));',
      t
    );
  end loop;
end $$;

-- practitioner_notes (patient-scoped, but also carries practitioner_id directly)
create policy "practitioner_notes_select" on public.practitioner_notes for select using (public.is_patient_owner(patient_id));
create policy "practitioner_notes_insert" on public.practitioner_notes for insert with check (public.is_patient_owner(patient_id) and practitioner_id = auth.uid());
create policy "practitioner_notes_update" on public.practitioner_notes for update using (public.is_patient_owner(patient_id));
create policy "practitioner_notes_delete" on public.practitioner_notes for delete using (public.is_patient_owner(patient_id));

-- foods / nutrition_data: shared reference cache — readable/writable by any
-- authenticated practitioner, never tenant-scoped.
create policy "foods_select_authenticated" on public.foods for select to authenticated using (true);
create policy "foods_insert_authenticated" on public.foods for insert to authenticated with check (true);
create policy "foods_update_authenticated" on public.foods for update to authenticated using (true);

create policy "nutrition_data_select_authenticated" on public.nutrition_data for select to authenticated using (true);
create policy "nutrition_data_insert_authenticated" on public.nutrition_data for insert to authenticated with check (true);
create policy "nutrition_data_update_authenticated" on public.nutrition_data for update to authenticated using (true);

-- templates
create policy "templates_select_own" on public.templates for select using (practitioner_id = auth.uid());
create policy "templates_insert_own" on public.templates for insert with check (practitioner_id = auth.uid());
create policy "templates_update_own" on public.templates for update using (practitioner_id = auth.uid());
create policy "templates_delete_own" on public.templates for delete using (practitioner_id = auth.uid());

create policy "template_days_select" on public.template_days for select using (public.is_template_owner(template_id));
create policy "template_days_insert" on public.template_days for insert with check (public.is_template_owner(template_id));
create policy "template_days_update" on public.template_days for update using (public.is_template_owner(template_id));
create policy "template_days_delete" on public.template_days for delete using (public.is_template_owner(template_id));

create policy "template_meals_select" on public.template_meals for select using (public.is_template_day_owner(template_day_id));
create policy "template_meals_insert" on public.template_meals for insert with check (public.is_template_day_owner(template_day_id));
create policy "template_meals_update" on public.template_meals for update using (public.is_template_day_owner(template_day_id));
create policy "template_meals_delete" on public.template_meals for delete using (public.is_template_day_owner(template_day_id));

create policy "template_meal_items_select" on public.template_meal_items for select using (public.is_template_meal_owner(template_meal_id));
create policy "template_meal_items_insert" on public.template_meal_items for insert with check (public.is_template_meal_owner(template_meal_id));
create policy "template_meal_items_update" on public.template_meal_items for update using (public.is_template_meal_owner(template_meal_id));
create policy "template_meal_items_delete" on public.template_meal_items for delete using (public.is_template_meal_owner(template_meal_id));

-- meal_plans
create policy "meal_plans_select_own" on public.meal_plans for select using (practitioner_id = auth.uid());
create policy "meal_plans_insert_own" on public.meal_plans for insert with check (practitioner_id = auth.uid());
create policy "meal_plans_update_own" on public.meal_plans for update using (practitioner_id = auth.uid());
create policy "meal_plans_delete_own" on public.meal_plans for delete using (practitioner_id = auth.uid());

create policy "meal_plan_days_select" on public.meal_plan_days for select using (public.is_meal_plan_owner(meal_plan_id));
create policy "meal_plan_days_insert" on public.meal_plan_days for insert with check (public.is_meal_plan_owner(meal_plan_id));
create policy "meal_plan_days_update" on public.meal_plan_days for update using (public.is_meal_plan_owner(meal_plan_id));
create policy "meal_plan_days_delete" on public.meal_plan_days for delete using (public.is_meal_plan_owner(meal_plan_id));

create policy "meals_select" on public.meals for select using (public.is_meal_plan_day_owner(meal_plan_day_id));
create policy "meals_insert" on public.meals for insert with check (public.is_meal_plan_day_owner(meal_plan_day_id));
create policy "meals_update" on public.meals for update using (public.is_meal_plan_day_owner(meal_plan_day_id));
create policy "meals_delete" on public.meals for delete using (public.is_meal_plan_day_owner(meal_plan_day_id));

create policy "meal_items_select" on public.meal_items for select using (public.is_meal_owner(meal_id));
create policy "meal_items_insert" on public.meal_items for insert with check (public.is_meal_owner(meal_id));
create policy "meal_items_update" on public.meal_items for update using (public.is_meal_owner(meal_id));
create policy "meal_items_delete" on public.meal_items for delete using (public.is_meal_owner(meal_id));

create policy "grocery_lists_select" on public.grocery_lists for select using (public.is_meal_plan_owner(meal_plan_id));
create policy "grocery_lists_insert" on public.grocery_lists for insert with check (public.is_meal_plan_owner(meal_plan_id));
create policy "grocery_lists_update" on public.grocery_lists for update using (public.is_meal_plan_owner(meal_plan_id));
create policy "grocery_lists_delete" on public.grocery_lists for delete using (public.is_meal_plan_owner(meal_plan_id));

create policy "grocery_list_items_select" on public.grocery_list_items for select using (public.is_grocery_list_owner(grocery_list_id));
create policy "grocery_list_items_insert" on public.grocery_list_items for insert with check (public.is_grocery_list_owner(grocery_list_id));
create policy "grocery_list_items_update" on public.grocery_list_items for update using (public.is_grocery_list_owner(grocery_list_id));
create policy "grocery_list_items_delete" on public.grocery_list_items for delete using (public.is_grocery_list_owner(grocery_list_id));

-- ai_generations
create policy "ai_generations_select_own" on public.ai_generations for select using (practitioner_id = auth.uid());
create policy "ai_generations_insert_own" on public.ai_generations for insert with check (practitioner_id = auth.uid());
create policy "ai_generations_update_own" on public.ai_generations for update using (practitioner_id = auth.uid());
