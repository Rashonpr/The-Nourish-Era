import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Server-side Supabase client bound to the current request's cookies.
 * Runs with the authenticated user's session (RLS enforced) — this is
 * the client every Server Component, Server Action, and Route Handler
 * should use unless a task explicitly requires the service role.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component with no request context to
            // mutate — safe to ignore because middleware refreshes sessions.
          }
        },
      },
    },
  );
}

/**
 * Service-role Supabase client. Bypasses RLS entirely — never use this
 * for a request that acts on behalf of a specific practitioner. Reserved
 * for trusted server-only maintenance tasks (e.g. syncing the USDA food
 * cache). Never import this file from client code.
 */
export function createServiceRoleClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    },
  );
}
