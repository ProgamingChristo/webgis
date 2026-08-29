import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { mapTransportNodeRowToDTO } from "@/src/mappers/domain.mapper";
import {
  createTransportNodeSchema,
  transportNodeFilterSchema,
  transportNodeListQuerySchema,
  updateTransportNodeSchema,
} from "@/src/schemas/data-model.schema";
import {
  boundingBoxSchema,
  nearPointSchema,
} from "@/src/schemas/spatial.schema";
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
  CreateTransportNodeInput,
  TransportNodeDatabaseRow,
  TransportNodeDTO,
  TransportNodeFilter,
  TransportNodeListQuery,
  UpdateTransportNodeInput,
} from "@/src/types/domain";
import type { BoundingBox, NearPoint } from "@/src/types/spatial";

export const TRANSPORT_NODE_COLUMNS =
  "id, source_id, source_record_id, data_version, validation_status, retrieved_at, validated_at, metadata, corridor_id, name, node_type, transport_mode, geometry, created_at, updated_at, source:spatial_sources(source_type)";

type NodeListSource =
  | { kind: "table" }
  | { bbox: BoundingBox; kind: "bbox" }
  | { kind: "near"; near: NearPoint };

function toWgs84PointEwkt(point: NearPoint): string {
  return `SRID=4326;POINT(${point.longitude} ${point.latitude})`;
}

export class TransportNodeRepository
  implements
    ReadRepository<TransportNodeDTO, TransportNodeListQuery, TransportNodeFilter>,
    WriteRepository<
      TransportNodeDTO,
      CreateTransportNodeInput,
      UpdateTransportNodeInput
    >
{
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(id: string): Promise<TransportNodeDTO | null> {
    const { data, error } = await this.supabase
      .from("transport_nodes")
      .select(TRANSPORT_NODE_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error) throw mapDatabaseError(error, "transportNodes.findById");

    return data
      ? mapRepositoryRow<TransportNodeDatabaseRow, TransportNodeDTO>(
          data,
          mapTransportNodeRowToDTO,
          "transportNodes.findById.map",
        )
      : null;
  }

  async findMany(
    options: TransportNodeListQuery,
  ): Promise<RepositoryPage<TransportNodeDTO>> {
    const parsed = parseRepositoryInput(
      transportNodeListQuerySchema,
      options,
      "transportNodes.findMany.validate",
    );
    return this.executeListQuery({ kind: "table" }, parsed);
  }

  async findWithinBBox(
    bbox: BoundingBox,
    options: TransportNodeListQuery,
  ): Promise<RepositoryPage<TransportNodeDTO>> {
    const parsedBbox = parseRepositoryInput(
      boundingBoxSchema,
      bbox,
      "transportNodes.findWithinBBox.validateBBox",
    );
    const parsedOptions = parseRepositoryInput(
      transportNodeListQuerySchema,
      options,
      "transportNodes.findWithinBBox.validateQuery",
    );
    return this.executeListQuery({ bbox: parsedBbox, kind: "bbox" }, parsedOptions);
  }

  async findNear(
    near: NearPoint,
    options: TransportNodeListQuery,
  ): Promise<RepositoryPage<TransportNodeDTO>> {
    const parsedNear = parseRepositoryInput(
      nearPointSchema,
      near,
      "transportNodes.findNear.validatePoint",
    );
    const parsedOptions = parseRepositoryInput(
      transportNodeListQuerySchema,
      options,
      "transportNodes.findNear.validateQuery",
    );
    return this.executeListQuery({ kind: "near", near: parsedNear }, parsedOptions);
  }

  private async executeListQuery(
    source: NodeListSource,
    options: TransportNodeListQuery,
  ): Promise<RepositoryPage<TransportNodeDTO>> {
    const pagination = assertRepositoryPagination(options);
    let query = source.kind === "bbox"
      ? this.supabase
          .rpc("find_transport_nodes_within_bbox", source.bbox, {
            count: "exact",
          })
          .select(TRANSPORT_NODE_COLUMNS)
      : source.kind === "near"
        ? this.supabase
            .rpc(
              "find_transport_nodes_near",
              {
                origin: toWgs84PointEwkt(source.near),
                radius_meters: source.near.radius_meters,
              },
              { count: "exact" },
            )
            .select(TRANSPORT_NODE_COLUMNS)
        : this.supabase
            .from("transport_nodes")
            .select(TRANSPORT_NODE_COLUMNS, { count: "exact" });

    if (options.source_id) query = query.eq("source_id", options.source_id);
    if (options.corridor_id) {
      query = query.eq("corridor_id", options.corridor_id);
    }
    if (options.transport_mode) {
      query = query.eq("transport_mode", options.transport_mode);
    }
    if (options.node_type) query = query.eq("node_type", options.node_type);
    if (options.validation_status) {
      query = query.eq("validation_status", options.validation_status);
    }

    // For "near" queries the RPC already orders by ST_Distance(origin);
    // applying an arbitrary secondary .order() would override that spatial
    // ordering and break "nearest" semantics, so we keep the RPC order.
    const orderedQuery =
      source.kind === "near"
        ? query
        : query.order(options.sort, { ascending: options.order === "asc" });

    const { data, error, count } = await orderedQuery.range(
      pagination.offset,
      pagination.offset + pagination.limit - 1,
    );

    if (error) {
      const operation = source.kind === "bbox"
        ? "transportNodes.findWithinBBox"
        : source.kind === "near"
          ? "transportNodes.findNear"
          : "transportNodes.findMany";
      throw mapDatabaseError(error, operation);
    }

    return {
      ...pagination,
      items: mapRepositoryRows<TransportNodeDatabaseRow, TransportNodeDTO>(
        normalizeRepositoryRows(data, "transportNodes.list.rows"),
        mapTransportNodeRowToDTO,
        "transportNodes.list.map",
      ),
      total: count ?? 0,
    };
  }

  async exists(id: string): Promise<boolean> {
    const { count, error } = await this.supabase
      .from("transport_nodes")
      .select("id", { count: "exact", head: true })
      .eq("id", id);
    if (error) throw mapDatabaseError(error, "transportNodes.exists");
    return (count ?? 0) > 0;
  }

  async count(filters: TransportNodeFilter = {}): Promise<number> {
    const parsed = parseRepositoryInput(
      transportNodeFilterSchema,
      filters,
      "transportNodes.count.validate",
    );
    let query = this.supabase
      .from("transport_nodes")
      .select("id", { count: "exact", head: true });

    if (parsed.source_id) query = query.eq("source_id", parsed.source_id);
    if (parsed.corridor_id) query = query.eq("corridor_id", parsed.corridor_id);
    if (parsed.transport_mode) {
      query = query.eq("transport_mode", parsed.transport_mode);
    }
    if (parsed.node_type) query = query.eq("node_type", parsed.node_type);
    if (parsed.validation_status) {
      query = query.eq("validation_status", parsed.validation_status);
    }

    const { count, error } = await query;
    if (error) throw mapDatabaseError(error, "transportNodes.count");
    return count ?? 0;
  }

  async create(input: CreateTransportNodeInput): Promise<TransportNodeDTO> {
    const parsed = parseRepositoryInput(
      createTransportNodeSchema,
      input,
      "transportNodes.create.validate",
    );
    const { provenance, ...entity } = parsed;
    const payload = { ...entity, ...createProvenanceColumns(provenance) };
    const { data, error } = await this.supabase
      .from("transport_nodes")
      .insert(payload)
      .select(TRANSPORT_NODE_COLUMNS)
      .single();

    if (error) throw mapDatabaseError(error, "transportNodes.create");
    return mapRepositoryRow<TransportNodeDatabaseRow, TransportNodeDTO>(
      data,
      mapTransportNodeRowToDTO,
      "transportNodes.create.map",
    );
  }

  async update(
    id: string,
    input: UpdateTransportNodeInput,
  ): Promise<TransportNodeDTO> {
    const parsed = parseRepositoryInput(
      updateTransportNodeSchema,
      input,
      "transportNodes.update.validate",
    );
    const { provenance, ...entity } = parsed;
    const payload = { ...entity, ...updateProvenanceColumns(provenance) };
    const { data, error } = await this.supabase
      .from("transport_nodes")
      .update(payload)
      .eq("id", id)
      .select(TRANSPORT_NODE_COLUMNS)
      .maybeSingle();

    if (error) throw mapDatabaseError(error, "transportNodes.update");
    if (!data) throw new RepositoryError("NOT_FOUND", "transportNodes.update");
    return mapRepositoryRow<TransportNodeDatabaseRow, TransportNodeDTO>(
      data,
      mapTransportNodeRowToDTO,
      "transportNodes.update.map",
    );
  }
}
