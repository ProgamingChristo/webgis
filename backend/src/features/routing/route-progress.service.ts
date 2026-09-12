import type { Coordinate, LineStringGeometry } from "@/src/modules/spatial/spatial.types";
import type { NavigationManeuver, RoutingMode } from "./routing.types";

const EARTH_RADIUS_METERS = 6_371_008.8;

export interface RouteProgressInput {
  accuracy_meters: number;
  current_position: Coordinate;
  mode: RoutingMode;
  route: {
    distance_meters: number;
    duration_seconds: number;
    geometry: LineStringGeometry;
    maneuvers: NavigationManeuver[];
  };
}

export interface RouteProgressResult {
  analysis_method: "route_linear_reference";
  distance_from_route_meters: number;
  matched_position: Coordinate;
  next_maneuver: NavigationManeuver | null;
  on_route: boolean;
  progress_fraction: number;
  remaining_distance_meters: number;
  remaining_duration_seconds: number;
  remaining_geometry: LineStringGeometry;
  tolerance_meters: number;
}

type ProjectedPoint = { x: number; y: number };

export function calculateRouteProgress(input: RouteProgressInput): RouteProgressResult {
  const coordinates = input.route.geometry.coordinates;
  const referenceLatitude = input.current_position.latitude * Math.PI / 180;
  const projectedRoute = coordinates.map(([longitude, latitude]) =>
    project({ longitude, latitude }, referenceLatitude));
  const projectedPosition = project(input.current_position, referenceLatitude);
  const segmentLengths = projectedRoute.slice(1).map((point, index) =>
    Math.hypot(point.x - projectedRoute[index].x, point.y - projectedRoute[index].y));
  const geometryLength = segmentLengths.reduce((sum, length) => sum + length, 0);

  let bestDistance = Number.POSITIVE_INFINITY;
  let bestSegment = 0;
  let bestSegmentFraction = 0;
  let bestMatched = projectedRoute[0];
  let traversedGeometry = 0;
  let lengthBeforeSegment = 0;

  for (let index = 0; index < segmentLengths.length; index += 1) {
    const start = projectedRoute[index];
    const end = projectedRoute[index + 1];
    const length = segmentLengths[index];
    const fraction = length === 0 ? 0 : clamp(
      ((projectedPosition.x - start.x) * (end.x - start.x) +
        (projectedPosition.y - start.y) * (end.y - start.y)) / (length * length),
      0,
      1,
    );
    const matched = {
      x: start.x + (end.x - start.x) * fraction,
      y: start.y + (end.y - start.y) * fraction,
    };
    const distance = Math.hypot(projectedPosition.x - matched.x, projectedPosition.y - matched.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestSegment = index;
      bestSegmentFraction = fraction;
      bestMatched = matched;
      traversedGeometry = lengthBeforeSegment + length * fraction;
    }
    lengthBeforeSegment += length;
  }

  const progressFraction = geometryLength > 0 ? clamp(traversedGeometry / geometryLength, 0, 1) : 0;
  const remainingDistance = Math.max(0, Math.round(input.route.distance_meters * (1 - progressFraction)));
  const remainingDuration = Math.max(0, Math.round(input.route.duration_seconds * (1 - progressFraction)));
  const tolerance = routeToleranceMeters(input.mode, input.accuracy_meters);
  const matchedPosition = unproject(bestMatched, referenceLatitude);
  const remainingCoordinates: [number, number][] = [
    [matchedPosition.longitude, matchedPosition.latitude],
    ...coordinates.slice(bestSegment + 1),
  ];

  return {
    analysis_method: "route_linear_reference",
    distance_from_route_meters: round(bestDistance, 1),
    matched_position: matchedPosition,
    next_maneuver: findNextManeuver(input.route.maneuvers, input.route.distance_meters - remainingDistance),
    on_route: bestDistance <= tolerance,
    progress_fraction: round(progressFraction, 6),
    remaining_distance_meters: remainingDistance,
    remaining_duration_seconds: remainingDuration,
    remaining_geometry: {
      type: "LineString",
      coordinates: remainingCoordinates.length >= 2
        ? remainingCoordinates
        : [coordinates.at(-2)!, coordinates.at(-1)!],
    },
    tolerance_meters: tolerance,
  };
}

export function routeToleranceMeters(mode: RoutingMode, accuracyMeters: number): number {
  const base = mode === "walking" ? 18 : mode === "motorcycle" ? 25 : 32;
  const maximum = mode === "walking" ? 60 : mode === "motorcycle" ? 80 : 100;
  return Math.round(Math.min(maximum, Math.max(base, accuracyMeters * 1.5)));
}

function findNextManeuver(maneuvers: NavigationManeuver[], traversedDistance: number) {
  let traversed = Math.max(0, traversedDistance);
  for (const maneuver of maneuvers) {
    if (traversed < maneuver.distance_meters) {
      return { ...maneuver, distance_meters: Math.max(0, Math.round(maneuver.distance_meters - traversed)) };
    }
    traversed -= maneuver.distance_meters;
  }
  return null;
}

function project(point: Coordinate, referenceLatitude: number): ProjectedPoint {
  return {
    x: EARTH_RADIUS_METERS * point.longitude * Math.PI / 180 * Math.cos(referenceLatitude),
    y: EARTH_RADIUS_METERS * point.latitude * Math.PI / 180,
  };
}

function unproject(point: ProjectedPoint, referenceLatitude: number): Coordinate {
  return {
    longitude: point.x / (EARTH_RADIUS_METERS * Math.cos(referenceLatitude)) * 180 / Math.PI,
    latitude: point.y / EARTH_RADIUS_METERS * 180 / Math.PI,
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number, precision: number) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}
