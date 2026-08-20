import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`[GETRA] Missing environment variable: ${name}`);
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
    requireEnv("SUPABASE_SECRET_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}
