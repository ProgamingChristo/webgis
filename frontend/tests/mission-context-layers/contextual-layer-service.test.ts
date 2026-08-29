import { beforeEach, describe, expect, it, vi } from "vitest";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/src/lib/api-client", () => ({ apiClient: { get } }));

import {
  clearContextualLayerCacheForTests,
  contextualLayerService,
} from "@/src/features/mission-context-layers/services/contextual-layer.service";

describe("contextual layer API service", () => {
  beforeEach(() => {
    get.mockReset();
    clearContextualLayerCacheForTests();
  });

  it("always sends a bounded canonical viewport to a GETRA endpoint", async () => {
    get.mockResolvedValue({ source: "PROPERTI_GO" });
    const controller = new AbortController();
    await contextualLayerService.getViewport("PROPERTI_GO", {
      west: 106.7,
      south: -6.3,
      east: 106.9,
      north: -6.1,
    }, controller.signal);
    expect(get).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/contextual-observations\?/),
      { signal: controller.signal },
    );
    const path = String(get.mock.calls[0]?.[0]);
    expect(path).toContain("source=PROPERTI_GO");
    expect(path).toContain("west=106.7");
    expect(path).toContain("limit=250");
    expect(path).not.toContain("MAPID");
    expect(path).not.toContain("web%2Fcompetition");

    await contextualLayerService.getViewport("PROPERTI_GO", {
      west: 106.7,
      south: -6.3,
      east: 106.9,
      north: -6.1,
    }, controller.signal);
    expect(get).toHaveBeenCalledTimes(1);
  });
});
