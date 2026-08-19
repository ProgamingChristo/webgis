import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { mapTransportRouteStopRowToDTO } from "@/src/mappers/domain.mapper";
import {
  createTransportRouteStopSchema,
  transportRouteStopFilterSchema,
  transportRouteStopListQuerySchema,
  updateTransportRouteStopSchema,
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
  normalizeRepositoryRows,
  parseRepositoryInput,
} from "@/src/repositories/repository.utils";
import type {
  CreateTransportRouteStopInput,
  TransportRouteStopDatabaseRow,
  TransportRouteStopDTO,
  TransportRouteStopFilter,
  TransportRouteStopListQuery,
  UpdateTransportRouteStopInput,
} from "@/src/types/domain";

export const TRANSPORT_ROUTE_STOP_COLUMNS =
  "id, corridor_id, node_id, stop_sequence, created_at, updated_at";

export class TransportRouteStopRepository
  implements
    ReadRepository<
      TransportRouteStopDTO,
      TransportRouteStopListQuery,
      TransportRouteStopFilter
    >,
    WriteRepository<
      TransportRouteStopDTO,
      CreateTransportRouteStopInput,
      UpdateTransportRouteStopInput
    >
{
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(id: string): Promise<TransportRouteStopDTO | null> {
    const { data, error } = await this.supabase
      .from("transport_route_stops")
      .select(TRANSPORT_ROUTE_STOP_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw mapDatabaseError(error, "transportRouteStops.findById");
    }

    return data
      ? mapRepositoryRow<TransportRouteStopDatabaseRow, TransportRouteStopDTO>(
          data,
          mapTransportRouteStopRowToDTO,
          "transportRouteStops.findById.map",
        )
      : null;
  }

  async findMany(
    options: TransportRouteStopListQuery,
  ): Promise<RepositoryPage<TransportRouteStopDTO>> {
    const parsed = parseRepositoryInput(
      transportRouteStopListQuerySchema,
      options,
      "transportRouteStops.findMany.validate",
    );
    return this.executeListQuery(parsed);
  }

  private async executeListQuery(
    options: TransportRouteStopListQuery,
  ): Promise<RepositoryPage<TransportRouteStopDTO>> {
    const pagination = assertRepositoryPagination(options);
    let query = this.supabase
      .from("transport_route_stops")
      .select(TRANSPORT_ROUTE_STOP_COLUMNS, { count: "exact" });

    if (options.corridor_id) {
      query = query.eq("corridor_id", options.corridor_id);
    }
    if (options.node_id) {
      query = query.eq("node_id", options.node_id);
    }

    const { data, error, count } = await query
      .order(options.sort, { ascending: options.order === "asc" })
      .range(pagination.offset, pagination.offset + pagination.limit - 1);

    if (error) {
      throw mapDatabaseError(error, "transportRouteStops.findMany");
    }

    return {
      ...pagination,
      items: mapRepositoryRows<
        TransportRouteStopDatabaseRow,
        TransportRouteStopDTO
      >(
        normalizeRepositoryRows(data, "transportRouteStops.list.rows"),
        mapTransportRouteStopRowToDTO,
        "transportRouteStops.list.map",
      ),
      total: count ?? 0,
    };
  }

  async exists(id: string): Promise<boolean> {
    const { count, error } = await this.supabase
      .from("transport_route_stops")
      .select("id", { count: "exact", head: true })
      .eq("id", id);

    if (error) {
      throw mapDatabaseError(error, "transportRouteStops.exists");
    }

    return (count ?? 0) > 0;
  }

  async count(filters: TransportRouteStopFilter = {}): Promise<number> {
    const parsed = parseRepositoryInput(
      transportRouteStopFilterSchema,
      filters,
      "transportRouteStops.count.validate",
    );
    let query = this.supabase
      .from("transport_route_stops")
      .select("id", { count: "exact", head: true });

    if (parsed.corridor_id) query = query.eq("corridor_id", parsed.corridor_id);
    if (parsed.node_id) query = query.eq("node_id", parsed.node_id);

    const { count, error } = await query;

    if (error) {
      throw mapDatabaseError(error, "transportRouteStops.count");
    }

    return count ?? 0;
  }

  async create(
    input: CreateTransportRouteStopInput,
  ): Promise<TransportRouteStopDTO> {
    const parsed = parseRepositoryInput(
      createTransportRouteStopSchema,
      input,
      "transportRouteStops.create.validate",
    );
    const { data, error } = await this.supabase
      .from("transport_route_stops")
      .insert(parsed)
      .select(TRANSPORT_ROUTE_STOP_COLUMNS)
      .single();

    if (error) {
      throw mapDatabaseError(error, "transportRouteStops.create");
    }

    return mapRepositoryRow<TransportRouteStopDatabaseRow, TransportRouteStopDTO>(
      data,
      mapTransportRouteStopRowToDTO,
      "transportRouteStops.create.map",
    );
  }

  async update(
    id: string,
    input: UpdateTransportRouteStopInput,
  ): Promise<TransportRouteStopDTO> {
    const parsed = parseRepositoryInput(
      updateTransportRouteStopSchema,
      input,
      "transportRouteStops.update.validate",
    );
    const { data, error } = await this.supabase
      .from("transport_route_stops")
      .update(parsed)
      .eq("id", id)
      .select(TRANSPORT_ROUTE_STOP_COLUMNS)
      .maybeSingle();

    if (error) {
      throw mapDatabaseError(error, "transportRouteStops.update");
    }

    if (!data) {
      throw new RepositoryError("NOT_FOUND", "transportRouteStops.update");
    }

    return mapRepositoryRow<TransportRouteStopDatabaseRow, TransportRouteStopDTO>(
      data,
      mapTransportRouteStopRowToDTO,
      "transportRouteStops.update.map",
    );
  }

  async upsertByCorridorAndNode(
    input: CreateTransportRouteStopInput,
  ): Promise<TransportRouteStopDTO> {
    const parsed = parseRepositoryInput(
      createTransportRouteStopSchema,
      input,
      "transportRouteStops.upsert.validate",
    );
    const { data, error } = await this.supabase
      .from("transport_route_stops")
      .upsert(parsed, { onConflict: "corridor_id,node_id" })
      .select(TRANSPORT_ROUTE_STOP_COLUMNS)
      .single();

    if (error) {
      throw mapDatabaseError(error, "transportRouteStops.upsert");
    }

    return mapRepositoryRow<TransportRouteStopDatabaseRow, TransportRouteStopDTO>(
      data,
      mapTransportRouteStopRowToDTO,
      "transportRouteStops.upsert.map",
    );
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("transport_route_stops")
      .delete()
      .eq("id", id);
      
    if (error) {
      throw mapDatabaseError(error, "transportRouteStops.delete");
    }
  }
}
