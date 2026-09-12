import { LngLat } from "maplibre-gl";
import type { Coordinate } from "@/src/types/spatial";
import type { RoutingMode } from "@/src/services/routing.service";

export const JOURNEY_POLICY = {
  routeMinimumIntervalMs: 15_000,
  progressMinimumIntervalMs: { walking: 4_000, motorcycle: 3_000, car: 3_000 } satisfies Record<RoutingMode, number>,
  manualIntervalMs: 1_000,
  maximumFixAgeMs: 20_000,
  maximumAccuracyMeters: 50,
  recentFixBufferSize: 5,
  bestFixHoldMs: 5_000,
  accuracyRegressionToleranceMeters: 12,
  degradedSampleThreshold: 2,
  arrivalAccuracyMeters: 20,
  arrivalProximityMeters: 25,
  arrivalRouteMeters: 50,
  arrivalProgressFraction: 0.98,
  arrivalOriginDriftMeters: 10,
  progressMovementMeters: { walking: 8, motorcycle: 15, car: 25 } satisfies Record<RoutingMode, number>,
  offRouteConsecutiveSamples: 3,
  geolocation: { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 } satisfies PositionOptions,
};

// Proximity is only a reroute/arrival trigger. Never use it as a route metric.
export function proximityMeters(a: Coordinate, b: Coordinate): number {
  return new LngLat(a.longitude, a.latitude).distanceTo(new LngLat(b.longitude, b.latitude));
}

export function validCoordinate(p: Coordinate | null): p is Coordinate {
  return Boolean(p && Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 90 &&
    Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180);
}
