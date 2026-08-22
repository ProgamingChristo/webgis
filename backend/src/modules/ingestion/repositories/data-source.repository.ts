

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/types/database.types";
import { RepositoryError } from "@/src/repositories/errors";
import type { DataSource, DataEnvironment } from "../ingestion.types";
import type { JsonObject } from "@/src/types/provenance";

export class DataSourceRepository {
  constructor(private client: SupabaseClient<Database>) {}

  async findByCode(code: string): Promise<DataSource | null> {
    const { data, error } = await this.client
      .from("data_sources")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (error) {
      throw new RepositoryError("DATABASE_ERROR", "findDataSourceByCode", {
        cause: error,
      });
    }

    if (!data) return null;

    return data as DataSource;
  }

  async create(input: {
    code: string;
    name: string;
    description?: string;
    environment: DataEnvironment;
    is_active?: boolean;
    metadata?: Record<string, unknown>;
  }): Promise<DataSource> {
    const { data, error } = await this.client
      .from("data_sources")
      .insert([
        {
          code: input.code,
          name: input.name,
          description: input.description ?? null,
          environment: input.environment,
          is_active: input.is_active ?? true,
          metadata: (input.metadata ?? {}) as unknown as JsonObject,
        },
      ])
      .select("*")
      .single();

    if (error) {
      throw new RepositoryError("DATABASE_ERROR", "createDataSource", {
        cause: error,
      });
    }

    return data as DataSource;
  }
}
