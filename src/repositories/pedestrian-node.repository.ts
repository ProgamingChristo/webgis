import {
  type PointGeometry,
} from "@/src/types/spatial";
import {
  type CreatePedestrianNodeInput,
  type PedestrianNodeDatabaseRow,
  type PedestrianNodeDTO,
  type PedestrianNodeEntity,
} from "@/src/types/domain";
import { type SupabaseClient } from "@supabase/supabase-js";
import { mapDatabaseError } from "./errors";
export class PedestrianNodeRepository {
  constructor(private readonly client: SupabaseClient) {}

  private mapToEntity(row: PedestrianNodeDatabaseRow): PedestrianNodeEntity {
    return {
      id: row.id,
      routing_id: row.routing_id,
      code: row.code,
      geometry: row.geometry as unknown as PointGeometry,
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

  private mapToDTO(entity: PedestrianNodeEntity): PedestrianNodeDTO {
    return entity;
  }

  async findById(id: string): Promise<PedestrianNodeDTO | null> {
    const { data, error } = await this.client
      .from("pedestrian_nodes")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw mapDatabaseError(error, "PedestrianNodeRepository.findById");
    }

    return this.mapToDTO(this.mapToEntity(data as unknown as PedestrianNodeDatabaseRow));
  }

  async create(input: CreatePedestrianNodeInput): Promise<PedestrianNodeDTO> {
    const { data, error } = await this.client
      .from("pedestrian_nodes")
      .insert({
        code: input.code,
        geometry: input.geometry as unknown as string,
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
      throw mapDatabaseError(error, "PedestrianNodeRepository.create");
    }

    return this.mapToDTO(this.mapToEntity(data as unknown as PedestrianNodeDatabaseRow));
  }
}
