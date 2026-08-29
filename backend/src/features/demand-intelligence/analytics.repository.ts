import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnalyticsQuery, DemandIntelligenceResult } from "./analytics.types";

export class DemandIntelligenceRepository {
  constructor(private readonly supabase: SupabaseClient<any>) {}

  async get(query: AnalyticsQuery): Promise<DemandIntelligenceResult> {
    const { data, error } = await this.supabase.rpc("get_demand_intelligence_v1", {
      p_region_ids: query.region_ids.length ? query.region_ids : null,
      p_category_slug: query.category,
      p_start_at: query.start_at,
      p_end_at: query.end_at,
      p_west: query.bbox?.west ?? null,
      p_south: query.bbox?.south ?? null,
      p_east: query.bbox?.east ?? null,
      p_north: query.bbox?.north ?? null,
      p_limit: query.limit,
    });
    if (error) throw error;
    return data as DemandIntelligenceResult;
  }
}
