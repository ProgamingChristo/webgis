import { describe, expect, it, vi } from "vitest";

import { MapidError } from "@/src/integrations/mapid/mapid.errors";
import { MapidMissionSyncService } from "@/src/integrations/mapid/mission.service";

const feature = {
  coordinates: [
    [
      [106.7, -6.2],
      [106.8, -6.2],
      [106.8, -6.1],
      [106.7, -6.2],
    ],
  ],
  type: "Polygon",
};

function createRepository() {
  return {
    createSyncRun: vi.fn().mockResolvedValue("sync-run-1"),
    finishSyncRun: vi.fn().mockResolvedValue(undefined),
    upsertObservation: vi.fn().mockResolvedValue("inserted"),
  };
}

describe("MapidMissionSyncService", () => {
  it("persists normalized observations idempotently and skips duplicates inside one sync run", async () => {
    const repository = createRepository();
    repository.upsertObservation
      .mockResolvedValueOnce("inserted")
      .mockResolvedValueOnce("updated");
    const client = {
      fetchPage: vi.fn().mockResolvedValue({
        raw: {},
        records: [
          { geometry: { coordinates: [106.78, -6.2], type: "Point" }, id: "merchant-1" },
          { geometry: { coordinates: [106.78, -6.2], type: "Point" }, id: "merchant-1" },
          { geometry: { coordinates: [106.79, -6.21], type: "Point" }, id: "merchant-2" },
        ],
      }),
    };
    const service = new MapidMissionSyncService(repository as any, client as any);

    const report = await service.syncSource({
      createdBy: "admin-1",
      feature,
      maxPages: 1,
      offset: 0,
      pageSize: 500,
      source: "MENU_GO",
    });

    expect(repository.createSyncRun).toHaveBeenCalledWith({
      createdBy: "admin-1",
      requestContext: { max_pages: 1, offset: 0, page_size: 500 },
      source: "MENU_GO",
    });
    expect(repository.upsertObservation).toHaveBeenCalledTimes(2);
    expect(report).toMatchObject({
      inserted: 1,
      skipped: 1,
      status: "COMPLETED",
      updated: 1,
    });
    expect(repository.finishSyncRun).toHaveBeenCalledWith(
      "sync-run-1",
      expect.objectContaining({
        inserted: 1,
        skipped: 1,
        status: "COMPLETED",
        updated: 1,
      }),
    );
  });

  it("paginates by configured page size until a short page is returned", async () => {
    const repository = createRepository();
    const client = {
      fetchPage: vi
        .fn()
        .mockResolvedValueOnce({
          raw: {},
          records: [
            { geometry: { coordinates: [106.78, -6.2], type: "Point" }, id: "merchant-1" },
            { geometry: { coordinates: [106.79, -6.21], type: "Point" }, id: "merchant-2" },
          ],
        })
        .mockResolvedValueOnce({
          raw: {},
          records: [
            { geometry: { coordinates: [106.8, -6.22], type: "Point" }, id: "merchant-3" },
          ],
        }),
    };
    const service = new MapidMissionSyncService(repository as any, client as any);

    const report = await service.syncSource({
      createdBy: null,
      feature,
      maxPages: 3,
      offset: 10,
      pageSize: 2,
      source: "MENU_GO",
    });

    expect(client.fetchPage).toHaveBeenNthCalledWith(1, {
      feature,
      offset: 10,
      source: "MENU_GO",
    });
    expect(client.fetchPage).toHaveBeenNthCalledWith(2, {
      feature,
      offset: 12,
      source: "MENU_GO",
    });
    expect(client.fetchPage).toHaveBeenCalledTimes(2);
    expect(report.pages_fetched).toBe(2);
    expect(report.records_fetched).toBe(3);
  });

  it("uses provider pagination metadata when the provider limit differs", async () => {
    const repository = createRepository();
    const client = {
      fetchPage: vi
        .fn()
        .mockResolvedValueOnce({
          pagination: { hasMore: true, nextOffset: 100 },
          raw: {},
          records: [
            { geometry: { coordinates: [106.78, -6.2], type: "Point" }, id: "receipt-1" },
          ],
        })
        .mockResolvedValueOnce({
          pagination: { hasMore: false, nextOffset: null },
          raw: {},
          records: [
            { geometry: { coordinates: [106.79, -6.21], type: "Point" }, id: "receipt-2" },
          ],
        }),
    };
    const service = new MapidMissionSyncService(repository as any, client as any);

    const report = await service.syncSource({
      createdBy: null,
      feature,
      maxPages: 3,
      offset: 0,
      pageSize: 500,
      source: "STRUK_GO",
    });

    expect(client.fetchPage).toHaveBeenNthCalledWith(2, {
      feature,
      offset: 100,
      source: "STRUK_GO",
    });
    expect(report).toMatchObject({ pages_fetched: 2, records_fetched: 2 });
  });

  it("marks Activities as blocked when no actual MAPID Activities endpoint is configured", async () => {
    const repository = createRepository();
    const client = {
      fetchPage: vi.fn().mockRejectedValue(new MapidError("MAPID_CONFIGURATION_ERROR")),
    };
    const service = new MapidMissionSyncService(repository as any, client as any);

    const report = await service.syncSource({
      createdBy: "admin-1",
      feature,
      maxPages: 1,
      offset: 0,
      pageSize: 500,
      source: "ACTIVITIES",
    });

    expect(report.status).toBe("BLOCKED");
    expect(report.error).toBe("MAPID integration is not configured");
    expect(repository.finishSyncRun).toHaveBeenCalledWith(
      "sync-run-1",
      expect.objectContaining({
        errorLog: { message: "MAPID integration is not configured" },
        status: "BLOCKED",
      }),
    );
  });
});
