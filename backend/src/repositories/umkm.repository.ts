import { type SupabaseClient } from "@supabase/supabase-js";
import { mapDatabaseError } from "./errors";
import type {
  UmkmDatabaseRow,
  UmkmEntity,
  UmkmDTO,
  CreateUmkmInput,
  SpatialNearbyQuery,
} from "@/src/types/domain";

export class UmkmRepository {
  constructor(private readonly client: SupabaseClient) {}

  private mapToEntity(row: UmkmDatabaseRow): UmkmEntity {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      category: row.category,
      description: row.description || undefined,
      geometry: row.geometry as any,
      studyAreaId: row.study_area_id,
      environment: row.environment,
      created_at: row.created_at,
      updated_at: row.updated_at,
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
    };
  }

  private mapToDTO(entity: UmkmEntity): UmkmDTO {
    return { ...entity };
  }

  async findById(id: string): Promise<UmkmDTO | null> {
    const { data, error } = await this.client
      .from("umkm")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw mapDatabaseError(error, "UmkmRepository.findById");
    }

    return this.mapToDTO(this.mapToEntity(data as unknown as UmkmDatabaseRow));
  }

  async findByCode(code: string, environment: string): Promise<UmkmDTO | null> {
    const { data, error } = await this.client
      .from("umkm")
      .select("*")
      .eq("code", code)
      .eq("environment", environment)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw mapDatabaseError(error, "UmkmRepository.findByCode");
    }

    return this.mapToDTO(this.mapToEntity(data as unknown as UmkmDatabaseRow));
  }

  async findNearby(query: SpatialNearbyQuery): Promise<UmkmDTO[]> {
    const { data, error } = await this.client.rpc("find_umkm_nearby", {
      p_lat: query.lat,
      p_lng: query.lng,
      p_radius_meters: query.radiusMeters,
      p_limit: query.limit ?? 20,
      p_category: query.category ?? null,
      p_environment: query.environment ?? "DUMMY"
    });

    if (error) {
      throw mapDatabaseError(error, "UmkmRepository.findNearby");
    }

    return (data as unknown as UmkmDatabaseRow[]).map(row => this.mapToDTO(this.mapToEntity(row)));
  }

  async create(input: CreateUmkmInput): Promise<UmkmDTO> {
    const payload = {
      code: input.code,
      name: input.name,
      category: input.category,
      description: input.description,
      geometry: input.geometry,
      study_area_id: input.studyAreaId,
      environment: input.environment,
      source_id: input.provenance.source_id,
      source_record_id: input.provenance.source_record_id,
      data_version: input.provenance.data_version,
      metadata: input.provenance.metadata,
      validation_status: input.provenance.validation_status,
      validated_at: input.provenance.validated_at,
    };

    const { data, error } = await this.client
      .from("umkm")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      throw mapDatabaseError(error, "UmkmRepository.create");
    }

    return this.mapToDTO(this.mapToEntity(data as unknown as UmkmDatabaseRow));
  }
}
