import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiGet, apiPost } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

vi.mock("@/src/lib/api-client", () => ({
  apiClient: {
    get: apiGet,
    post: apiPost,
  },
}));

import {
  adminMissionSyncService,
  MISSION_SOURCES,
} from "@/src/services/admin-mission-sync.service";

describe("adminMissionSyncService", () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
  });

  it("loads safe GETRA-owned Mission history", async () => {
    apiGet.mockResolvedValue({ sources: [] });

    await expect(adminMissionSyncService.getLatest()).resolves.toEqual([]);
    expect(apiGet).toHaveBeenCalledWith("/api/admin/mission/sync");
  });

  it.each(MISSION_SOURCES)("posts only the canonical source %s", async (source) => {
    apiPost.mockResolvedValue({ source, status: "COMPLETED" });

    await adminMissionSyncService.sync(source);

    expect(apiPost).toHaveBeenCalledWith("/api/admin/mission/sync", { source });
    expect(JSON.stringify(apiPost.mock.calls)).not.toContain("/web/competition/");
    expect(JSON.stringify(apiPost.mock.calls)).not.toContain("x-api-key");
  });
});
