import "server-only";

import { ApplicationError } from "@/src/lib/errors";
import { MapidMissionRepository } from "@/src/integrations/mapid/mission.repository";
import { MapidMissionSyncService } from "@/src/integrations/mapid/mission.service";
import {
  MAPID_MISSION_SOURCES,
  type MapidMissionSource,
  type MapidMissionSyncReport,
  type MapidMissionSyncSummary,
} from "@/src/integrations/mapid/mission.types";

const adminMissionSyncFeature = {
  type: "Polygon" as const,
  coordinates: [[
    [106.68, -6.4],
    [106.98, -6.4],
    [106.98, -6.02],
    [106.68, -6.02],
    [106.68, -6.4],
  ]],
};

const activeSources = new Set<MapidMissionSource>();

type MissionSyncRunner = Pick<MapidMissionSyncService, "syncSource">;
type MissionSyncHistory = Pick<MapidMissionRepository, "getLatestSyncRun">;

export class AdminMissionSyncService {
  constructor(
    private readonly repository: MissionSyncHistory,
    private readonly syncService: MissionSyncRunner,
  ) {}

  async listLatest(): Promise<MapidMissionSyncSummary[]> {
    return Promise.all(
      MAPID_MISSION_SOURCES.map(async (source) => {
        const latest = await this.repository.getLatestSyncRun(source);
        return latest ?? createNeverSyncedSummary(source);
      }),
    );
  }

  async sync(source: MapidMissionSource, userId: string): Promise<MapidMissionSyncSummary> {
    if (activeSources.has(source)) {
      throw new ApplicationError("CONFLICT");
    }

    activeSources.add(source);
    try {
      const report = await this.syncService.syncSource({
        createdBy: userId,
        feature: adminMissionSyncFeature,
        maxPages: 50,
        offset: 0,
        pageSize: 500,
        source,
      });

      return mapReportToSummary(report);
    } finally {
      activeSources.delete(source);
    }
  }
}

function mapReportToSummary(report: MapidMissionSyncReport): MapidMissionSyncSummary {
  return {
    duration_ms: Math.max(
      0,
      new Date(report.finished_at).getTime() - new Date(report.started_at).getTime(),
    ),
    error_summary:
      report.status === "FAILED"
        ? "Mission synchronization failed."
        : report.status === "BLOCKED"
          ? "Mission source configuration is unavailable."
          : report.status === "PARTIAL"
            ? "Mission synchronization completed with warnings."
            : null,
    failed: report.failed,
    fetched: report.records_fetched,
    finished_at: report.finished_at,
    inserted: report.inserted,
    invalid: report.invalid,
    pages_fetched: report.pages_fetched,
    skipped: report.skipped,
    source: report.source,
    started_at: report.started_at,
    status: report.status,
    updated: report.updated,
  };
}

function createNeverSyncedSummary(source: MapidMissionSource): MapidMissionSyncSummary {
  return {
    duration_ms: null,
    error_summary: null,
    failed: null,
    fetched: null,
    finished_at: null,
    inserted: null,
    invalid: null,
    pages_fetched: null,
    skipped: null,
    source,
    started_at: null,
    status: "NEVER_SYNCED",
    updated: null,
  };
}
