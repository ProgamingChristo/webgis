import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  canonicalizeCorridorGeometry,
} from "@/src/mappers/geometry.mapper";
import { mapTransportCorridorRowToDTO } from "@/src/mappers/domain.mapper";
import {
  createTransportCorridorSchema,
  transportCorridorFilterSchema,
  transportCorridorListQuerySchema,
  updateTransportCorridorSchema,
} from "@/src/schemas/data-model.schema";
import { boundingBoxSchema } from "@/src/schemas/spatial.schema";
import {
  assertRepositoryPagination,
  type ReadRepository,
  type RepositoryPage,
  type WriteRepository,
} from "@/src/repositories/contracts";
import { mapDatabaseError, RepositoryError } from "@/src/repositories/errors";
import {
  createProvenanceColumns,
  mapRepositoryRow,
  mapRepositoryRows,
  normalizeRepositoryRows,
  parseRepositoryInput,
  updateProvenanceColumns,
} from "@/src/repositories/repository.utils";
import type {
  CreateTransportCorridorInput,
  TransportCorridorDatabaseRow,
  TransportCorridorDTO,
  TransportCorridorFilter,
  TransportCorridorListQuery,
  UpdateTransportCorridorInput,
} from "@/src/types/domain";
import type { BoundingBox } from "@/src/types/spatial";

const TRANSPORT_CORRIDOR_COLUMNS =
  "id, source_id, source_record_id, data_version, validation_status, retrieved_at, validated_at, metadata, name, transport_mode, description, geometry, created_at, updated_at, source:spatial_sources(source_type)";

export class TransportCorridorRepository
  implements
    ReadRepository<
      TransportCorridorDTO,
      TransportCorridorListQuery,
      TransportCorridorFilter
    >,
    WriteRepository<
      TransportCorridorDTO,
      CreateTransportCorridorInput,
      UpdateTransportCorridorInput
    >
{
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(id: string): Promise<TransportCorridorDTO | null> {
    const { data, error } = await this.supabase
      .from("transport_corridors")
      .select(TRANSPORT_CORRIDOR_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw mapDatabaseError(error, "transportCorridors.findById");
    }

    return data
      ? mapRepositoryRow<TransportCorridorDatabaseRow, TransportCorridorDTO>(
          data,
          mapTransportCorridorRowToDTO,
          "transportCorridors.findById.map",
        )
      : null;
  }

  async findMany(
    options: TransportCorridorListQuery,
  ): Promise<RepositoryPage<TransportCorridorDTO>> {
    const parsed = parseRepositoryInput(
      transportCorridorListQuerySchema,
      options,
      "transportCorridors.findMany.validate",
    );
    return this.executeListQuery("table", parsed);
  }

  async findWithinBBox(
    bbox: BoundingBox,
    options: TransportCorridorListQuery,
  ): Promise<RepositoryPage<TransportCorridorDTO>> {
    const parsedBbox = parseRepositoryInput(
      boundingBoxSchema,
      bbox,
      "transportCorridors.findWithinBBox.validateBBox",
    );
    const parsedOptions = parseRepositoryInput(
      transportCorridorListQuerySchema,
      options,
      "transportCorridors.findWithinBBox.validateQuery",
    );
    return this.executeListQuery("bbox", parsedOptions, parsedBbox);
  }

  private async executeListQuery(
    source: "table" | "bbox",
    options: TransportCorridorListQuery,
    bbox?: BoundingBox,
  ): Promise<RepositoryPage<TransportCorridorDTO>> {
    const pagination = assertRepositoryPagination(options);
    let query = source === "bbox" && bbox
      ? this.supabase
          .rpc("find_transport_corridors_within_bbox", bbox, { count: "exact" })
          .select(TRANSPORT_CORRIDOR_COLUMNS)
      : this.supabase
          .from("transport_corridors")
          .select(TRANSPORT_CORRIDOR_COLUMNS, { count: "exact" });

    if (options.source_id) {
      query = query.eq("source_id", options.source_id);
    }

    if (options.transport_mode) {
      query = query.eq("transport_mode", options.transport_mode);
    }

    if (options.validation_status) {
      query = query.eq("validation_status", options.validation_status);
    }

    const { data, error, count } = await query
      .order(options.sort, { ascending: options.order === "asc" })
      .range(pagination.offset, pagination.offset + pagination.limit - 1);

    if (error) {
      throw mapDatabaseError(
        error,
        source === "bbox"
          ? "transportCorridors.findWithinBBox"
          : "transportCorridors.findMany",
      );
    }

    return {
      ...pagination,
      items: mapRepositoryRows<
        TransportCorridorDatabaseRow,
        TransportCorridorDTO
      >(
        normalizeRepositoryRows(data, "transportCorridors.list.rows"),
        mapTransportCorridorRowToDTO,
        "transportCorridors.list.map",
      ),
      total: count ?? 0,
    };
  }

  async exists(id: string): Promise<boolean> {
    const { count, error } = await this.supabase
      .from("transport_corridors")
      .select("id", { count: "exact", head: true })
      .eq("id", id);

    if (error) {
      throw mapDatabaseError(error, "transportCorridors.exists");
    }

    return (count ?? 0) > 0;
  }

  async count(filters: TransportCorridorFilter = {}): Promise<number> {
    const parsed = parseRepositoryInput(
      transportCorridorFilterSchema,
      filters,
      "transportCorridors.count.validate",
    );
    let query = this.supabase
      .from("transport_corridors")
      .select("id", { count: "exact", head: true });

    if (parsed.source_id) query = query.eq("source_id", parsed.source_id);
    if (parsed.transport_mode) {
      query = query.eq("transport_mode", parsed.transport_mode);
    }
    if (parsed.validation_status) {
      query = query.eq("validation_status", parsed.validation_status);
    }

    const { count, error } = await query;

    if (error) {
      throw mapDatabaseError(error, "transportCorridors.count");
    }

    return count ?? 0;
  }

  async create(
    input: CreateTransportCorridorInput,
  ): Promise<TransportCorridorDTO> {
    const parsed = parseRepositoryInput(
      createTransportCorridorSchema,
      input,
      "transportCorridors.create.validate",
    );
    const { provenance, geometry, ...entity } = parsed;
    const payload = {
      ...entity,
      ...createProvenanceColumns(provenance),
      geometry: canonicalizeCorridorGeometry(geometry),
    };
    const { data, error } = await this.supabase
      .from("transport_corridors")
      .insert(payload)
      .select(TRANSPORT_CORRIDOR_COLUMNS)
      .single();

    if (error) {
      throw mapDatabaseError(error, "transportCorridors.create");
    }

    return mapRepositoryRow<TransportCorridorDatabaseRow, TransportCorridorDTO>(
      data,
      mapTransportCorridorRowToDTO,
      "transportCorridors.create.map",
    );
  }

  async update(
    id: string,
    input: UpdateTransportCorridorInput,
  ): Promise<TransportCorridorDTO> {
    const parsed = parseRepositoryInput(
      updateTransportCorridorSchema,
      input,
      "transportCorridors.update.validate",
    );
    const { provenance, geometry, ...entity } = parsed;
    const payload = {
      ...entity,
      ...updateProvenanceColumns(provenance),
      ...(geometry ? { geometry: canonicalizeCorridorGeometry(geometry) } : {}),
    };
    const { data, error } = await this.supabase
      .from("transport_corridors")
      .update(payload)
      .eq("id", id)
      .select(TRANSPORT_CORRIDOR_COLUMNS)
      .maybeSingle();

    if (error) {
      throw mapDatabaseError(error, "transportCorridors.update");
    }

    if (!data) {
      throw new RepositoryError("NOT_FOUND", "transportCorridors.update");
    }

    return mapRepositoryRow<TransportCorridorDatabaseRow, TransportCorridorDTO>(
      data,
      mapTransportCorridorRowToDTO,
      "transportCorridors.update.map",
    );
  }
}
