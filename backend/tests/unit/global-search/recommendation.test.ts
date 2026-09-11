import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("@/src/features/merchant-reconciliation/canonical-merchant-read.service", () => ({
  CanonicalMerchantReadService: class { list = mocks.list; },
}));
vi.mock("server-only", () => ({}));
import { GlobalSearchService } from "@/src/features/global-search/global-search.service";
import { globalSearchQuerySchema } from "@/src/features/global-search/global-search.schema";
import { referenceDistance, resolveSearchReference } from "@/src/features/global-search/search-reference";
import { resolveFoodEntity } from "@/src/features/global-search/food-entity-resolver";
import { rankRecommendations, scoreRecommendation } from "@/src/features/global-search/recommendation-engine";

describe("canonical recommendation constraints", () => {
  beforeEach(() => mocks.list.mockReset());
  it("ranks only in-radius affordable canonical candidates and labels spatial evidence", async () => {
    const rows = [
      { id: "far", longitude: 106.8, latitude: -6.17, observedPriceAmount: 10000 },
      { id: "near", longitude: 106.751, latitude: -6.17, observedPriceAmount: 12000 },
      { id: "expensive", longitude: 106.7501, latitude: -6.17, observedPriceAmount: 40000 },
      { id: "unknown", longitude: 106.7502, latitude: -6.17, observedPriceAmount: null },
    ];
    mocks.list.mockResolvedValue({ merchants: rows, total: 150 });
    const supabase = { rpc: vi.fn().mockResolvedValue({ data: [], error: null }) };
    const query = globalSearchQuerySchema.parse({ q: "bakso", west: 106.7, east: 106.9, south: -6.3, north: -6.1,
      origin_longitude: 106.75, origin_latitude: -6.17, origin_source: "USER_LOCATION",
      radius_meters: 500, max_budget: 15000, recommendation: "true", sort: "NEAREST" });
    const result = await new GlobalSearchService(supabase as never).search(query);
    expect(result.merchants.map(row => row.id)).toEqual(["near"]);
    expect(result.merchants[0].referenceDistance).toMatchObject({ label: "lokasi saya", kind: "STRAIGHT_LINE" });
    expect(result.merchants[0].networkDurationSeconds).toBeUndefined();
    expect(result.intent.candidate_limited).toBe(true);
    expect(result.commuter.constraints_relaxed).toBe(false);
  });
  it("computes distances on the server without manufacturing travel times", () => {
    expect(referenceDistance({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 })).toBeCloseTo(111195, -1);
    expect(referenceDistance({ latitude: -6, longitude: 106 }, { latitude: -6, longitude: 106 })).toBe(0);
  });
  it("rejects missing origins and ambiguous transit names", async () => {
    expect(globalSearchQuerySchema.safeParse({ q: "bakso", scope: "GLOBAL", radius_meters: 500 }).success).toBe(false);
    const supabase = { from: () => ({ select: () => ({ ilike: () => ({ limit: async () => ({ data: [{ id: "a" }, { id: "b" }], error: null }) }) }) }) };
    await expect(resolveSearchReference(supabase as never, "Stasiun A", null)).rejects.toThrow();
  });
  it("normalizes common Indonesian food aliases without blocking unknown dishes", () => {
    expect(resolveFoodEntity("BASO")).toBe("bakso");
    expect(resolveFoodEntity("Nasgor")).toBe("nasi goreng");
    expect(resolveFoodEntity("Soto Betawi")).toBe("soto betawi");
  });
  it("excludes missing evidence from the denominator and keeps ranking deterministic", () => {
    const base = { name: "Bakso", category: "Bakso", brand: "Bakso", longitude: 106.8, latitude: -6.2,
      observedPriceAmount: null, openingStatus: "UNKNOWN", searchRelevance: 400 } as any;
    const missing = scoreRecommendation({ ...base, id: "b" }, { keyword: "bakso", maxBudget: 15000, radiusMeters: null, openNow: true });
    expect(missing.components.budget).toBeNull();
    expect(missing.components.opening).toBeNull();
    expect(missing.score).toBeGreaterThan(0);
    const ranked = rankRecommendations([{ ...base, id: "b" }, { ...base, id: "a" }],
      { keyword: "bakso", maxBudget: null, radiusMeters: null, openNow: false });
    expect(ranked.map((merchant) => merchant.id)).toEqual(["a", "b"]);
    expect(ranked[0].recommendation.ruleset).toBe("commuter-v1");
  });
});
