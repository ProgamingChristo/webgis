import {
  type MultiLineStringGeometry,
} from "@/src/types/spatial";
import {
  type CreatePedestrianEdgeInput,
  type PedestrianEdgeDatabaseRow,
  type PedestrianEdgeDTO,
  type PedestrianEdgeEntity,
} from "@/src/types/domain";
import { type SupabaseClient } from "@supabase/supabase-js";
import { mapDatabaseError } from "./errors";
export class PedestrianEdgeRepository {
  constructor(private readonly client: SupabaseClient) {}

  private mapToEntity(row: PedestrianEdgeDatabaseRow): PedestrianEdgeEntity {
    return {
      id: row.id,
      routing_id: row.routing_id,
      code: row.code,
      source: row.source,
      target: row.target,
      geometry: row.geometry as unknown as MultiLineStringGeometry,
      length_meters: Number(row.length_meters),
      cost: Number(row.cost),
      reverse_cost: Number(row.reverse_cost),
      walkable: row.walkable,
      study_area_id: row.study_area_id,
      provenance: {
        source_id: row.source_id,
        source_type: null,
        source_record_id: row.source_record_id,
        data_version: row.data_version,
        retrieved_at: row.retrieved_at,
        metadata: row.metadata as any,
        validation_status: row.validation_status as any,
        validated_at: row.validated_at,
      },
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private mapToDTO(entity: PedestrianEdgeEntity): PedestrianEdgeDTO {
    return entity;
  }

  async findById(id: string): Promise<PedestrianEdgeDTO | null> {
    const { data, error } = await this.client
      .from("pedestrian_edges")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw mapDatabaseError(error, "PedestrianEdgeRepository.findById");
    }

    return this.mapToDTO(this.mapToEntity(data as unknown as PedestrianEdgeDatabaseRow));
  }

  async create(input: CreatePedestrianEdgeInput): Promise<PedestrianEdgeDTO> {
    const { data, error } = await this.client
      .from("pedestrian_edges")
      .insert({
        code: input.code,
        source: input.source,
        target: input.target,
        geometry: input.geometry as unknown as string,
        length_meters: input.length_meters,
        cost: input.cost,
        reverse_cost: input.reverse_cost,
        walkable: input.walkable,
        study_area_id: input.study_area_id,
        source_id: input.provenance.source_id,
        source_record_id: input.provenance.source_record_id,
        data_version: input.provenance.data_version,
        metadata: input.provenance.metadata,
        environment: "DUMMY",
        validation_status: input.provenance.validation_status,
        validated_at: input.provenance.validated_at,
      })
      .select()
      .single();

    if (error) {
      throw mapDatabaseError(error, "PedestrianEdgeRepository.create");
    }

    return this.mapToDTO(this.mapToEntity(data as unknown as PedestrianEdgeDatabaseRow));
  }
}
