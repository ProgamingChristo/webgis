import { beforeEach, describe, expect, it, vi } from "vitest";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/src/lib/api-client", () => ({ apiClient: { get } }));

import {
  accessibilityEvidenceService,
  clearAccessibilityEvidenceCacheForTests,
} from "@/src/features/accessibility-evidence/services/accessibility-evidence.service";

describe("accessibility evidence API service", () => {
  beforeEach(() => {
    get.mockReset();
    clearAccessibilityEvidenceCacheForTests();
  });

  it("uses GETRA evidence APIs with strict viewport filters", async () => {
    get.mockResolvedValueOnce({ evidence: [] });
    const controller = new AbortController();

    await accessibilityEvidenceService.list({
      bbox: { west: 106.7, south: -6.3, east: 106.9, north: -6.1 },
      category: "ACCESSIBILITY_OBSERVATION",
      source_type: "MAPID_ACTIVITY",
      validation_status: "OBSERVED",
      days: 90,
    }, controller.signal);

    expect(get).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/accessibility\/evidence\?/),
      { signal: controller.signal },
    );
    const path = String(get.mock.calls[0]?.[0]);
    expect(path).toContain("west=106.7");
    expect(path).toContain("category=ACCESSIBILITY_OBSERVATION");
    expect(path).toContain("source_type=MAPID_ACTIVITY");
    expect(path).not.toContain("web%2Fcompetition");
    expect(path).not.toContain("x-api-key");
  });

  it("uses encoded evidence IDs for detail requests", async () => {
    get.mockResolvedValueOnce({ id: "MAPID_ACTIVITY:source-1" });
    await accessibilityEvidenceService.detail("MAPID_ACTIVITY:source-1");

    expect(get).toHaveBeenCalledWith(
      "/api/accessibility/evidence/MAPID_ACTIVITY%3Asource-1",
      { signal: undefined },
    );
  });

  it("does not refetch cached viewport evidence", async () => {
    get.mockResolvedValue({ evidence: [] });
    const query = {
      bbox: { west: 106.7, south: -6.3, east: 106.9, north: -6.1 },
      category: "ACCESSIBILITY_OBSERVATION" as const,
    };

    await accessibilityEvidenceService.list(query);
    await accessibilityEvidenceService.list(query);

    expect(get).toHaveBeenCalledTimes(1);
  });
});
