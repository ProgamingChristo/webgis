import { describe, expect, it } from "vitest";

import { recommendRoutingMode } from "@/src/features/routing/routing-recommendation";
import type { RoutingMode, RoutingResult } from "@/src/services/routing.service";

describe("routing recommendation", () => {
  it("recommends walking for a short transit-area route", () => {
    const routes = {
      walking: route("walking", 570, 480),
      motorcycle: route("motorcycle", 1_000, 300),
      car: route("car", 1_200, 420),
    };
    expect(recommendRoutingMode(routes, { originNearTransit: true })).toBe("walking");
  });

  it("recommends a motorized mode for a long-distance merchant", () => {
    const routes = {
      walking: route("walking", 31_000, 22_000),
      motorcycle: route("motorcycle", 35_000, 3_200),
      car: route("car", 39_000, 4_200),
    };
    expect(recommendRoutingMode(routes)).toBe("motorcycle");
  });

  it("ignores unavailable modes", () => {
    const walking = route("walking", 800, 700);
    walking.route_status = "UNROUTABLE";
    walking.geometry = null;
    expect(recommendRoutingMode({ walking, car: route("car", 1_200, 500) })).toBe("car");
  });
});

function route(mode: RoutingMode, distance: number, duration: number): RoutingResult {
  return {
    mode,
    reason_code: null,
    route_status: "ROUTABLE",
    analysis_method: "navigation_route",
    distance_meters: distance,
    duration_seconds: duration,
    geometry: { type: "LineString", coordinates: [[106.8, -6.2], [106.81, -6.21]] },
    maneuvers: [],
    engine: "valhalla",
    warnings: [],
    has_toll: false,
    has_highway: false,
    has_ferry: false,
    limitation_flags: [],
    route_source: "valhalla",
    source: "OPENSTREETMAP",
  };
}
