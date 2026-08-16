import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { mapDatabaseError } from "@/src/repositories/errors";

/**
 * Supabase HTTP calls cannot make several client-side queries atomic. Any operation
 * that spans multiple writes must be implemented as a reviewed PostgreSQL function
 * and invoked once through this helper. The procedure name must be a server-owned
 * constant, never request input.
 */
export async function executeAtomicRpc<TResult>(
  supabase: SupabaseClient,
  procedure: string,
  parameters: Record<string, unknown>,
): Promise<TResult> {
  const { data, error } = await supabase.rpc(procedure, parameters);

  if (error) {
    throw mapDatabaseError(error, `rpc:${procedure}`);
  }

  return data as TResult;
}
