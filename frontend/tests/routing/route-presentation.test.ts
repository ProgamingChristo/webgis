import { describe, expect, it } from "vitest";

import type { RoutingCandidate } from "@/src/services/routing.service";
import { getRouteContext, getRouteIdentity, getRouteLabelAnchor, getRouteLabelOffset } from "@/src/features/routing/route-presentation";

const candidate = (overrides: Partial<RoutingCandidate> = {}): RoutingCandidate => ({
  route_id: "route-1",
  route_rank: 0,
  route_category: "FASTEST",
  is_primary: true,
  mode: "walking",
  distance_meters: 1200,
  duration_seconds: 900,
  geometry: { type: "LineString", coordinates: [[106.7, -6.3], [106.8, -6.3], [106.9, -6.2]] },
  maneuvers: [],
  has_toll: false,
  has_highway: false,
  has_ferry: false,
  nearby_umkm_count: null,
  verified_umkm_count: null,
  distinct_category_count: null,
  ...overrides,
});

describe("route presentation", () => {
  it("uses a provider maneuver road name only when an explicit road marker exists", () => {
    expect(getRouteIdentity(candidate({ maneuvers: [{ instruction: "Turn right onto Jalan Merpati.", distance_meters: 80, time_seconds: 30, type: 10 }] }), 0)).toBe("Lewat Jalan Merpati");
    expect(getRouteIdentity(candidate({ maneuvers: [{ instruction: "Turn right after the shop", distance_meters: 80, time_seconds: 30, type: 10 }] }), 1)).toBe("Rute 2");
  });

  it("shows only backend-backed route context", () => {
    expect(getRouteContext(candidate({ has_toll: true, has_highway: true }))).toEqual(["Tol", "Jalan utama"]);
    expect(getRouteContext(candidate())).toEqual([]);
  });

  it("anchors labels along the real route geometry and separates candidates", () => {
    const first = getRouteLabelAnchor(candidate(), 0, 2);
    const second = getRouteLabelAnchor(candidate(), 1, 2);
    expect(first).not.toEqual(second);
    expect(first?.[0]).toBeGreaterThan(106.7);
    expect(second?.[0]).toBeLessThan(106.9);
  });

  it("uses bounded visual-only offsets to reduce label collisions", () => {
    expect(getRouteLabelOffset(0, 1)).toEqual([0, 0]);
    const offsets = Array.from({ length: 5 }, (_, index) => getRouteLabelOffset(index, 5));
    expect(new Set(offsets.map((offset) => offset.join(","))).size).toBe(5);
    expect(offsets.every(([x, y]) => Math.abs(x) <= 20 && Math.abs(y) <= 22)).toBe(true);
  });
});
