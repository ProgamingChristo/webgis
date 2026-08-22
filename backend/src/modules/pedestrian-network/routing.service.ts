import { SupabaseClient } from "@supabase/supabase-js";
import { WalkingRouteResult } from "@/src/types/domain";

export class RoutingService {
  constructor(private readonly client: SupabaseClient) {}

  /**
   * Calculates the shortest path between two pedestrian nodes using pgRouting (pgr_dijkstra).
   */
  async getShortestPath(
    originNodeRoutingId: number,
    destinationNodeRoutingId: number,
    environment: string = "DUMMY"
  ): Promise<WalkingRouteResult> {
    
    // We will use a raw query or an RPC wrapper to call pgRouting.
    // Since postgrest doesn't expose pgRouting directly, we must use an RPC.
    // Let's call `calculate_walking_route` which we need to define in DB.
    const { data, error } = await this.client
      .rpc("calculate_walking_route", {
        p_origin_id: originNodeRoutingId,
        p_destination_id: destinationNodeRoutingId,
        p_environment: environment,
      });

    if (error) {
      throw new Error(`Routing failed: ${error.message}`);
    }

    if (!data || (data as any).length === 0) {
      throw new Error("No route found between the specified nodes.");
    }

    const routeData = data as any;
    
    return {
      originNodeId: routeData.origin_node_id,
      destinationNodeId: routeData.destination_node_id,
      edgeIds: routeData.edge_ids || [],
      distanceMeters: routeData.total_distance_meters || 0,
      durationSeconds: routeData.total_duration_seconds || 0,
      geometry: routeData.geometry, // typically reconstructed GeoJSON LineString
      analysisMethod: "pgr_dijkstra",
      environment,
    };
  }
}
