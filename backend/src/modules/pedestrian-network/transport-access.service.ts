import { SupabaseClient } from "@supabase/supabase-js";

export class TransportAccessService {
  constructor(private readonly client: SupabaseClient) {}

  /**
   * Snaps a transport node to the nearest pedestrian node and creates an access link.
   * This is generally used in ingestion/batch processing, but can be invoked per node.
   */
  async createAccessLink(
    transportNodeId: string,
    environment: string = "DUMMY",
    maxDistanceMeters: number = 50
  ): Promise<any> {
    
    // We would typically use PostGIS ST_Distance to find the nearest node.
    // For Phase 11, we will implement this via a raw RPC call or a PostgREST query using PostGIS functions.
    // Example using an RPC that handles the snapping logic:
    const { data, error } = await this.client
      .rpc("snap_transport_node_to_pedestrian_network", {
        p_transport_node_id: transportNodeId,
        p_max_distance_meters: maxDistanceMeters,
        p_environment: environment,
      });

    if (error) {
      throw new Error(`Failed to create access link: ${error.message}`);
    }

    return data;
  }
}
