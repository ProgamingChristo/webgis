import { type SupabaseClient } from "@supabase/supabase-js";
import { mapDatabaseError } from "./errors";
import type { EntityNetworkAccessEntity, EntityNetworkAccessDatabaseRow } from "@/src/types/domain";

export class EntityNetworkAccessRepository {
  constructor(private readonly client: SupabaseClient) {}

  private mapToEntity(row: EntityNetworkAccessDatabaseRow): EntityNetworkAccessEntity {
    return {
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      pedestrianNodeId: row.pedestrian_node_id,
      snapDistanceMeters: row.snap_distance_meters,
      environment: row.environment,
      createdAt: row.created_at,
    };
  }

  async linkEntityToNetwork(input: Omit<EntityNetworkAccessEntity, "id" | "createdAt">): Promise<EntityNetworkAccessEntity> {
    const payload = {
      entity_type: input.entityType,
      entity_id: input.entityId,
      pedestrian_node_id: input.pedestrianNodeId,
      snap_distance_meters: input.snapDistanceMeters,
      environment: input.environment,
    };

    const { data, error } = await this.client
      .from("entity_network_access")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      throw mapDatabaseError(error, "EntityNetworkAccessRepository.linkEntityToNetwork");
    }

    return this.mapToEntity(data as unknown as EntityNetworkAccessDatabaseRow);
  }

  async findEntityAccess(entityType: "UMKM" | "POI", entityId: string, environment: string): Promise<EntityNetworkAccessEntity | null> {
    const { data, error } = await this.client
      .from("entity_network_access")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .eq("environment", environment)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw mapDatabaseError(error, "EntityNetworkAccessRepository.findEntityAccess");
    }

    return this.mapToEntity(data as unknown as EntityNetworkAccessDatabaseRow);
  }
}
