import { afterEach, describe, expect, it, vi } from "vitest";

import {
  checkRoutingProviderHealth,
  getRoutingConfiguration,
} from "@/src/features/routing";

vi.mock("server-only", () => ({}));

describe("routing provider configuration and health", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses an explicit Valhalla URL without exposing it in diagnostics", async () => {
    vi.stubEnv("ROUTING_PROVIDER", "valhalla");
    vi.stubEnv("ROUTING_BASE_URL", "http://valhalla:8002");
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));

    const result = await checkRoutingProviderHealth(fetchMock);

    expect(fetchMock).toHaveBeenCalledWith("http://valhalla:8002/status", expect.any(Object));
    expect(result).toEqual({
      provider: "valhalla",
      status: "READY",
      configured: true,
      reachable: true,
      reason_code: null,
    });
    expect(JSON.stringify(result)).not.toContain("http://valhalla:8002");
  });

  it("reports an unreachable provider with a stable reason code", async () => {
    vi.stubEnv("ROUTING_BASE_URL", "http://valhalla:8002");
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));

    await expect(checkRoutingProviderHealth(fetchMock)).resolves.toMatchObject({
      status: "UNAVAILABLE",
      configured: true,
      reachable: false,
      reason_code: "ROUTING_PROVIDER_UNREACHABLE",
    });
  });

  it("rejects unsupported and unsafe provider configuration", () => {
    vi.stubEnv("ROUTING_PROVIDER", "unknown");
    expect(() => getRoutingConfiguration()).toThrow("Unsupported routing provider");

    vi.stubEnv("ROUTING_PROVIDER", "valhalla");
    vi.stubEnv("ROUTING_BASE_URL", "file:///tmp/tiles");
    expect(() => getRoutingConfiguration()).toThrow("must use http or https");
  });
});
