import type { JsonObject } from "@/src/types/provenance";

export const MAPID_MISSION_SOURCES = [
  "MENU_GO",
  "STRUK_GO",
  "PROPERTI_GO",
  "ACTIVITIES",
] as const;

export type MapidMissionSource = (typeof MAPID_MISSION_SOURCES)[number];

export type MapidMissionSyncStatus =
  | "RUNNING"
  | "COMPLETED"
  | "PARTIAL"
  | "FAILED"
  | "BLOCKED";

export interface MapidMissionPoint {
  type: "Point";
  coordinates: [number, number];
}

export interface NormalizedMapidMissionObservation {
  source_type: MapidMissionSource;
  source_record_id: string;
  mission_name: string | null;
  geometry: MapidMissionPoint;
  normalized_properties: JsonObject;
  raw_payload: JsonObject;
  raw_payload_checksum: string;
  observed_at: string | null;
  provider_updated_at: string | null;
  verification_status: "SOURCE_OBSERVED";
  freshness_status: "FRESH" | "UNKNOWN";
  provenance: JsonObject;
}

export interface MapidMissionObservationDTO {
  id: string;
  geometry: MapidMissionPoint;
  source_type: MapidMissionSource;
  source_id: string;
  properties: JsonObject;
  provenance: JsonObject;
  observed_at: string | null;
  freshness_status: string;
  verification_status: string;
}

export interface MapidMissionSyncReport {
  source: MapidMissionSource;
  started_at: string;
  finished_at: string;
  pages_fetched: number;
  records_fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  invalid: number;
  failed: number;
  status: MapidMissionSyncStatus;
  error?: string;
}

export interface MapidMissionSyncSummary {
  source: MapidMissionSource;
  status: MapidMissionSyncStatus | "NEVER_SYNCED";
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  pages_fetched: number | null;
  fetched: number | null;
  inserted: number | null;
  updated: number | null;
  skipped: number | null;
  invalid: number | null;
  failed: number | null;
  error_summary: string | null;
}
