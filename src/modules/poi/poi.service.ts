import { SupabaseClient } from "@supabase/supabase-js";
import { PoiRepository } from "@/src/repositories/poi.repository";
import { EntityAccessService } from "@/src/modules/accessibility/entity-access.service";
import { createPoiSchema, spatialNearbyQuerySchema } from "@/src/schemas/data-model.schema";
import type { CreatePoiInput, SpatialNearbyQuery, PoiDTO } from "@/src/types/domain";

export class PoiService {
  constructor(
    private readonly client: SupabaseClient,
    private readonly poiRepo: PoiRepository,
    private readonly entityAccessService: EntityAccessService
  ) {}

  async create(input: CreatePoiInput): Promise<PoiDTO> {
    const validatedInput = createPoiSchema.parse(input);
    
    const existing = await this.poiRepo.findByCode(validatedInput.code, validatedInput.environment);
    if (existing) {
      throw new Error(`POI with code ${validatedInput.code} already exists in ${validatedInput.environment} environment.`);
    }

    const poi = await this.poiRepo.create(validatedInput as CreatePoiInput);

    // Try snapping to network
    try {
      await this.entityAccessService.snapEntityToNetwork(
        "POI",
        poi.id,
        poi.geometry,
        50, // max 50m snap distance
        poi.environment
      );
    } catch (err) {
      console.warn(`Failed to snap POI ${poi.code} to pedestrian network:`, err);
    }

    return poi;
  }

  async findNearby(query: SpatialNearbyQuery): Promise<PoiDTO[]> {
    const validatedQuery = spatialNearbyQuerySchema.parse(query);
    return this.poiRepo.findNearby(validatedQuery);
  }

  async findById(id: string): Promise<PoiDTO | null> {
    return this.poiRepo.findById(id);
  }
}
