import { SupabaseClient } from "@supabase/supabase-js";
import { UmkmRepository } from "@/src/repositories/umkm.repository";
import { EntityAccessService } from "@/src/modules/accessibility/entity-access.service";
import { createUmkmSchema, updateUmkmSchema, spatialNearbyQuerySchema } from "@/src/schemas/data-model.schema";
import type { CreateUmkmInput, UpdateUmkmInput, SpatialNearbyQuery, UmkmDTO } from "@/src/types/domain";
import { z } from "zod";

export class UmkmService {
  constructor(
    private readonly client: SupabaseClient,
    private readonly umkmRepo: UmkmRepository,
    private readonly entityAccessService: EntityAccessService
  ) {}

  async create(input: CreateUmkmInput): Promise<UmkmDTO> {
    const validatedInput = createUmkmSchema.parse(input);
    
    // Additional validation could go here (e.g. check if code exists)
    const existing = await this.umkmRepo.findByCode(validatedInput.code, validatedInput.environment);
    if (existing) {
      throw new Error(`UMKM with code ${validatedInput.code} already exists in ${validatedInput.environment} environment.`);
    }

    const umkm = await this.umkmRepo.create(validatedInput as CreateUmkmInput);

    // Try snapping to network
    try {
      await this.entityAccessService.snapEntityToNetwork(
        "UMKM",
        umkm.id,
        umkm.geometry,
        50, // max 50m snap distance
        umkm.environment
      );
    } catch (err) {
      console.warn(`Failed to snap UMKM ${umkm.code} to pedestrian network:`, err);
    }

    return umkm;
  }

  async findNearby(query: SpatialNearbyQuery): Promise<UmkmDTO[]> {
    const validatedQuery = spatialNearbyQuerySchema.parse(query);
    return this.umkmRepo.findNearby(validatedQuery);
  }

  async findById(id: string): Promise<UmkmDTO | null> {
    return this.umkmRepo.findById(id);
  }
}
