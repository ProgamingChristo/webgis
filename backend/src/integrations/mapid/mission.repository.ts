import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { JsonObject } from "@/src/types/provenance";
import type {
  MapidMissionObservationDTO,
  MapidMissionPoint,
  MapidMissionSource,
  MapidMissionSyncSummary,
  MapidMissionSyncStatus,
  NormalizedMapidMissionObservation,
} from "@/src/integrations/mapid/mission.types";

export interface CreateMissionSyncRunInput {
  createdBy: string | null;
  requestContext: JsonObject;
  source: MapidMissionSource;
}

export interface FinishMissionSyncRunInput {
  errorLog?: JsonObject | null;
  failed: number;
  inserted: number;
  invalid: number;
  pagesFetched: number;
  recordsFetched: number;
  skipped: number;
  status: MapidMissionSyncStatus;
  updated: number;
}

export interface MissionReadQuery {
  bbox?: {
    maxLat: number;
    maxLng: number;
    minLat: number;
    minLng: number;
  };
  limit: number;
  offset: number;
  sourceType?: MapidMissionSource;
}

export class MapidMissionRepository {
  constructor(private readonly supabase: SupabaseClient<any>) {}

  async createSyncRun(input: CreateMissionSyncRunInput): Promise<string> {
    const { data, error } = await this.supabase
      .from("mapid_mission_sync_runs")
      .insert({
        created_by: input.createdBy,
        request_context: input.requestContext,
        source_type: input.source,
        status: "RUNNING",
      })
      .select("id")
      .single();

    if (error || !data) {
      throw error || new Error("Failed to create MAPID Mission sync run.");
    }

    return data.id;
  }

  async finishSyncRun(
    syncRunId: string,
    input: FinishMissionSyncRunInput,
  ): Promise<void> {
    const { error } = await this.supabase
      .from("mapid_mission_sync_runs")
      .update({
        error_log: input.errorLog ?? null,
        failed_records: input.failed,
        finished_at: new Date().toISOString(),
        inserted_records: input.inserted,
        invalid_records: input.invalid,
        pages_fetched: input.pagesFetched,
        records_fetched: input.recordsFetched,
        skipped_records: input.skipped,
        status: input.status,
        updated_records: input.updated,
      })
      .eq("id", syncRunId);

    if (error) throw error;
  }

  async getLatestSyncRun(
    source: MapidMissionSource,
  ): Promise<MapidMissionSyncSummary | null> {
    const { data, error } = await this.supabase
      .from("mapid_mission_sync_runs")
      .select(
        "source_type,status,started_at,finished_at,pages_fetched,records_fetched,inserted_records,updated_records,skipped_records,invalid_records,failed_records",
      )
      .eq("source_type", source)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return mapSyncRunSummary(data);
  }

  async upsertObservation(
    syncRunId: string,
    observation: NormalizedMapidMissionObservation,
  ): Promise<"inserted" | "updated"> {
    const { data: existing, error: existingError } = await this.supabase
      .from("mapid_mission_observations")
      .select("id")
      .eq("source_type", observation.source_type)
      .eq("source_record_id", observation.source_record_id)
      .maybeSingle();

    if (existingError) throw existingError;

    const [lng, lat] = observation.geometry.coordinates;
    const { error } = await this.supabase
      .from("mapid_mission_observations")
      .upsert(
        {
          freshness_status: observation.freshness_status,
          geometry: `SRID=4326;POINT(${lng} ${lat})`,
          last_seen_at: new Date().toISOString(),
          latest_sync_run_id: syncRunId,
          mission_name: observation.mission_name,
          normalized_properties: observation.normalized_properties,
          observed_at: observation.observed_at,
          provenance: observation.provenance,
          provider_updated_at: observation.provider_updated_at,
          raw_payload: observation.raw_payload,
          raw_payload_checksum: observation.raw_payload_checksum,
          source_record_id: observation.source_record_id,
          source_type: observation.source_type,
          verification_status: observation.verification_status,
        },
        { onConflict: "source_type,source_record_id" },
      );

    if (error) throw error;

    return existing ? "updated" : "inserted";
  }

  async listObservations(query: MissionReadQuery): Promise<{
    items: MapidMissionObservationDTO[];
    total: number;
  }> {
    const { data, error } = await this.supabase.rpc(
      "list_mapid_mission_observations_v1",
      {
        p_limit: query.limit,
        p_max_lat: query.bbox?.maxLat ?? null,
        p_max_lng: query.bbox?.maxLng ?? null,
        p_min_lat: query.bbox?.minLat ?? null,
        p_min_lng: query.bbox?.minLng ?? null,
        p_offset: query.offset,
        p_source_type: query.sourceType ?? null,
      },
    );

    if (error) throw error;

    const rows = data ?? [];
    return {
      items: rows.map(mapObservationRow),
      total: Number(rows[0]?.total_count ?? 0),
    };
  }
}

function mapSyncRunSummary(row: any): MapidMissionSyncSummary {
  const startedAt = typeof row.started_at === "string" ? row.started_at : null;
  const finishedAt = typeof row.finished_at === "string" ? row.finished_at : null;
  const duration =
    startedAt && finishedAt
      ? Math.max(0, new Date(finishedAt).getTime() - new Date(startedAt).getTime())
      : null;

  return {
    duration_ms: duration,
    error_summary: getSyncErrorSummary(row.status),
    failed: Number(row.failed_records ?? 0),
    fetched: Number(row.records_fetched ?? 0),
    finished_at: finishedAt,
    inserted: Number(row.inserted_records ?? 0),
    invalid: Number(row.invalid_records ?? 0),
    pages_fetched: Number(row.pages_fetched ?? 0),
    skipped: Number(row.skipped_records ?? 0),
    source: row.source_type,
    started_at: startedAt,
    status: row.status,
    updated: Number(row.updated_records ?? 0),
  };
}

function getSyncErrorSummary(status: unknown): string | null {
  if (status === "FAILED") return "Mission synchronization failed.";
  if (status === "BLOCKED") return "Mission source configuration is unavailable.";
  if (status === "PARTIAL") return "Mission synchronization completed with warnings.";
  return null;
}

function parsePoint(value: unknown): MapidMissionPoint {
  if (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "Point" &&
    Array.isArray((value as { coordinates?: unknown }).coordinates)
  ) {
    const [lng, lat] = (value as { coordinates: [number, number] }).coordinates;
    return { type: "Point", coordinates: [lng, lat] };
  }

  if (typeof value === "string") {
    const match = /POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i.exec(value);
    if (match?.[1] && match?.[2]) {
      return {
        type: "Point",
        coordinates: [Number(match[1]), Number(match[2])],
      };
    }
  }

  return { type: "Point", coordinates: [0, 0] };
}

function asJsonObject(value: unknown): JsonObject {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as JsonObject;
  }
  return {};
}

function mapObservationRow(row: any): MapidMissionObservationDTO {
  return {
    freshness_status: row.freshness_status,
    geometry: parsePoint(row.geometry),
    id: row.id,
    observed_at: row.observed_at,
    properties: asJsonObject(row.normalized_properties),
    provenance: asJsonObject(row.provenance),
    source_id: row.source_record_id,
    source_type: row.source_type,
    verification_status: row.verification_status,
  };
}
