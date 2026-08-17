import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { mapUmkmProfileRowToDTO } from "@/src/mappers/domain.mapper";
import {
  createUmkmProfileSchema,
  umkmProfileFilterSchema,
  umkmProfileListQuerySchema,
  updateProvenanceSchema,
  updateUmkmProfileSchema,
} from "@/src/schemas/data-model.schema";
import {
  boundingBoxSchema,
  nearPointSchema,
} from "@/src/schemas/spatial.schema";
import {
  assertRepositoryPagination,
  type ReadRepository,
  type RepositoryPage,
} from "@/src/repositories/contracts";
import { mapDatabaseError, RepositoryError } from "@/src/repositories/errors";
import {
  mapRepositoryRow,
  mapRepositoryRows,
  normalizeRepositoryRows,
  parseRepositoryInput,
  updateProvenanceColumns,
} from "@/src/repositories/repository.utils";
import type {
  CreateUmkmProfileInput,
  UmkmProfileDatabaseRow,
  UmkmProfileDTO,
  UmkmProfileFilter,
  UmkmProfileListQuery,
  UpdateUmkmProfileInput,
} from "@/src/types/domain";
import type { UpdateProvenanceInput } from "@/src/types/provenance";
import type { BoundingBox, NearPoint } from "@/src/types/spatial";

export const UMKM_PROFILE_COLUMNS =
  "id, owner_id, source_id, source_record_id, data_version, validation_status, retrieved_at, validated_at, metadata, business_name, category, description, address, geometry, created_at, updated_at, source:spatial_sources(source_type)";

type UmkmListSource =
  | { kind: "table" }
  | { bbox: BoundingBox; kind: "bbox" }
  | { kind: "near"; near: NearPoint };

function toWgs84PointEwkt(point: NearPoint): string {
  return `SRID=4326;POINT(${point.longitude} ${point.latitude})`;
}

export class UmkmProfileRepository
  implements
    ReadRepository<UmkmProfileDTO, UmkmProfileListQuery, UmkmProfileFilter>
{
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(id: string): Promise<UmkmProfileDTO | null> {
    const { data, error } = await this.supabase
      .from("umkm_profiles")
      .select(UMKM_PROFILE_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw mapDatabaseError(error, "umkmProfiles.findById");
    return data
      ? mapRepositoryRow<UmkmProfileDatabaseRow, UmkmProfileDTO>(
          data,
          mapUmkmProfileRowToDTO,
          "umkmProfiles.findById.map",
        )
      : null;
  }

  async findMany(
    options: UmkmProfileListQuery,
  ): Promise<RepositoryPage<UmkmProfileDTO>> {
    const parsed = parseRepositoryInput(
      umkmProfileListQuerySchema,
      options,
      "umkmProfiles.findMany.validate",
    );
    return this.executeListQuery({ kind: "table" }, parsed);
  }

  async findWithinBBox(
    bbox: BoundingBox,
    options: UmkmProfileListQuery,
  ): Promise<RepositoryPage<UmkmProfileDTO>> {
    const parsedBbox = parseRepositoryInput(
      boundingBoxSchema,
      bbox,
      "umkmProfiles.findWithinBBox.validateBBox",
    );
    const parsedOptions = parseRepositoryInput(
      umkmProfileListQuerySchema,
      options,
      "umkmProfiles.findWithinBBox.validateQuery",
    );
    return this.executeListQuery({ bbox: parsedBbox, kind: "bbox" }, parsedOptions);
  }

  async findNear(
    near: NearPoint,
    options: UmkmProfileListQuery,
  ): Promise<RepositoryPage<UmkmProfileDTO>> {
    const parsedNear = parseRepositoryInput(
      nearPointSchema,
      near,
      "umkmProfiles.findNear.validatePoint",
    );
    const parsedOptions = parseRepositoryInput(
      umkmProfileListQuerySchema,
      options,
      "umkmProfiles.findNear.validateQuery",
    );
    return this.executeListQuery({ kind: "near", near: parsedNear }, parsedOptions);
  }

  private async executeListQuery(
    source: UmkmListSource,
    options: UmkmProfileListQuery,
  ): Promise<RepositoryPage<UmkmProfileDTO>> {
    const pagination = assertRepositoryPagination(options);
    let query = source.kind === "bbox"
      ? this.supabase
          .rpc("find_umkm_profiles_within_bbox", source.bbox, {
            count: "exact",
          })
          .select(UMKM_PROFILE_COLUMNS)
      : source.kind === "near"
        ? this.supabase
            .rpc(
              "find_umkm_profiles_near",
              {
                origin: toWgs84PointEwkt(source.near),
                radius_meters: source.near.radius_meters,
              },
              { count: "exact" },
            )
            .select(UMKM_PROFILE_COLUMNS)
        : this.supabase
            .from("umkm_profiles")
            .select(UMKM_PROFILE_COLUMNS, { count: "exact" });

    if (options.owner_id) query = query.eq("owner_id", options.owner_id);
    if (options.source_id) query = query.eq("source_id", options.source_id);
    if (options.category) query = query.eq("category", options.category);
    if (options.validation_status) {
      query = query.eq("validation_status", options.validation_status);
    }

    const { data, error, count } = await query
      .order(options.sort, { ascending: options.order === "asc" })
      .range(pagination.offset, pagination.offset + pagination.limit - 1);

    if (error) {
      const operation = source.kind === "bbox"
        ? "umkmProfiles.findWithinBBox"
        : source.kind === "near"
          ? "umkmProfiles.findNear"
          : "umkmProfiles.findMany";
      throw mapDatabaseError(error, operation);
    }

    return {
      ...pagination,
      items: mapRepositoryRows<UmkmProfileDatabaseRow, UmkmProfileDTO>(
        normalizeRepositoryRows(data, "umkmProfiles.list.rows"),
        mapUmkmProfileRowToDTO,
        "umkmProfiles.list.map",
      ),
      total: count ?? 0,
    };
  }

  async exists(id: string): Promise<boolean> {
    const { count, error } = await this.supabase
      .from("umkm_profiles")
      .select("id", { count: "exact", head: true })
      .eq("id", id);
    if (error) throw mapDatabaseError(error, "umkmProfiles.exists");
    return (count ?? 0) > 0;
  }

  async count(filters: UmkmProfileFilter = {}): Promise<number> {
    const parsed = parseRepositoryInput(
      umkmProfileFilterSchema,
      filters,
      "umkmProfiles.count.validate",
    );
    let query = this.supabase
      .from("umkm_profiles")
      .select("id", { count: "exact", head: true });
    if (parsed.owner_id) query = query.eq("owner_id", parsed.owner_id);
    if (parsed.source_id) query = query.eq("source_id", parsed.source_id);
    if (parsed.category) query = query.eq("category", parsed.category);
    if (parsed.validation_status) {
      query = query.eq("validation_status", parsed.validation_status);
    }
    const { count, error } = await query;
    if (error) throw mapDatabaseError(error, "umkmProfiles.count");
    return count ?? 0;
  }

  async createForOwner(
    ownerId: string,
    input: CreateUmkmProfileInput,
  ): Promise<UmkmProfileDTO> {
    const parsedOwnerId = parseRepositoryInput(
      z.string().uuid(),
      ownerId,
      "umkmProfiles.create.validateOwner",
    );
    const parsed = parseRepositoryInput(
      createUmkmProfileSchema,
      input,
      "umkmProfiles.create.validate",
    );
    const { data, error } = await this.supabase
      .from("umkm_profiles")
      .insert({ ...parsed, owner_id: parsedOwnerId })
      .select(UMKM_PROFILE_COLUMNS)
      .single();
    if (error) throw mapDatabaseError(error, "umkmProfiles.create");
    return mapRepositoryRow<UmkmProfileDatabaseRow, UmkmProfileDTO>(
      data,
      mapUmkmProfileRowToDTO,
      "umkmProfiles.create.map",
    );
  }

  async update(
    id: string,
    input: UpdateUmkmProfileInput,
  ): Promise<UmkmProfileDTO> {
    const parsed = parseRepositoryInput(
      updateUmkmProfileSchema,
      input,
      "umkmProfiles.update.validate",
    );
    return this.executeUpdate(id, parsed, "umkmProfiles.update");
  }

  async updateTrustedProvenance(
    id: string,
    input: UpdateProvenanceInput,
  ): Promise<UmkmProfileDTO> {
    const parsed = parseRepositoryInput(
      updateProvenanceSchema,
      input,
      "umkmProfiles.updateProvenance.validate",
    );
    return this.executeUpdate(
      id,
      updateProvenanceColumns(parsed),
      "umkmProfiles.updateProvenance",
    );
  }

  private async executeUpdate(
    id: string,
    payload: Record<string, unknown>,
    operation: string,
  ): Promise<UmkmProfileDTO> {
    const { data, error } = await this.supabase
      .from("umkm_profiles")
      .update(payload)
      .eq("id", id)
      .select(UMKM_PROFILE_COLUMNS)
      .maybeSingle();
    if (error) throw mapDatabaseError(error, operation);
    if (!data) throw new RepositoryError("NOT_FOUND", operation);
    return mapRepositoryRow<UmkmProfileDatabaseRow, UmkmProfileDTO>(
      data,
      mapUmkmProfileRowToDTO,
      `${operation}.map`,
    );
  }
}
