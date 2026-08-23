import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/src/types/database.types";
import { TargetType } from "../types/targeting.types";

export class TargetingRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findTargetByCampaignId(campaignId: string) {
    const { data, error } = await this.supabase
      .from("ad_campaign_targets")
      .select("*")
      .eq("campaign_id", campaignId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  async upsertTarget(params: {
    campaignId: string;
    targetType: TargetType;
    radiusMeters: number | null;
    studyAreaId: string | null;
    centerGeometry?: any;
  }) {
    const { campaignId, targetType, radiusMeters, studyAreaId, centerGeometry } = params;

    const payload: any = {
      campaign_id: campaignId,
      target_type: targetType,
      radius_meters: targetType === "RADIUS" ? radiusMeters : null,
      study_area_id: targetType === "STUDY_AREA" ? studyAreaId : null,
      center_geometry: targetType === "RADIUS" ? centerGeometry : null,
    };

    const { data, error } = await this.supabase
      .from("ad_campaign_targets")
      .upsert(payload, { onConflict: "campaign_id" })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async getMerchantLocation(merchantId: string): Promise<{ longitude: number; latitude: number } | null> {
    const { data, error } = await this.supabase
      .from("merchants")
      .select("id, location")
      .eq("id", merchantId)
      .maybeSingle();

    if (error || !data || !data.location) {
      return null;
    }

    const loc: any =
      typeof data.location === "string"
        ? JSON.parse(data.location)
        : data.location;

    if (
      loc &&
      typeof loc === "object" &&
      Array.isArray(loc.coordinates) &&
      loc.coordinates.length >= 2
    ) {
      const [lng, lat] = loc.coordinates;
      if (typeof lng === "number" && typeof lat === "number") {
        return { longitude: lng, latitude: lat };
      }
    }

    return null;
  }

  async getStudyArea(studyAreaId: string): Promise<{
    id: string;
    name: string;
    description: string | null;
    geometry: any;
  } | null> {
    const { data, error } = await this.supabase
      .from("study_areas")
      .select("id, name, description, geometry")
      .eq("id", studyAreaId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data;
  }
}
