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

  /**
   * Calculates a walking route from arbitrary coordinates.
   * Snaps origin and destination to the nearest pedestrian nodes first.
   */
  async getRoute(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
    radiusMeters: number = 1000,
    environment: string = "DUMMY"
  ): Promise<WalkingRouteResult> {
    // Snap origin
    const { data: originData, error: originErr } = await this.client.rpc("find_nearest_pedestrian_node", {
      p_lat: originLat,
      p_lng: originLng,
      p_radius_meters: radiusMeters,
      p_environment: environment
    });

    if (originErr || !originData || originData.length === 0) {
      throw new Error("NO_NEARBY_NETWORK: Origin is too far from the pedestrian network.");
    }
    const originNode = originData[0];

    // Snap destination
    const { data: destData, error: destErr } = await this.client.rpc("find_nearest_pedestrian_node", {
      p_lat: destLat,
      p_lng: destLng,
      p_radius_meters: radiusMeters,
      p_environment: environment
    });

    if (destErr || !destData || destData.length === 0) {
      throw new Error("NO_NEARBY_NETWORK: Destination is too far from the pedestrian network.");
    }
    const destNode = destData[0];

    return this.getShortestPath(originNode.routing_id, destNode.routing_id, environment);
  }
}
