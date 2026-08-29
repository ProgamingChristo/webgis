import { apiClient } from "@/src/lib/api-client";
import type { Coordinate, LineStringGeometry } from "@/src/types/spatial";

export interface RoutingRequest {
  origin: Coordinate;
  destination: Coordinate;
  destination_merchant_id?: string;
}

export interface RoutingResult {
  route_status: "ROUTABLE" | "UNROUTABLE" | "NO_NETWORK_ACCESS";
  analysis_method: string;
  distance_meters: number | null;
  network_distance_meters: number | null;
  access_distance_meters: number | null;
  duration_seconds: number | null;
  geometry: LineStringGeometry | null;
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
  async getWalkingRoute(request: RoutingRequest, signal?: AbortSignal): Promise<RoutingResult> {
    return apiClient.post<RoutingResult>(
      "/api/routing",
      {
        ...request,
        mode: "walking",
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
