import "server-only";

import { getServerSupabaseClient } from "@/src/lib/supabase/server";

export type DatabaseConnection =
  | { status: "connected" }
  | { reason: "network_error" | "storage_api_error"; status: "unavailable" };

export interface StorageHealthClient {
  storage: {
    listBuckets: (options?: { limit?: number; offset?: number }) => Promise<{
      data: unknown;
      error: unknown | null;
    }>;
  };
}

export interface DatabaseHealthRepository {
  checkConnection: () => Promise<DatabaseConnection>;
}

export class SupabaseHealthRepository implements DatabaseHealthRepository {
  constructor(
    private readonly createClient: () => StorageHealthClient = getServerSupabaseClient,
  ) {}

  async checkConnection(): Promise<DatabaseConnection> {
    try {
      const { error } = await this.createClient().storage.listBuckets({
        limit: 1,
        offset: 0,
      });

      // Storage metadata is managed by Supabase; this does not query or create GETRA tables.
      // Do not inspect or return bucket data from this infrastructure probe.
      if (error === null) {
        return { status: "connected" };
      }

      return { reason: "storage_api_error", status: "unavailable" };
    } catch {
      return { reason: "network_error", status: "unavailable" };
    }
  }
}
