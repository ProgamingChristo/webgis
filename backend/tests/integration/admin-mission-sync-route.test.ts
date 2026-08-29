import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import {
  createAdminMissionSyncHandlers,
  type AdminMissionSyncRouteDependencies,
} from "@/app/api/admin/mission/sync/route";
import type {
  MapidMissionSource,
  MapidMissionSyncSummary,
} from "@/src/integrations/mapid/mission.types";
import { ApplicationError } from "@/src/lib/errors";

vi.mock("server-only", () => ({}));

const adminId = "11111111-2222-4333-8444-555555555555";
const completedResult = {
  duration_ms: 1250,
  error_summary: null,
  failed: 0,
  fetched: 87,
  finished_at: "2026-08-27T10:00:01.250Z",
  inserted: 0,
  invalid: 0,
  pages_fetched: 1,
  skipped: 0,
  source: "MENU_GO" as const,
  started_at: "2026-08-27T10:00:00.000Z",
  status: "COMPLETED" as const,
  updated: 87,
};

type RouteService = ReturnType<AdminMissionSyncRouteDependencies["createService"]>;
type ListLatestMock = ReturnType<
  typeof vi.fn<() => Promise<MapidMissionSyncSummary[]>>
>;
type SyncMock = ReturnType<
  typeof vi.fn<
    (source: MapidMissionSource, userId: string) => Promise<MapidMissionSyncSummary>
  >
>;

function request(method: "GET" | "POST", body?: unknown) {
  return new NextRequest("http://localhost/api/admin/mission/sync", {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    method,
  });
}

function dependencies(options?: {
  authorize?: AdminMissionSyncRouteDependencies["authorize"];
  listLatest?: ListLatestMock;
  sync?: SyncMock;
}) {
  const listLatest =
    options?.listLatest ??
    vi.fn<() => Promise<MapidMissionSyncSummary[]>>().mockResolvedValue([completedResult]);
  const sync =
    options?.sync ??
    vi
      .fn<
        (source: MapidMissionSource, userId: string) => Promise<MapidMissionSyncSummary>
      >()
      .mockResolvedValue(completedResult);
  const service: RouteService = {
    listLatest,
    sync,
  };

  const routeDependencies: AdminMissionSyncRouteDependencies = {
    authorize:
      options?.authorize ??
      vi.fn().mockResolvedValue({ accountRole: "ADMIN", userId: adminId }),
    createService: vi.fn(() => service),
  };

  return {
    dependencies: {
      ...routeDependencies,
    } satisfies AdminMissionSyncRouteDependencies,
    service: { listLatest, sync },
  };
}

describe("Admin Mission sync route", () => {
  it.each([
    ["UNAUTHORIZED", 401],
    ["FORBIDDEN", 403],
  ] as const)("rejects %s callers before synchronization", async (code, status) => {
    const authorize = vi
      .fn<AdminMissionSyncRouteDependencies["authorize"]>()
      .mockRejectedValue(new ApplicationError(code));
    const fixture = dependencies({ authorize });
    const handlers = createAdminMissionSyncHandlers(fixture.dependencies);

    const response = await handlers.POST(request("POST", { source: "MENU_GO" }));
    const body = await response.json();

    expect(response.status).toBe(status);
    expect(body.error.code).toBe(code);
    expect(fixture.service.sync).not.toHaveBeenCalled();
  });

  it.each([
    { source: "UNKNOWN" },
    { source: "../../secret" },
    { source: "https://attacker.example" },
    { source: "/web/competition/custom" },
    { source: "MENU_GO", provider_path: "/web/competition/custom" },
  ])("rejects a non-canonical or non-strict request: $source", async (payload) => {
    const fixture = dependencies();
    const handlers = createAdminMissionSyncHandlers(fixture.dependencies);

    const response = await handlers.POST(request("POST", payload));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(fixture.service.sync).not.toHaveBeenCalled();
  });

  it.each<MapidMissionSource>([
    "MENU_GO",
    "STRUK_GO",
    "PROPERTI_GO",
    "ACTIVITIES",
  ])("routes %s to the canonical synchronization service", async (source) => {
    const sync = vi
      .fn<
        (source: MapidMissionSource, userId: string) => Promise<MapidMissionSyncSummary>
      >()
      .mockResolvedValue({ ...completedResult, source });
    const fixture = dependencies({ sync });
    const handlers = createAdminMissionSyncHandlers(fixture.dependencies);

    const response = await handlers.POST(request("POST", { source }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.source).toBe(source);
    expect(sync).toHaveBeenCalledWith(source, adminId);
  });

  it("returns latest safe summaries to ADMIN only", async () => {
    const fixture = dependencies();
    const handlers = createAdminMissionSyncHandlers(fixture.dependencies);

    const response = await handlers.GET(request("GET"));
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body.data.sources).toEqual([completedResult]);
    expect(serialized).not.toContain("x-api-key");
    expect(serialized).not.toContain("MAPID_API_KEY");
    expect(serialized).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("returns only a safe failure summary", async () => {
    const sync = vi
      .fn<
        (source: MapidMissionSource, userId: string) => Promise<MapidMissionSyncSummary>
      >()
      .mockResolvedValue({
      ...completedResult,
      error_summary: "Mission synchronization failed.",
      failed: 1,
      status: "FAILED",
      });
    const fixture = dependencies({ sync });
    const handlers = createAdminMissionSyncHandlers(fixture.dependencies);

    const response = await handlers.POST(request("POST", { source: "MENU_GO" }));
    const body = await response.json();

    expect(body.data.error_summary).toBe("Mission synchronization failed.");
    expect(Object.keys(body.data)).not.toContain("error_log");
    expect(Object.keys(body.data)).not.toContain("request_context");
  });
});
