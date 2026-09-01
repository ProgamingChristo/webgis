import type { Coordinate, LineStringGeometry } from "@/src/modules/spatial/spatial.types";

export const ROUTING_MODES = ["walking", "motorcycle", "car"] as const;

export type RoutingMode = (typeof ROUTING_MODES)[number];

export interface NavigationRouteRequest {
  destination: Coordinate;
  mode: RoutingMode;
  origin: Coordinate;
}

export interface NavigationManeuver {
  distance_meters: number;
  instruction: string;
  time_seconds: number;
  type: number | null;
}

export type NavigationRouteStatus =
  | "ROUTABLE"
  | "UNROUTABLE"
  | "OUTSIDE_GRAPH"
  | "SERVICE_UNAVAILABLE";

export type NavigationFailureCode =
  | "COORDINATES_OUTSIDE_GRAPH"
  | "NO_ROUTE_FOUND"
  | "ROUTING_PROVIDER_INVALID_RESPONSE"
  | "ROUTING_PROVIDER_UNCONFIGURED"
  | "ROUTING_PROVIDER_UNREACHABLE"
  | "ROUTING_REQUEST_ABORTED"
  | "ROUTING_TIMEOUT"
  | "ROUTING_UPSTREAM_ERROR";

export interface NavigationRouteResult {
  distance_meters: number | null;
  duration_seconds: number | null;
  engine: "valhalla";
  geometry: LineStringGeometry | null;
  has_ferry: boolean;
  has_highway: boolean;
  has_toll: boolean;
  maneuvers: NavigationManeuver[];
  mode: RoutingMode;
  reason_code: NavigationFailureCode | null;
  route_status: NavigationRouteStatus;
  source: "OPENSTREETMAP";
  warnings: string[];
}

export interface RoutingProvider {
  route(input: NavigationRouteRequest, signal?: AbortSignal): Promise<NavigationRouteResult>;
}
