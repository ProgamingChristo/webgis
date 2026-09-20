import { beforeEach, describe, expect, it, vi } from "vitest";
import { INTERNATIONAL_LAYERS } from "@/types/international";
import { queryInternational, clearInternationalCache } from "@/src/features/international/service";
import { runAdapter } from "@/src/features/international/adapters";
import { SourceFailure } from "@/src/features/international/http";
vi.mock("@/src/features/international/adapters", () => ({ runAdapter: vi.fn() }));
beforeEach(() => {
  clearInternationalCache(); vi.resetAllMocks();
  for (const key of ["NASA_FIRMS_MAP_KEY", "OPENAQ_API_KEY", "GEONAMES_USERNAME"]) vi.stubEnv(key, "unit-test-only");
});
const query = { lat: -6.2, lon: 106.82, radius: 1000 };
describe.each(INTERNATIONAL_LAYERS)("%s shared provider boundary", layer => {
  const input = layer === "open-data" ? { ...query, source: "earthquakes" } : query;
  it.each([401,403,404,429,500])("propagates HTTP %i without fabricating observations", async code => {
    vi.mocked(runAdapter).mockRejectedValue(new SourceFailure(code === 401 || code === 403 ? "AUTH_REQUIRED" : "ERROR", `Provider HTTP ${code}`, code));
    const data = await queryInternational(layer, input);
    expect(data.fetched_at).toBeNull(); expect(data.data.features).toEqual([]); expect(data.status).toBe(code === 401 || code === 403 ? "AUTH_REQUIRED" : "ERROR");
  });
  it.each(["timeout", "malformed"])("keeps %s unavailable instead of zero", async failure => {
    vi.mocked(runAdapter).mockRejectedValue(new Error(failure));
    const data = await queryInternational(layer, input); expect(data.status).toBe("ERROR"); expect(data.fetched_at).toBeNull();
  });
  it("preserves valid empty success and source timestamps", async () => {
    const updated = new Date().toISOString(); vi.mocked(runAdapter).mockResolvedValue({ features: [], updated });
    const data = await queryInternational(layer, input); expect(data.status).toBe("LIVE"); expect(data.last_updated).toBe(updated); expect(data.data.features).toEqual([]);
  });
  it("does not relabel stale feed metadata as current", async () => {
    vi.mocked(runAdapter).mockResolvedValue({ features: [], updated: "2020-01-01T00:00:00Z" });
    expect((await queryInternational(layer, input)).status).toBe("STALE");
  });
});
