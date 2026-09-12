import { describe, expect, it } from "vitest";

import { calculateRouteProgress, routeToleranceMeters } from "@/src/features/routing/route-progress.service";

const route = {
  distance_meters: 1_100,
  duration_seconds: 900,
  geometry: {
    type: "LineString" as const,
    coordinates: [[106.68, -6.21], [106.685, -6.21], [106.69, -6.21]] as [number, number][],
  },
  maneuvers: [
    { distance_meters: 550, instruction: "Lurus", time_seconds: 450, type: 1 },
    { distance_meters: 550, instruction: "Tujuan berada di depan", time_seconds: 450, type: 4 },
  ],
};

function progress(longitude: number, latitude = -6.21, accuracy = 5) {
  return calculateRouteProgress({
    accuracy_meters: accuracy,
    current_position: { longitude, latitude },
    mode: "walking",
    route,
  });
}

describe("active route linear referencing", () => {
  it("decreases route-derived remaining metrics farther along the same network geometry", () => {
    const a = progress(106.682);
    const b = progress(106.688);
    expect(b.progress_fraction).toBeGreaterThan(a.progress_fraction);
    expect(b.remaining_distance_meters).toBeLessThan(a.remaining_distance_meters);
    expect(b.remaining_duration_seconds).toBeLessThan(a.remaining_duration_seconds);
    expect(b.remaining_geometry.coordinates[0][0]).toBeCloseTo(106.688, 5);
  });

  it("reports real backward movement instead of forcing monotonic progress", () => {
    expect(progress(106.683).remaining_distance_meters).toBeGreaterThan(
      progress(106.687).remaining_distance_meters,
    );
  });

  it("uses accuracy and mode bounded tolerances for route matching", () => {
    expect(progress(106.685, -6.21002).on_route).toBe(true);
    const offRoute = progress(106.685, -6.212);
    expect(offRoute.on_route).toBe(false);
    expect(offRoute.distance_from_route_meters).toBeGreaterThan(offRoute.tolerance_meters);
    expect(routeToleranceMeters("walking", 5)).toBe(18);
    expect(routeToleranceMeters("car", 60)).toBe(90);
  });

  it("advances only provider maneuvers supported by traversed route distance", () => {
    const result = progress(106.6875);
    expect(result.next_maneuver?.instruction).toBe("Tujuan berada di depan");
    expect(result.next_maneuver?.distance_meters).toBeGreaterThan(0);
    expect(result.next_maneuver?.distance_meters).toBeLessThan(550);
  });
});
