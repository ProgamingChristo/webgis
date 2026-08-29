

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { loadApiSecurityConfig } from "@/src/lib/api-security/config";
import { getEnvironment } from "@/src/lib/env";
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

export function getServiceRoleSupabaseClient() {
  const environment = getEnvironment();
  const security = loadApiSecurityConfig();
  const serviceKey =
    environment.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;

  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi pada environment server.",
    );
  }

  return createSupabaseClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey,
    {
      auth: serverAuthOptions,
      global: {
        fetch: createTimeoutFetch(security.supabaseRequestTimeoutMs),
      },
    },
  );
}
