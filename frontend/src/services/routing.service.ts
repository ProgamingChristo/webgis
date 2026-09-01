import { apiClient } from "@/src/lib/api-client";
import type { Coordinate, LineStringGeometry } from "@/src/types/spatial";

export interface RoutingRequest {
  origin: Coordinate;
  destination: Coordinate;
  destination_merchant_id?: string;
}

export const ROUTING_MODES = ["walking", "motorcycle", "car"] as const;
export type RoutingMode = (typeof ROUTING_MODES)[number];

export interface RoutingManeuver {
  distance_meters: number;
  instruction: string;
  time_seconds: number;
  type: number | null;
}

export interface RoutingResult {
  route_status: "ROUTABLE" | "UNROUTABLE" | "OUTSIDE_GRAPH" | "SERVICE_UNAVAILABLE";
  mode: RoutingMode;
  reason_code:
    | "COORDINATES_OUTSIDE_GRAPH"
    | "NO_ROUTE_FOUND"
    | "ROUTING_PROVIDER_INVALID_RESPONSE"
    | "ROUTING_PROVIDER_UNCONFIGURED"
    | "ROUTING_PROVIDER_UNREACHABLE"
    | "ROUTING_REQUEST_ABORTED"
    | "ROUTING_TIMEOUT"
    | "ROUTING_UPSTREAM_ERROR"
    | null;
  analysis_method: string;
  distance_meters: number | null;
  duration_seconds: number | null;
  geometry: LineStringGeometry | null;
  maneuvers: RoutingManeuver[];
  engine: string;
  warnings: string[];
  has_toll: boolean;
  has_highway: boolean;
  has_ferry: boolean;
  limitation_flags: string[];
  route_source: string;
  source: string;
}

export interface NearestTransportRequest {
  origin: Coordinate;
  radius_meters?: number;
}

export interface NearestTransportResult {
  analysis_method: string;
  radius_meters: number;
  records: unknown[];
  returned_count: number;
  source: string;
}

export const routingService = {
  async getRoute(
    request: RoutingRequest,
    mode: RoutingMode,
    signal?: AbortSignal,
  ): Promise<RoutingResult> {
    return apiClient.post<RoutingResult>(
      "/api/routing",
      {
        ...request,
        mode,
      },
      { signal },
    );
  },

  async getNearestTransport(request: NearestTransportRequest): Promise<NearestTransportResult> {
    return apiClient.post<NearestTransportResult>(
      "/api/transport/nearest",
      request
    );
  }
};
