import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getEnvironment } from "@/src/lib/env";
import { loadApiSecurityConfig } from "@/src/lib/api-security/config";
import { createTimeoutFetch } from "@/src/lib/http/timeout-fetch";

const serverAuthOptions = {
  autoRefreshToken: false,
  detectSessionInUrl: false,
  persistSession: false,
};

export function getServerSupabaseClient() {
  const environment = getEnvironment();
  const security = loadApiSecurityConfig();

  return createSupabaseClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: serverAuthOptions,
      global: {
        fetch: createTimeoutFetch(security.supabaseRequestTimeoutMs),
      },
    },
  );
}

export function getRequestSupabaseClient(authorization: string) {
  const environment = getEnvironment();
  const security = loadApiSecurityConfig();

  return createSupabaseClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: serverAuthOptions,
      global: {
        fetch: createTimeoutFetch(security.supabaseRequestTimeoutMs),
        headers: { Authorization: authorization },
      },
    },
  );
}
