import {
  type CreateTransportAccessLinkInput,
  type TransportAccessLinkDatabaseRow,
  type TransportAccessLinkDTO,
  type TransportAccessLinkEntity,
} from "@/src/types/domain";
import { type SupabaseClient } from "@supabase/supabase-js";
import { mapDatabaseError, RepositoryError } from "./errors";

export class TransportAccessLinkRepository {
  constructor(private readonly client: SupabaseClient) {}

  private mapToEntity(row: TransportAccessLinkDatabaseRow): TransportAccessLinkEntity {
    return {
      id: row.id,
      transport_node_id: row.transport_node_id,
      pedestrian_node_id: row.pedestrian_node_id,
      distance_meters: Number(row.distance_meters),
      environment: row.environment,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private mapToDTO(entity: TransportAccessLinkEntity): TransportAccessLinkDTO {
    return entity;
  }

  async findById(id: string): Promise<TransportAccessLinkDTO | null> {
    const { data, error } = await this.client
      .from("transport_access_links")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw mapDatabaseError(error, "TransportAccessLinkRepository.findById");
    }

    return this.mapToDTO(this.mapToEntity(data as unknown as TransportAccessLinkDatabaseRow));
  }

  async create(input: CreateTransportAccessLinkInput): Promise<TransportAccessLinkDTO> {
    const { data, error } = await this.client
      .from("transport_access_links")
      .insert({
        transport_node_id: input.transport_node_id,
        pedestrian_node_id: input.pedestrian_node_id,
        distance_meters: input.distance_meters,
        environment: "DUMMY",
      })
      .select()
      .single();

    if (error) {
      throw mapDatabaseError(error, "TransportAccessLinkRepository.create");
    }

    return this.mapToDTO(this.mapToEntity(data as unknown as TransportAccessLinkDatabaseRow));
  }
}
