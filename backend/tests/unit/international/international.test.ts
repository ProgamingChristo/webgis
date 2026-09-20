import { beforeEach, describe, expect, it, vi } from "vitest";
import { INTERNATIONAL_LAYERS } from "@/types/international";
import { clearInternationalCache, queryInternational, querySchema } from "@/src/features/international/service";
import { international_data_sources, layerSources } from "@/src/features/international/registry";
import { csv, fetchJson, fetchText, timestamp } from "@/src/features/international/http";
import { runAdapter } from "@/src/features/international/adapters";
import { interpretData } from "@/src/features/international/interpret";
vi.mock("@/src/features/international/http", async importOriginal => ({ ...await importOriginal<typeof import("@/src/features/international/http")>(), fetchJson: vi.fn(), fetchText: vi.fn() }));
const query = { lat: -6.2, lon: 106.82, radius: 10000 };
beforeEach(() => { clearInternationalCache(); vi.clearAllMocks(); vi.unstubAllEnvs(); });
describe("international real-data contracts", () => {
  it.each(INTERNATIONAL_LAYERS)("registers %s with provenance and explicit freshness", layer => {
    const s = international_data_sources[layerSources[layer]]; expect(s.endpoint).toMatch(/^https:\/\//); expect(s.license).toBeTruthy(); expect(s.refresh_interval).toBeGreaterThan(0); expect(s.last_verified).toBeNull();
  });
  it.each(["active-fire", "air-quality", "places", "elevation", "timezone"] as const)("%s never invents data when a credential is missing", async layer => {
    vi.stubEnv(international_data_sources[layerSources[layer]].env_key!, "");
    const result = await queryInternational(layer, query); expect(result.status).toBe("AUTH_REQUIRED"); expect(result.data.features).toEqual([]); expect(result.fetched_at).toBeNull(); expect(fetchJson).not.toHaveBeenCalled(); expect(fetchText).not.toHaveBeenCalled();
  });
  it("rejects invalid coordinates, unknown parameters and unbounded profiles", () => {
    expect(querySchema.safeParse({ ...query, lat: 91 }).success).toBe(false); expect(querySchema.safeParse({ ...query, url: "http://localhost" }).success).toBe(false); expect(querySchema.safeParse({ ...query, points: Array(21).fill([1,2]) }).success).toBe(false);
  });
  it("CSV handles quoted commas and preserves empty observations", () => { expect(csv('a,b\n"Name, City",\n')).toEqual([{ a: "Name, City", b: "" }]); expect(timestamp("invalid")).toBeNull(); });
  it("USGS filters spatial radius and magnitude, preserving event time and depth", async () => {
    vi.mocked(fetchJson).mockResolvedValue({ metadata: { generated: Date.now() }, features: [{ type: "Feature", id: "event", geometry: { type: "Point", coordinates: [106.82,-6.2,12] }, properties: { mag: 5, place: "Test fixture", time: 1_700_000_000_000, updated: Date.now(), tsunami: 0 } }, { geometry: { coordinates: [0,0,10] }, properties: { mag: 6 } }] });
    const result = await queryInternational("earthquakes", { ...query, magnitude: 4 }); expect(result.data.features).toHaveLength(1); expect(result.data.features[0].properties.depth_km).toBe(12); expect(result.source.last_verified).toBeTruthy();
  });
  it("deduplicates provider requests and caches per query", async () => {
    vi.mocked(fetchJson).mockResolvedValue({ metadata: { generated: Date.now() }, features: [] });
    await Promise.all([queryInternational("earthquakes", query), queryInternational("earthquakes", query)]); await queryInternational("earthquakes", query); expect(fetchJson).toHaveBeenCalledOnce();
  });
  it("does not normalize provider errors into empty success", async () => {
    vi.mocked(fetchJson).mockResolvedValue({ message: "bad upstream" }); const result = await queryInternational("earthquakes", query); expect(result.status).toBe("ERROR"); expect(result.fetched_at).toBeNull(); expect(interpretData(result)).toContain("Tidak ada nilai pengamatan");
  });
  it("stale provider feed remains stale despite a successful HTTP response", async () => {
    vi.mocked(fetchJson).mockResolvedValue({ metadata: { generated: Date.now() - 3600000 }, features: [] }); const result = await queryInternational("earthquakes", query); expect(result.status).toBe("STALE");
  });
  it("cached feed status ages from provider time even before the fetch cache expires", async () => {
    vi.useFakeTimers();
    try {
      vi.mocked(fetchJson).mockResolvedValue({ metadata: { generated: Date.now() - 50000 }, features: [] });
      expect((await queryInternational("earthquakes", query)).status).toBe("LIVE");
      vi.advanceTimersByTime(11000);
      const cached = await queryInternational("earthquakes", query);
      expect(cached.status).toBe("STALE"); expect(cached.source.status).toBe("STALE"); expect(fetchJson).toHaveBeenCalledOnce();
    } finally { vi.useRealTimers(); }
  });
  it.each(["poi", "accessibility", "water-refill", "ev-charging", "transit-stops"] as const)("%s uses actual OSM coordinates and timestamp, without inferred availability", async layer => {
    vi.mocked(fetchJson).mockResolvedValue({ osm3s: { timestamp_osm_base: new Date().toISOString() }, elements: [{ id: 123, type: "node", lat: -6.2, lon: 106.82, timestamp: "2025-01-01T00:00:00Z", tags: { name: "Test fixture", wheelchair: "limited" } }] });
    const r = await runAdapter(layer, international_data_sources.osm, query); expect(r.features).toHaveLength(1); expect(r.features[0].properties.timestamp).toBe("2025-01-01T00:00:00.000Z"); expect(r.features[0].properties.wheelchair).toBe("limited"); if (layer === "ev-charging") expect(r.features[0].properties.availability).toContain("LOCATION KNOWN");
  });
  it("open-data dispatches the selected adapter and forbids recursion", async () => {
    vi.mocked(fetchJson).mockResolvedValue({ metadata: { generated: Date.now() }, features: [] }); expect((await queryInternational("open-data", { ...query, source: "earthquakes" })).source.id).toBe("usgs"); await expect(queryInternational("open-data", { ...query, source: "open-data" })).rejects.toThrow();
  });
});
