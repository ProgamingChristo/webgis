"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getEnvironment } from "@/src/lib/env";

let browserSupabaseClient: SupabaseClient | undefined;

export function getBrowserSupabaseClient(): SupabaseClient {
  if (!browserSupabaseClient) {
    const environment = getEnvironment();
    browserSupabaseClient = createClient(
      environment.NEXT_PUBLIC_SUPABASE_URL,
      environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    );
  }

  return browserSupabaseClient;
}
