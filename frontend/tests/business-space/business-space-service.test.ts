import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/src/lib/auth-client", () => ({ authenticatedFetch: mocks.fetch }));

import { businessSpaceService } from "@/src/features/business-space/services/business-space.service";

describe("Properti Go API requests", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_GETRA_API_URL", "https://backend.example.test");
    mocks.fetch.mockImplementation(async () => new Response(JSON.stringify({ success: true, data: {} })));
  });
  afterEach(() => vi.unstubAllEnvs());

  it("sends visible bounds and actual property filters without injecting an administrative region", async () => {
    const controller = new AbortController();
    await businessSpaceService.listCandidates({
      category: "bakso", days: 30, bbox: { west: 106.7, south: -6.4, east: 106.9, north: -6.2 },
      q: "  Pondok  ", property_category: "Rumah", transaction_type: "DIJUAL", limit: 24, offset: 24,
    }, controller.signal);
    const [address, options] = mocks.fetch.mock.calls[0];
    const url = new URL(address);
    expect(url.origin + url.pathname).toBe("https://backend.example.test/api/business-space/candidates");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      category: "bakso", days: "30", west: "106.7", south: "-6.4", east: "106.9", north: "-6.2",
      q: "Pondok", property_category: "Rumah", transaction_type: "DIJUAL", limit: "24", offset: "24",
    });
    expect(options.signal).toBe(controller.signal);
  });

  it("lets the backend derive detail's region from the property location", async () => {
    const controller = new AbortController();
    await businessSpaceService.detail("property-id", { category: "coffee", days: 7 }, controller.signal);
    expect(mocks.fetch).toHaveBeenCalledWith(
      "https://backend.example.test/api/business-space/candidates/property-id?category=coffee&days=7",
      { signal: controller.signal },
    );
  });

  it("allows pending comparison and insight requests to be aborted after the selection changes", async () => {
    const controller = new AbortController();
    await businessSpaceService.compare(["one", "two"], "coffee", 7, controller.signal);
    await businessSpaceService.insight(["one", "two"], "coffee", 7, "Apa perbedaannya?", controller.signal);
    for (const [, options] of mocks.fetch.mock.calls) {
      expect(options).toMatchObject({ method: "POST", signal: controller.signal });
      expect(JSON.parse(options.body)).toMatchObject({ candidate_ids: ["one", "two"], category: "coffee", days: 7 });
    }
  });
});
