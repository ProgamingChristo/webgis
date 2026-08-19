import { SupabaseClient } from "@supabase/supabase-js";
import { EntityNetworkAccessRepository } from "@/src/repositories/entity-network-access.repository";
import type { EntityNetworkAccessEntity } from "@/src/types/domain";
import type { PointGeometry } from "@/src/types/spatial";

export class EntityAccessService {
  constructor(
    private readonly client: SupabaseClient,
    private readonly accessRepo: EntityNetworkAccessRepository
  ) {}

  /**
   * Snaps an entity (UMKM or POI) to the nearest pedestrian node within a threshold.
   * If successful, creates and materializes a network access link.
   */
  async snapEntityToNetwork(
    entityType: "UMKM" | "POI",
    entityId: string,
    geometry: PointGeometry,
    maxSnapDistanceMeters: number = 50,
    environment: string = "DUMMY"
  ): Promise<EntityNetworkAccessEntity | null> {
    const [lng, lat] = geometry.coordinates;

    const { data, error } = await this.client
      .rpc("find_nearest_pedestrian_node", {
        p_lat: lat,
        p_lng: lng,
        p_radius_meters: maxSnapDistanceMeters,
        p_environment: environment,
      })
      .single();

    if (error || !data) {
      // PGRST116 means zero rows returned
      if (error && error.code !== "PGRST116") {
        throw new Error(`Failed to find nearest node: ${error.message}`);
      }
      return null;
    }

    const result = data as any;
    
    // Check if link already exists
    const existing = await this.accessRepo.findEntityAccess(entityType, entityId, environment);
    if (existing) {
      return existing;
    }

    return this.accessRepo.linkEntityToNetwork({
      entityType,
      entityId,
      pedestrianNodeId: result.id,
      snapDistanceMeters: result.distance_meters,
      environment,
    });
  }
}
