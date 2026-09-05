import type { Coordinate, LineStringGeometry } from "@/src/modules/spatial/spatial.types";

export const ROUTING_MODES = ["walking", "motorcycle", "car"] as const;

export type RoutingMode = (typeof ROUTING_MODES)[number];
export const ROUTE_PREFERENCES = ["FASTEST", "UMKM"] as const;
export type RoutePreference = (typeof ROUTE_PREFERENCES)[number];

export interface NavigationRouteRequest {
  destination: Coordinate;
  includeAlternatives?: boolean;
  mode: RoutingMode;
  origin: Coordinate;
  preference?: RoutePreference;
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
  route_candidates?: NavigationRouteCandidate[];
  route_preference?: RoutePreference;
  selected_route_id?: string | null;
  umkm_preference_available?: boolean;
  umkm_enrichment_status?: "AVAILABLE" | "UNAVAILABLE" | "NOT_REQUESTED";
}

export interface NavigationRouteCandidate {
  distance_meters: number;
  duration_seconds: number;
  geometry: LineStringGeometry;
  has_ferry: boolean;
  has_highway: boolean;
  has_toll: boolean;
  is_primary: boolean;
  maneuvers: NavigationManeuver[];
  mode: RoutingMode;
  nearby_umkm_count: number | null;
  route_category: "FASTEST" | "ALTERNATIVE" | "UMKM_AREA";
  route_id: string;
  route_rank: number;
  verified_umkm_count: number | null;
  distinct_category_count: number | null;
}

export interface RoutingProvider {
  route(input: NavigationRouteRequest, signal?: AbortSignal): Promise<NavigationRouteResult>;
}
