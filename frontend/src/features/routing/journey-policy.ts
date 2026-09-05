import { LngLat } from "maplibre-gl";
import type { Coordinate } from "@/src/types/spatial";
import type { RoutingMode } from "@/src/services/routing.service";

export const JOURNEY_POLICY = {
  minimumIntervalMs: 15_000,
  manualIntervalMs: 1_000,
  maximumFixAgeMs: 20_000,
  maximumAccuracyMeters: 50,
  arrivalAccuracyMeters: 20,
  arrivalProximityMeters: 25,
  arrivalRouteMeters: 50,
  arrivalOriginDriftMeters: 10,
  movementMeters: { walking: 25, motorcycle: 50, car: 75 } satisfies Record<RoutingMode, number>,
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
