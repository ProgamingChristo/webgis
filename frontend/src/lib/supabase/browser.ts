"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";



let browserSupabaseClient: SupabaseClient | undefined;

export function getBrowserSupabaseClient(): SupabaseClient {
  if (!browserSupabaseClient) {
    browserSupabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
  }

  return browserSupabaseClient;
}
