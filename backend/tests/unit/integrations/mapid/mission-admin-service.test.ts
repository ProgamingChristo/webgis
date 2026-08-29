import { describe, expect, it, vi } from "vitest";

import { AdminMissionSyncService } from "@/src/integrations/mapid/mission-admin.service";
import type { MapidMissionSource } from "@/src/integrations/mapid/mission.types";

vi.mock("server-only", () => ({}));

const sources: MapidMissionSource[] = [
  "MENU_GO",
  "STRUK_GO",
  "PROPERTI_GO",
  "ACTIVITIES",
];

function report(source: MapidMissionSource) {
  return {
    failed: 0,
    finished_at: "2026-08-27T10:00:01.000Z",
    inserted: 0,
    invalid: 0,
    pages_fetched: 1,
    records_fetched: 10,
    skipped: 0,
    source,
    started_at: "2026-08-27T10:00:00.000Z",
    status: "COMPLETED" as const,
    updated: 10,
  };
}

describe("AdminMissionSyncService", () => {
  it.each(sources)("uses the Phase 01 runner for %s", async (source) => {
    const syncSource = vi.fn().mockResolvedValue(report(source));
    const service = new AdminMissionSyncService(
      { getLatestSyncRun: vi.fn() },
      { syncSource },
    );

    const result = await service.sync(source, "admin-id");

    expect(result).toMatchObject({ source, status: "COMPLETED", fetched: 10 });
    expect(syncSource).toHaveBeenCalledWith(
      expect.objectContaining({
        createdBy: "admin-id",
        maxPages: 50,
        offset: 0,
        pageSize: 500,
        source,
      }),
    );
    expect(syncSource.mock.calls[0]?.[0].feature).toMatchObject({ type: "Polygon" });
  });

  it("returns all sources and an honest never-synced state", async () => {
    const service = new AdminMissionSyncService(
      { getLatestSyncRun: vi.fn().mockResolvedValue(null) },
      { syncSource: vi.fn() },
    );

    const result = await service.listLatest();

    expect(result.map((item) => item.source)).toEqual(sources);
    expect(result.every((item) => item.status === "NEVER_SYNCED")).toBe(true);
    expect(result.every((item) => item.fetched === null)).toBe(true);
  });

  it("rejects a concurrent run for the same source and releases the guard", async () => {
    let release: ((value: ReturnType<typeof report>) => void) | undefined;
    const pending = new Promise<ReturnType<typeof report>>((resolve) => {
      release = resolve;
    });
    const syncSource = vi.fn().mockReturnValueOnce(pending).mockResolvedValue(report("MENU_GO"));
    const service = new AdminMissionSyncService(
      { getLatestSyncRun: vi.fn() },
      { syncSource },
    );

    const first = service.sync("MENU_GO", "admin-id");
    await expect(service.sync("MENU_GO", "admin-id")).rejects.toMatchObject({
      code: "CONFLICT",
    });

    release?.(report("MENU_GO"));
    await first;
    await expect(service.sync("MENU_GO", "admin-id")).resolves.toMatchObject({
      status: "COMPLETED",
    });
  });
});
