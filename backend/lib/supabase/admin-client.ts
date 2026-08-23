import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`[GETRA] Missing environment variable: ${name}`);
  }

  return value;
}

function requireSupabaseServiceRoleKey(): string {
  const value =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!value) {
    throw new Error(
      "[GETRA] Missing environment variable: SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return value;
}

/**
 * Backend-only Supabase client.
 *
 * SUPABASE_SECRET_KEY bypasses normal RLS behavior. Do not import this module into
 * client components, and never rename the secret to NEXT_PUBLIC_*.
 */
export function createAdminSupabaseClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireSupabaseServiceRoleKey(),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}
