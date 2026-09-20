import { beforeEach, describe, expect, it, vi } from "vitest";
import { resilientRequest, providerMetrics, resetProviderResilience } from "@/src/features/international/resilience";
import { assessQuality } from "@/src/features/international/quality";
import { international_data_sources } from "@/src/features/international/registry";
import { point } from "@/src/features/international/adapters";
import type { InternationalResult } from "@/types/international";
beforeEach(resetProviderResilience);
describe("provider resilience", () => {
  it("retries transient failures with a bounded budget and isolates hosts", async () => {
    const run = vi.fn().mockRejectedValueOnce(new Error("timeout")).mockResolvedValue("ok");
    expect(await resilientRequest("a", run, { delayMs: 1 })).toBe("ok"); expect(run).toHaveBeenCalledTimes(2);
    const fail = vi.fn().mockRejectedValue(new Error("503"));
    for (let i = 0; i < 3; i++) await expect(resilientRequest("bad", fail, { delayMs: 1 })).rejects.toThrow();
    expect(fail).toHaveBeenCalledTimes(9);
    await expect(resilientRequest("bad", fail)).rejects.toMatchObject({ code: "CIRCUIT_OPEN" });
    expect(fail).toHaveBeenCalledTimes(9);
    expect(await resilientRequest("healthy", async () => "ok")).toBe("ok");
    expect(providerMetrics().bad.circuit_rejections).toBe(1);
  });
  it.each([401,403,404,429])("does not hammer a provider returning %i", async status => {
    const run = vi.fn().mockRejectedValue({ status });
    await expect(resilientRequest("auth", run, { retryable: () => false })).rejects.toEqual({ status });
    expect(run).toHaveBeenCalledOnce();
  });
  it("honors caller cancellation before any request", async () => {
    const run = vi.fn(); const controller = new AbortController(); controller.abort();
    await expect(resilientRequest("a", run, { signal: controller.signal })).rejects.toThrow(); expect(run).not.toHaveBeenCalled();
  });
  it("allows one recovery probe after the circuit cools down", async () => {
    const fail = async () => { throw new Error("failure"); };
    for (let i = 0; i < 3; i++) await expect(resilientRequest("a", fail, { delayMs: 1 })).rejects.toThrow();
    vi.useFakeTimers(); try { vi.setSystemTime(Date.now() + 61000); expect(await resilientRequest("a", async () => 1)).toBe(1); expect(providerMetrics().a.circuit).toBe("CLOSED"); } finally { vi.useRealTimers(); }
  });
});
describe("data quality", () => {
  const source = international_data_sources.usgs;
  function result(): InternationalResult {
    const time = new Date().toISOString();
    return { layer: "earthquakes", status: "LIVE", message: null, source, fetched_at: time, last_updated: time, ttl: 60, truncated: false, warnings: [], data: { type: "FeatureCollection", features: [point(source, "a", 106.8, -6.2, { name: "test fixture" }, time)!] } };
  }
  it("filters invalid spatial coordinates before display or AI", () => {
    const data = result(); data.data.features[0].geometry = { type: "Point", coordinates: [999, 0] };
    const checked = assessQuality(data); expect(checked.data.features).toHaveLength(0); expect(checked.quality?.status).toBe("INVALID");
  });
  it("does not turn unknown timestamps into freshness", () => {
    const data = result(); data.data.features[0].properties.timestamp = null;
    expect(assessQuality(data).quality).toMatchObject({ status: "PARTIAL", timestamp_quality: "UNKNOWN" });
  });
  it("rejects future observations and keeps legitimate empty responses distinct", () => {
    const data = result(); data.data.features[0].properties.timestamp = new Date(Date.now()+86400000).toISOString();
    expect(assessQuality(data).quality?.rejected_records).toBe(1);
    data.data.features = []; expect(assessQuality(data).quality?.status).toBe("FRESH");
  });
});
