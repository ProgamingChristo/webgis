import { apiClient } from "@/src/lib/api-client";
import type { Coordinate, LineStringGeometry } from "@/src/types/spatial";

export interface RoutingRequest {
  origin: Coordinate;
  destination: Coordinate;
}

export interface RoutingResult {
  analysis_method: string;
  distance_meters: number;
  duration_seconds: number;
  geometry: LineStringGeometry;
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
  async getWalkingRoute(request: RoutingRequest): Promise<RoutingResult> {
    return apiClient.post<RoutingResult>(
      "/api/routing",
      {
        ...request,
        mode: "walking",
      },
    );
  },

  async getNearestTransport(request: NearestTransportRequest): Promise<NearestTransportResult> {
    return apiClient.post<NearestTransportResult>(
      "/api/transport/nearest",
      request
    );
  }
};
