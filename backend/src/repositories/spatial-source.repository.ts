import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { mapSpatialSourceRowToDTO } from "@/src/mappers/domain.mapper";
import {
  createSpatialSourceSchema,
  spatialSourceFilterSchema,
  spatialSourceListQuerySchema,
  updateSpatialSourceSchema,
} from "@/src/schemas/data-model.schema";
import {
  assertRepositoryPagination,
  type ReadRepository,
  type RepositoryPage,
  type WriteRepository,
} from "@/src/repositories/contracts";
import { mapDatabaseError, RepositoryError } from "@/src/repositories/errors";
import {
  mapRepositoryRow,
  mapRepositoryRows,
  parseRepositoryInput,
} from "@/src/repositories/repository.utils";
import type {
  CreateSpatialSourceInput,
  SpatialSourceDatabaseRow,
  SpatialSourceDTO,
  SpatialSourceFilter,
  SpatialSourceListQuery,
  UpdateSpatialSourceInput,
} from "@/src/types/domain";

const SPATIAL_SOURCE_COLUMNS =
  "id, source_name, source_type, description, metadata, created_at, updated_at";

export class SpatialSourceRepository
  implements
    ReadRepository<SpatialSourceDTO, SpatialSourceListQuery, SpatialSourceFilter>,
    WriteRepository<
      SpatialSourceDTO,
      CreateSpatialSourceInput,
      UpdateSpatialSourceInput
    >
{
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(id: string): Promise<SpatialSourceDTO | null> {
    const { data, error } = await this.supabase
      .from("spatial_sources")
      .select(SPATIAL_SOURCE_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw mapDatabaseError(error, "spatialSources.findById");
    }

    return data
      ? mapRepositoryRow<SpatialSourceDatabaseRow, SpatialSourceDTO>(
          data,
          mapSpatialSourceRowToDTO,
          "spatialSources.findById.map",
        )
      : null;
  }

  async findSourceById(id: string): Promise<SpatialSourceDTO | null> {
    return this.findById(id);
  }

  async findMany(
    options: SpatialSourceListQuery,
  ): Promise<RepositoryPage<SpatialSourceDTO>> {
    const parsed = parseRepositoryInput(
      spatialSourceListQuerySchema,
      options,
      "spatialSources.findMany.validate",
    );
    const pagination = assertRepositoryPagination(parsed);
    let query = this.supabase
      .from("spatial_sources")
      .select(SPATIAL_SOURCE_COLUMNS, { count: "exact" });

    if (parsed.source_type) {
      query = query.eq("source_type", parsed.source_type);
    }

    const { data, error, count } = await query
      .order(parsed.sort, { ascending: parsed.order === "asc" })
      .range(pagination.offset, pagination.offset + pagination.limit - 1);

    if (error) {
      throw mapDatabaseError(error, "spatialSources.findMany");
    }

    return {
      ...pagination,
      items: mapRepositoryRows<SpatialSourceDatabaseRow, SpatialSourceDTO>(
        data,
        mapSpatialSourceRowToDTO,
        "spatialSources.findMany.map",
      ),
      total: count ?? 0,
    };
  }

  async exists(id: string): Promise<boolean> {
    const { count, error } = await this.supabase
      .from("spatial_sources")
      .select("id", { count: "exact", head: true })
      .eq("id", id);

    if (error) {
      throw mapDatabaseError(error, "spatialSources.exists");
    }

    return (count ?? 0) > 0;
  }

  async count(filters: SpatialSourceFilter = {}): Promise<number> {
    const parsed = parseRepositoryInput(
      spatialSourceFilterSchema,
      filters,
      "spatialSources.count.validate",
    );
    let query = this.supabase
      .from("spatial_sources")
      .select("id", { count: "exact", head: true });

    if (parsed.source_type) {
      query = query.eq("source_type", parsed.source_type);
    }

    const { count, error } = await query;

    if (error) {
      throw mapDatabaseError(error, "spatialSources.count");
    }

    return count ?? 0;
  }

  async create(input: CreateSpatialSourceInput): Promise<SpatialSourceDTO> {
    const parsed = parseRepositoryInput(
      createSpatialSourceSchema,
      input,
      "spatialSources.create.validate",
    );
    const { data, error } = await this.supabase
      .from("spatial_sources")
      .insert(parsed)
      .select(SPATIAL_SOURCE_COLUMNS)
      .single();

    if (error) {
      throw mapDatabaseError(error, "spatialSources.create");
    }

    return mapRepositoryRow<SpatialSourceDatabaseRow, SpatialSourceDTO>(
      data,
      mapSpatialSourceRowToDTO,
      "spatialSources.create.map",
    );
  }

  async update(
    id: string,
    input: UpdateSpatialSourceInput,
  ): Promise<SpatialSourceDTO> {
    const parsed = parseRepositoryInput(
      updateSpatialSourceSchema,
      input,
      "spatialSources.update.validate",
    );
    const { data, error } = await this.supabase
      .from("spatial_sources")
      .update(parsed)
      .eq("id", id)
      .select(SPATIAL_SOURCE_COLUMNS)
      .maybeSingle();

    if (error) {
      throw mapDatabaseError(error, "spatialSources.update");
    }

    if (!data) {
      throw new RepositoryError("NOT_FOUND", "spatialSources.update");
    }

    return mapRepositoryRow<SpatialSourceDatabaseRow, SpatialSourceDTO>(
      data,
      mapSpatialSourceRowToDTO,
      "spatialSources.update.map",
    );
  }
}
