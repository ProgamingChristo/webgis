import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`[GETRA] Missing environment variable: ${name}`);
  }

  return value;
}

/**
 * Public/RLS-bound Supabase client.
 *
 * This client intentionally uses the publishable key. It is suitable for testing
 * the same RLS-visible data that a browser client is allowed to read.
 */
export function createPublicSupabaseClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}
