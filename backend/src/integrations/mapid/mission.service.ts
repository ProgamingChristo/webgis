import "server-only";

import { MapidError } from "@/src/integrations/mapid/mapid.errors";
import { MapidMissionClient } from "@/src/integrations/mapid/mission.client";
import { normalizeMissionRecord } from "@/src/integrations/mapid/mission.schema";
import { MapidMissionRepository } from "@/src/integrations/mapid/mission.repository";
import type {
  MapidMissionSource,
  MapidMissionSyncReport,
  MapidMissionSyncStatus,
} from "@/src/integrations/mapid/mission.types";

export interface SyncMissionSourceInput {
  createdBy: string | null;
  feature: unknown;
  maxPages: number;
  offset: number;
  pageSize: number;
  source: MapidMissionSource;
}

export class MapidMissionSyncService {
  constructor(
    private readonly repository: MapidMissionRepository,
    private readonly client = new MapidMissionClient(),
  ) {}

  async syncSource(input: SyncMissionSourceInput): Promise<MapidMissionSyncReport> {
    const startedAt = new Date().toISOString();
    let syncRunId: string | null = null;
    const metrics = {
      failed: 0,
      inserted: 0,
      invalid: 0,
      pagesFetched: 0,
      recordsFetched: 0,
      skipped: 0,
      updated: 0,
    };

    try {
      syncRunId = await this.repository.createSyncRun({
        createdBy: input.createdBy,
        requestContext: {
          max_pages: input.maxPages,
          offset: input.offset,
          page_size: input.pageSize,
        },
        source: input.source,
      });

      let currentOffset = input.offset;
      const seenSourceIds = new Set<string>();

      for (let pageIndex = 0; pageIndex < input.maxPages; pageIndex += 1) {
        const page = await this.client.fetchPage({
          feature: input.feature,
          offset: currentOffset,
          source: input.source,
        });

        metrics.pagesFetched += 1;
        metrics.recordsFetched += page.records.length;

        if (page.records.length === 0) break;

        const retrievedAt = new Date().toISOString();
        for (const rawRecord of page.records) {
          try {
            const observation = normalizeMissionRecord(
              input.source,
              rawRecord,
              retrievedAt,
            );
            const sourceKey = `${observation.source_type}:${observation.source_record_id}`;
            if (seenSourceIds.has(sourceKey)) {
              metrics.skipped += 1;
              continue;
            }
            seenSourceIds.add(sourceKey);

            const result = await this.repository.upsertObservation(
              syncRunId,
              observation,
            );
            if (result === "inserted") metrics.inserted += 1;
            else metrics.updated += 1;
          } catch {
            metrics.invalid += 1;
          }
        }

        if (page.pagination) {
          if (!page.pagination.hasMore || page.pagination.nextOffset === null) break;
          if (page.pagination.nextOffset <= currentOffset) break;
          currentOffset = page.pagination.nextOffset;
          continue;
        }

        if (page.records.length < input.pageSize) break;
        currentOffset += input.pageSize;
      }

      const status: MapidMissionSyncStatus =
        metrics.failed > 0 || metrics.invalid > 0 ? "PARTIAL" : "COMPLETED";
      await this.repository.finishSyncRun(syncRunId, {
        ...metrics,
        errorLog: null,
        status,
      });

      return {
        failed: metrics.failed,
        finished_at: new Date().toISOString(),
        inserted: metrics.inserted,
        invalid: metrics.invalid,
        pages_fetched: metrics.pagesFetched,
        records_fetched: metrics.recordsFetched,
        skipped: metrics.skipped,
        source: input.source,
        started_at: startedAt,
        status,
        updated: metrics.updated,
      };
    } catch (error) {
      const status = isBlockedActivities(input.source, error) ? "BLOCKED" : "FAILED";
      const safeError = getSafeError(error);

      if (syncRunId) {
        await this.repository.finishSyncRun(syncRunId, {
          ...metrics,
          errorLog: { message: safeError },
          failed: metrics.failed + 1,
          status,
        });
      }

      return {
        error: safeError,
        failed: metrics.failed + 1,
        finished_at: new Date().toISOString(),
        inserted: metrics.inserted,
        invalid: metrics.invalid,
        pages_fetched: metrics.pagesFetched,
        records_fetched: metrics.recordsFetched,
        skipped: metrics.skipped,
        source: input.source,
        started_at: startedAt,
        status,
        updated: metrics.updated,
      };
    }
  }
}

function isBlockedActivities(source: MapidMissionSource, error: unknown): boolean {
  return (
    source === "ACTIVITIES" &&
    error instanceof MapidError &&
    error.code === "MAPID_CONFIGURATION_ERROR"
  );
}

function getSafeError(error: unknown): string {
  if (error instanceof MapidError) return error.message;
  if (error instanceof Error) return error.message;
  return "Mission synchronization failed";
}
