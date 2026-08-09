# TheNourishEra

A production-quality MVP for registered dietitians and nutrition professionals to create, review, manage,
and export personalized nutrition plans for their patients. AI (Claude) assists with meal planning, but
every nutrition value is calculated from verified USDA FoodData Central data, and every AI-generated
recommendation requires practitioner review before it reaches a patient.

Branding lives entirely in [`src/config/branding.ts`](src/config/branding.ts) and the CSS theme tokens in
[`src/app/globals.css`](src/app/globals.css) — swap those two to re-skin the product without touching
feature code.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui, Supabase (Postgres + Auth), Claude API,
USDA FoodData Central, Zod, React Hook Form, Recharts, Vitest.

## Getting started

### 1. Prerequisites

- Node.js 20+ and npm (already verified/installed if you're reading this from the project setup)
- A [Supabase](https://supabase.com) project (free tier is fine)
- An [Anthropic API key](https://console.anthropic.com)
- A free [USDA FoodData Central API key](https://fdc.nal.usda.gov/api-key-signup.html)

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in the Supabase URL/keys (Project Settings → API), your Anthropic API key, and your USDA FDC key.

### 4. Set up the database

In the Supabase SQL Editor, run the migration at
[`supabase/migrations/0001_init_schema.sql`](supabase/migrations/0001_init_schema.sql). It creates every
table, index, and Row Level Security policy the app needs, and wires up a trigger so a `practitioners`
profile row is created automatically whenever someone signs up.

### 5. Run the app

```bash
npm run dev
```

Visit `http://localhost:3000` — you'll land on the sign-up page.

### 6. Run tests

```bash
npm test
```

## Project structure

```
src/
  app/
    (auth)/            # login, signup, password reset — public routes
    (app)/              # protected app shell (sidebar + topbar) and all feature pages
    api/                 # server-only route handlers (AI, nutrition, PDF)
    auth/callback/       # Supabase auth redirect handler
  components/
    ui/                  # shadcn/ui primitives
    layout/               # app shell (sidebar, topbar)
    dashboard/, meal-plans/, patients/, ...  # feature components
    shared/               # cross-feature building blocks (empty/error states, etc.)
  config/                 # branding.ts, nav.ts — swap-to-rebrand config
  lib/
    supabase/             # browser/server/middleware Supabase clients
    actions/               # Next.js Server Actions (mutations)
    data/                   # server-only data-fetching helpers
    services/               # Claude, USDA nutrition, PDF generation (added in later phases)
    validation/             # Zod schemas
  types/                  # hand-authored Supabase Database types
supabase/
  migrations/             # SQL schema + RLS policies
```

## Security notes

- Every table is protected by Postgres Row Level Security — a practitioner can only ever read or write
  their own patients, plans, and notes (see the migration file for the exact policies).
- The Supabase service-role key, Anthropic API key, and USDA FDC key are server-only and are never sent to
  the browser.
- This app is architected with future PHI handling in mind (tenant isolation, auditability of AI activity),
  but it is **not** presented as HIPAA-compliant out of the box — formal compliance work is a separate
  effort.

## Development phases

This project is being built in phases (see the task list in-session): project setup → patient management →
nutrition data integration → manual meal planning → AI-assisted planning → AI substitutions/adjustments →
grocery lists/templates/progress tracking → PDF export and polish.
