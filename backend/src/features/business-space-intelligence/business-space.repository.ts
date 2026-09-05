import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { DemandIntelligenceRepository } from "@/src/features/demand-intelligence";
import { CanonicalMerchantReadService } from "@/src/features/merchant-reconciliation/canonical-merchant-read.service";
import { CommuterNetworkRepository } from "@/src/features/commuter";
import { TransportNodeRepository } from "@/src/repositories/transport-node.repository";
import { MapidMissionRepository } from "@/src/integrations/mapid/mission.repository";
import type { MapidMissionObservationDTO } from "@/src/integrations/mapid/mission.types";
import type { JsonObject } from "@/src/types/provenance";
import { mapDatabasePointGeometry } from "@/src/mappers/geometry.mapper";
import { toBoundaryFeature } from "@/src/features/administrative-boundaries/administrative-boundary.service";

export class BusinessSpaceRepository {
  readonly demand: DemandIntelligenceRepository;
  readonly network: CommuterNetworkRepository;

  constructor(private readonly supabase: SupabaseClient<any>) {
    this.demand = new DemandIntelligenceRepository(supabase);
    this.network = new CommuterNetworkRepository(supabase);
  }

  async listPropertyObservations(input: {
    bbox: { minLng: number; minLat: number; maxLng: number; maxLat: number };
    limit: number;
    offset: number;
  }): Promise<{ items: MapidMissionObservationDTO[]; total: number }> {
    return new MapidMissionRepository(this.supabase).listObservations({
      bbox: input.bbox,
      limit: input.limit,
      offset: input.offset,
      sourceType: "PROPERTI_GO",
    });
  }

  async getPropertyObservation(id: string): Promise<MapidMissionObservationDTO | null> {
    const { data, error } = await this.supabase
      .from("mapid_mission_observations")
      .select("id,source_record_id,source_type,geometry::json,normalized_properties,observed_at,provenance,freshness_status,verification_status")
      .eq("id", id)
      .eq("source_type", "PROPERTI_GO")
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      id: data.id,
      source_id: data.source_record_id,
      source_type: "PROPERTI_GO",
      geometry: mapDatabasePointGeometry(data.geometry),
      properties: asObject(data.normalized_properties) as JsonObject,
      observed_at: data.observed_at,
      provenance: asObject(data.provenance) as JsonObject,
      freshness_status: data.freshness_status,
      verification_status: data.verification_status,
    };
  }

  async listRegions() {
    const { data, error } = await this.supabase
      .from("administrative_regions")
      .select("id,name,region_type,geometry::json");
    if (error) throw error;
    return (data ?? []).map((row: any) => {
      const feature = toBoundaryFeature(row);
      return {
        id: feature.properties.id,
        name: feature.properties.name,
        ...feature.properties.bounds,
        geometry: feature.geometry,
      };
    });
  }

  async listSimilarMerchants(input: {
    bounds: { west: number; south: number; east: number; north: number };
    category: string;
    regionId: string | null;
  }) {
    const page = await new CanonicalMerchantReadService(this.supabase).list({
      ...input.bounds,
      limit: 16,
      offset: 0,
      keyword: null,
      category: input.category,
      regionIds: input.regionId ? [input.regionId] : [],
    });
    return page.merchants.slice(0, 12);
  }

  async listTransit(latitude: number, longitude: number) {
    return new TransportNodeRepository(this.supabase).findNear(
      { latitude, longitude, radius_meters: 1_200 },
      { limit: 8, offset: 0, page: 1, sort: "created_at", order: "desc" },
    );
  }
}

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
