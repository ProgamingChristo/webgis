

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/types/database.types";
import { RepositoryError } from "@/src/repositories/errors";
import type {
  ImportJob,
  CreateImportJobInput,
  UpdateImportJobInput,
} from "../ingestion.types";
import type { JsonObject } from "@/src/types/provenance";

export class ImportJobRepository {
  constructor(private client: SupabaseClient<Database>) {}

  async create(input: CreateImportJobInput): Promise<ImportJob> {
    const { data, error } = await this.client
      .from("import_jobs")
      .insert([
        {
          data_source_id: input.data_source_id,
          environment: input.environment,
          is_dry_run: input.is_dry_run ?? false,
          metadata: input.metadata ?? {},
          status: "PENDING",
        },
      ])
      .select("*")
      .single();

    if (error) {
      throw new RepositoryError("DATABASE_ERROR", "createImportJob", {
        cause: error,
      });
    }

    return this.mapToDomain(data);
  }

  async update(id: string, input: UpdateImportJobInput): Promise<ImportJob> {
    const updatePayload: Database["public"]["Tables"]["import_jobs"]["Update"] = {};

    if (input.status !== undefined) updatePayload.status = input.status;
    if (input.started_at !== undefined) updatePayload.started_at = input.started_at;
    if (input.completed_at !== undefined) updatePayload.completed_at = input.completed_at;
    if (input.error_log !== undefined) updatePayload.error_log = input.error_log;
    if (input.metadata !== undefined) updatePayload.metadata = input.metadata;

    if (input.metrics) {
      if (input.metrics.total_records !== undefined) updatePayload.total_records = input.metrics.total_records;
      if (input.metrics.processed_records !== undefined) updatePayload.processed_records = input.metrics.processed_records;
      if (input.metrics.failed_records !== undefined) updatePayload.failed_records = input.metrics.failed_records;
      if (input.metrics.inserted_records !== undefined) updatePayload.inserted_records = input.metrics.inserted_records;
      if (input.metrics.updated_records !== undefined) updatePayload.updated_records = input.metrics.updated_records;
    }

    const { data, error } = await this.client
      .from("import_jobs")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new RepositoryError("DATABASE_ERROR", "updateImportJob", {
        cause: error,
      });
    }

    return this.mapToDomain(data);
  }

  async findById(id: string): Promise<ImportJob | null> {
    const { data, error } = await this.client
      .from("import_jobs")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new RepositoryError("DATABASE_ERROR", "findImportJobById", {
        cause: error,
      });
    }

    if (!data) return null;
    return this.mapToDomain(data);
  }

  private mapToDomain(row: Database["public"]["Tables"]["import_jobs"]["Row"]): ImportJob {
    return {
      id: row.id,
      data_source_id: row.data_source_id,
      environment: row.environment,
      status: row.status,
      started_at: row.started_at,
      completed_at: row.completed_at,
      is_dry_run: row.is_dry_run,
      metrics: {
        total_records: row.total_records,
        processed_records: row.processed_records,
        failed_records: row.failed_records,
        inserted_records: row.inserted_records,
        updated_records: row.updated_records,
      },
      error_log: (row.error_log as unknown as JsonObject) ?? null,
      metadata: (row.metadata as unknown as JsonObject) ?? {},
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
