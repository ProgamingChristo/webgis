import { apiClient } from "@/src/lib/api-client";
import type { Coordinate } from "@/src/types/spatial";

export interface WalkingServiceArea {
  status: "READY" | "NO_NETWORK_ACCESS";
  service_area_type?: "REACHABLE_NETWORK_EDGES";
  threshold_minutes?: number;
  reachable_node_count?: number;
  reachable_edge_count?: number;
  geometry?: GeoJSON.MultiLineString | null;
  limitation_flags?: string[];
}

export const commuterService = {
  serviceArea(origin: Coordinate, maxMinutes: number, signal?: AbortSignal) {
    return apiClient.post<WalkingServiceArea>(
      "/api/spatial/service-area",
      { origin, max_minutes: maxMinutes },
      { signal },
    );
  },
};
