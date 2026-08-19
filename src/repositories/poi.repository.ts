import { type SupabaseClient } from "@supabase/supabase-js";
import { mapDatabaseError, RepositoryError } from "./errors";
import type {
  PoiDatabaseRow,
  PoiEntity,
  PoiDTO,
  CreatePoiInput,
  UpdatePoiInput,
  SpatialNearbyQuery,
} from "@/src/types/domain";

export class PoiRepository {
  constructor(private readonly client: SupabaseClient) {}

  private mapToEntity(row: PoiDatabaseRow): PoiEntity {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      category: row.category,
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

  private mapToDTO(entity: PoiEntity): PoiDTO {
    return { ...entity };
  }

  async findById(id: string): Promise<PoiDTO | null> {
    const { data, error } = await this.client
      .from("pois")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw mapDatabaseError(error, "PoiRepository.findById");
    }

    return this.mapToDTO(this.mapToEntity(data as unknown as PoiDatabaseRow));
  }

  async findByCode(code: string, environment: string): Promise<PoiDTO | null> {
    const { data, error } = await this.client
      .from("pois")
      .select("*")
      .eq("code", code)
      .eq("environment", environment)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw mapDatabaseError(error, "PoiRepository.findByCode");
    }

    return this.mapToDTO(this.mapToEntity(data as unknown as PoiDatabaseRow));
  }

  async findNearby(query: SpatialNearbyQuery): Promise<PoiDTO[]> {
    const { data, error } = await this.client.rpc("find_pois_nearby", {
      p_lat: query.lat,
      p_lng: query.lng,
      p_radius_meters: query.radiusMeters,
      p_limit: query.limit ?? 20,
      p_category: query.category ?? null,
      p_environment: query.environment ?? "DUMMY"
    });

    if (error) {
      throw mapDatabaseError(error, "PoiRepository.findNearby");
    }

    return (data as unknown as PoiDatabaseRow[]).map(row => this.mapToDTO(this.mapToEntity(row)));
  }

  async create(input: CreatePoiInput): Promise<PoiDTO> {
    const payload = {
      code: input.code,
      name: input.name,
      category: input.category,
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
      .from("pois")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      throw mapDatabaseError(error, "PoiRepository.create");
    }

    return this.mapToDTO(this.mapToEntity(data as unknown as PoiDatabaseRow));
  }
}
