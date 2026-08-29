"use client";

import { apiClient } from "@/src/lib/api-client";

export const MISSION_SOURCES = [
  "MENU_GO",
  "STRUK_GO",
  "PROPERTI_GO",
  "ACTIVITIES",
] as const;

export type MissionSource = (typeof MISSION_SOURCES)[number];
export type MissionSyncStatus =
  | "NEVER_SYNCED"
  | "RUNNING"
  | "COMPLETED"
  | "PARTIAL"
  | "FAILED"
  | "BLOCKED";

export interface MissionSyncSummary {
  source: MissionSource;
  status: MissionSyncStatus;
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

interface MissionSyncHistoryResponse {
  sources: MissionSyncSummary[];
}

const ENDPOINT = "/api/admin/mission/sync";

export const adminMissionSyncService = {
  async getLatest(): Promise<MissionSyncSummary[]> {
    const response = await apiClient.get<MissionSyncHistoryResponse>(ENDPOINT);
    return response.sources;
  },

  sync(source: MissionSource): Promise<MissionSyncSummary> {
    return apiClient.post<MissionSyncSummary>(ENDPOINT, { source });
  },
};
