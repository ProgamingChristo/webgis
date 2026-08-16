import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getEnvironment } from "@/src/lib/env";

const serverAuthOptions = {
  autoRefreshToken: false,
  detectSessionInUrl: false,
  persistSession: false,
};

export function getServerSupabaseClient() {
  const environment = getEnvironment();

  return createSupabaseClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: serverAuthOptions },
  );
}

export function getRequestSupabaseClient(authorization: string) {
  const environment = getEnvironment();

  return createSupabaseClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: serverAuthOptions,
      global: {
        headers: { Authorization: authorization },
      },
    },
  );
}
