import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { CachedRoutingProvider } from "@/src/features/routing/cached-routing.provider";

const input = { origin: { latitude: -6.2, longitude: 106.8 }, destination: { latitude: -6.21, longitude: 106.81 }, mode: "walking" as const };
const result = { route_status: "ROUTABLE" as const, reason_code: null, mode: "walking" as const, engine: "valhalla" as const,
  source: "OPENSTREETMAP" as const, warnings: [], distance_meters: 100, duration_seconds: 100,
  geometry: { type: "LineString" as const, coordinates: [[106.8, -6.2], [106.81, -6.21]] }, maneuvers: [],
  has_toll: false, has_highway: false, has_ferry: false };

describe("routing cache request isolation", () => {
  it("does not share primary, alternative, fastest, and UMKM preference entries", async () => {
    const provider = { route: vi.fn().mockResolvedValue(result) };
    const cached = new CachedRoutingProvider(provider);
    await cached.route(input); await cached.route(input);
    await cached.route({ ...input, includeAlternatives: true, preference: "FASTEST" });
    await cached.route({ ...input, includeAlternatives: true, preference: "UMKM" });
    expect(provider.route).toHaveBeenCalledTimes(3);
  });
});
