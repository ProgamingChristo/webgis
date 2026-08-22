import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/types/database.types";
import { mapDatabaseError } from "@/src/repositories/errors";
import type { JsonObject } from "@/src/types/provenance";
import type { DatasetVersion, CreateDatasetVersionInput, UpdateDatasetVersionInput } from "./dataset-version.types";

export class DatasetVersionRepository {
  constructor(private client: SupabaseClient<Database>) {}

  private mapRowToModel(row: Database["public"]["Tables"]["dataset_versions"]["Row"]): DatasetVersion {
    return {
      ...row,
      manifest: (row.manifest as unknown as JsonObject) ?? {},
    };
  }

  async findById(id: string): Promise<DatasetVersion | null> {
    const { data, error } = await this.client
      .from("dataset_versions")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw mapDatabaseError(error, "findById");
    }

    return data ? this.mapRowToModel(data) : null;
  }

  async findByCode(code: string): Promise<DatasetVersion | null> {
    const { data, error } = await this.client
      .from("dataset_versions")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (error) {
      throw mapDatabaseError(error, "findByCode");
    }

    return data ? this.mapRowToModel(data) : null;
  }

  async create(input: CreateDatasetVersionInput): Promise<DatasetVersion> {
    const { data, error } = await this.client
      .from("dataset_versions")
      .insert([
        {
          code: input.code,
          version: input.version,
          environment: input.environment,
          status: input.status ?? "DRAFT",
          description: input.description ?? null,
          manifest: (input.manifest ?? {}) as unknown as JsonObject,
          validated_at: input.validated_at ?? null,
          activated_at: input.activated_at ?? null,
        },
      ])
      .select("*")
      .single();

    if (error) {
      throw mapDatabaseError(error, "create");
    }

    return this.mapRowToModel(data);
  }

  async update(id: string, input: UpdateDatasetVersionInput): Promise<DatasetVersion> {
    const updateData: any = { ...input };
    if (input.manifest) {
      updateData.manifest = input.manifest as unknown as JsonObject;
    }
    
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await this.client
      .from("dataset_versions")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw mapDatabaseError(error, "update");
    }

    return this.mapRowToModel(data);
  }
}
