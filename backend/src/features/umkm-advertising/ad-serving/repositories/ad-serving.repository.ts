import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/src/types/database.types";

export interface CandidateCampaignRecord {
  campaign: {
    id: string;
    merchant_id: string;
    name: string;
    description: string | null;
    status: string;
    start_at: string | null;
    end_at: string | null;
    updated_at: string;
  };
  merchant: {
    id: string;
    name: string;
    location: any;
    publish_status: string;
    verification_status: string;
    primary_category_id?: string | null;
  } | null;
  creative: {
    id: string;
    creative_type: string;
    headline: string;
    description: string | null;
    cta_type: string;
    status: string;
    image_path?: string | null;
  } | null;
  target: {
    id: string;
    target_type: string;
    radius_meters: number | null;
    center_geometry: any;
    study_area_id: string | null;
  } | null;
}

export class AdServingRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /**
   * Fetches candidate campaigns that are non-terminal and within/approaching active schedules.
   */
  async findPotentialServingCampaigns(): Promise<CandidateCampaignRecord[]> {
    // 1. Fetch campaigns with non-terminal status
    const { data: campaigns, error: campaignError } = await this.supabase
      .from("ad_campaigns")
      .select("id, merchant_id, name, description, status, start_at, end_at, updated_at")
      .not("status", "in", '("CANCELLED","ENDED")');

    if (campaignError || !campaigns || campaigns.length === 0) {
      return [];
    }

    const campaignIds = campaigns.map((c) => c.id);
    const merchantIds = Array.from(new Set(campaigns.map((c) => c.merchant_id)));

    // 2. Fetch merchants
    const { data: merchants } = await this.supabase
      .from("merchants")
      .select("id, name, location, publish_status, verification_status, primary_category_id")
      .in("id", merchantIds);

    const merchantMap = new Map<string, any>();
    (merchants || []).forEach((m: any) => merchantMap.set(m.id, m));

    // 3. Fetch SPONSORED_PIN creatives in READY status
    const { data: creatives } = await this.supabase
      .from("ad_creatives")
      .select("id, campaign_id, creative_type, headline, description, cta_type, status, image_path")
      .in("campaign_id", campaignIds)
      .eq("creative_type", "SPONSORED_PIN")
      .eq("status", "READY");

    const creativeMap = new Map<string, any>();
    (creatives || []).forEach((c) => {
      // Pick first ready SPONSORED_PIN creative per campaign
      if (!creativeMap.has(c.campaign_id)) {
        creativeMap.set(c.campaign_id, c);
      }
    });

    // 4. Fetch targets
    const { data: targets } = await this.supabase
      .from("ad_campaign_targets")
      .select("id, campaign_id, target_type, radius_meters, center_geometry, study_area_id")
      .in("campaign_id", campaignIds);

    const targetMap = new Map<string, any>();
    (targets || []).forEach((t) => targetMap.set(t.campaign_id, t));

    // 5. Combine records
    const results: CandidateCampaignRecord[] = [];
    for (const c of campaigns) {
      results.push({
        campaign: c,
        merchant: merchantMap.get(c.merchant_id) || null,
        creative: creativeMap.get(c.id) || null,
        target: targetMap.get(c.id) || null,
      });
    }

    return results;
  }

  /**
   * Fetches single campaign with details for owner serving preview.
   */
  async getCampaignWithDetails(campaignId: string): Promise<CandidateCampaignRecord | null> {
    const { data: campaign, error: campaignError } = await this.supabase
      .from("ad_campaigns")
      .select("id, merchant_id, name, description, status, start_at, end_at, updated_at")
      .eq("id", campaignId)
      .maybeSingle();

    if (campaignError || !campaign) {
      return null;
    }

    const { data: merchant } = await this.supabase
      .from("merchants")
      .select("id, name, location, publish_status, verification_status, primary_category_id")
      .eq("id", campaign.merchant_id)
      .maybeSingle();

    const { data: creatives } = await this.supabase
      .from("ad_creatives")
      .select("id, campaign_id, creative_type, headline, description, cta_type, status, image_path")
      .eq("campaign_id", campaignId)
      .eq("creative_type", "SPONSORED_PIN")
      .eq("status", "READY");

    const primaryCreative = creatives && creatives.length > 0 ? creatives[0] : null;

    const { data: target } = await this.supabase
      .from("ad_campaign_targets")
      .select("id, campaign_id, target_type, radius_meters, center_geometry, study_area_id")
      .eq("campaign_id", campaignId)
      .maybeSingle();

    return {
      campaign,
      merchant: (merchant as any) || null,
      creative: primaryCreative,
      target: target || null,
    };
  }

  /**
   * Check if a coordinate is inside a study area polygon.
   */
  async isPointInsideStudyArea(studyAreaId: string, lng: number, lat: number): Promise<boolean> {
    const { data: studyArea, error } = await this.supabase
      .from("study_areas")
      .select("id, geometry")
      .eq("id", studyAreaId)
      .maybeSingle();

    if (error || !studyArea || !studyArea.geometry) {
      return false;
    }

    const geom =
      typeof studyArea.geometry === "string"
        ? JSON.parse(studyArea.geometry)
        : studyArea.geometry;

    return this.pointInPolygonCheck(lng, lat, geom);
  }

  /**
   * Robust Point in Polygon (and MultiPolygon) containment check using Ray-Casting algorithm.
   */
  pointInPolygonCheck(lng: number, lat: number, geom: any): boolean {
    if (!geom || !geom.coordinates) return false;

    if (geom.type === "Polygon") {
      return this.isPointInSinglePolygon(lng, lat, geom.coordinates);
    } else if (geom.type === "MultiPolygon") {
      for (const polyCoords of geom.coordinates) {
        if (this.isPointInSinglePolygon(lng, lat, polyCoords)) {
          return true;
        }
      }
    }
    return false;
  }

  private isPointInSinglePolygon(lng: number, lat: number, rings: number[][][]): boolean {
    if (!rings || rings.length === 0) return false;

    // Check exterior ring
    const exterior = rings[0];
    let inside = false;

    for (let i = 0, j = exterior.length - 1; i < exterior.length; j = i++) {
      const xi = exterior[i][0], yi = exterior[i][1];
      const xj = exterior[j][0], yj = exterior[j][1];

      const intersect =
        yi > lat !== yj > lat &&
        lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

      if (intersect) inside = !inside;
    }

    if (!inside) return false;

    // Check interior rings (holes)
    for (let h = 1; h < rings.length; h++) {
      const hole = rings[h];
      let inHole = false;
      for (let i = 0, j = hole.length - 1; i < hole.length; j = i++) {
        const xi = hole[i][0], yi = hole[i][1];
        const xj = hole[j][0], yj = hole[j][1];

        const intersect =
          yi > lat !== yj > lat &&
          lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

        if (intersect) inHole = !inHole;
      }
      if (inHole) return false; // Inside a hole -> outside polygon
    }

    return true;
  }

  /**
   * Calculates geodesic distance in meters between two WGS84 points (Haversine formula).
   */
  calculateDistanceMeters(lng1: number, lat1: number, lng2: number, lat2: number): number {
    const R = 6371000; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
