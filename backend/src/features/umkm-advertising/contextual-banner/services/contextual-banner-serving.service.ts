import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/src/types/database.types";
import {
  ContextualBannerDTO,
  ContextualBannerServingContext,
} from "../types/contextual-banner.types";
import {
  AVERAGE_WALKING_SPEED_METERS_PER_MINUTE,
  DEFAULT_BANNER_RADIUS_METERS,
} from "../constants/contextual-banner.constants";

export class ContextualBannerServingService {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /**
   * Retrieves an eligible contextual promotional banner matching the given search and spatial context.
   * Enforces lifecycle ACTIVE, merchant eligibility, READY CONTEXTUAL_BANNER creative,
   * spatial targeting, and canonical search relevance hard constraints.
   */
  async getEligibleBanner(
    context: ContextualBannerServingContext,
    now: Date = new Date()
  ): Promise<ContextualBannerDTO | null> {
    try {
      // 1. Fetch campaigns that could be active
      const { data: rawCampaigns, error: campError } = await (this.supabase as any)
        .from("ad_campaigns")
        .select("id, merchant_id, status, start_at, end_at, created_at")
        .in("status", ["ACTIVE", "APPROVED"])
        .order("created_at", { ascending: false });

      if (campError || !rawCampaigns || rawCampaigns.length === 0) {
        return null;
      }

      for (const campaign of rawCampaigns) {
        // 2. Evaluate Effective Schedule / Lifecycle Status
        if (campaign.status !== "ACTIVE" && campaign.status !== "APPROVED") {
          continue;
        }

        const currentTime = now.getTime();
        if (campaign.start_at) {
          const startTime = new Date(campaign.start_at).getTime();
          if (!isNaN(startTime) && currentTime < startTime) {
            continue; // SCHEDULED / not yet started
          }
        }

        if (campaign.end_at) {
          const endTime = new Date(campaign.end_at).getTime();
          if (!isNaN(endTime) && currentTime >= endTime) {
            continue; // ENDED
          }
        }

        // 3. Evaluate Merchant Eligibility & Canonical Metadata
        const { data: merchant, error: merchError } = await this.supabase
          .from("merchants")
          .select("id, name, primary_category_id, publish_status, verification_status, location")
          .eq("id", campaign.merchant_id)
          .single();

        if (
          merchError ||
          !merchant ||
          merchant.publish_status === "ARCHIVED" ||
          merchant.publish_status === "HIDDEN" ||
          merchant.verification_status === "REJECTED"
        ) {
          continue;
        }

        const merchantCoords = this.parseCoordinates(merchant.location);
        if (!merchantCoords) {
          continue;
        }

        // 4. Fetch and verify CONTEXTUAL_BANNER Creative (must be READY)
        const { data: creative, error: crError } = await (this.supabase as any)
          .from("ad_creatives")
          .select("id, headline, description, image_path, cta_type, status")
          .eq("campaign_id", campaign.id)
          .eq("creative_type", "CONTEXTUAL_BANNER")
          .single();

        if (
          crError ||
          !creative ||
          creative.status !== "READY" ||
          !creative.headline ||
          creative.headline.trim() === ""
        ) {
          continue;
        }

        // 5. Evaluate Spatial Targeting
        const { data: target } = await (this.supabase as any)
          .from("ad_campaign_targets")
          .select("target_type, center_geometry, center_location, radius_meters, study_area_id")
          .eq("campaign_id", campaign.id)
          .single();

        if (target) {
          const targetCoords =
            this.parseCoordinates(target.center_geometry || target.center_location) ||
            merchantCoords;
          const distToTarget = this.calculateDistanceMeters(
            context.longitude,
            context.latitude,
            targetCoords.longitude,
            targetCoords.latitude
          );

          const allowedRadius = target.radius_meters || DEFAULT_BANNER_RADIUS_METERS;
          if (distToTarget > allowedRadius) {
            continue;
          }
        } else {
          // Fallback: Check proximity to merchant
          const distToMerchant = this.calculateDistanceMeters(
            context.longitude,
            context.latitude,
            merchantCoords.longitude,
            merchantCoords.latitude
          );
          if (distToMerchant > DEFAULT_BANNER_RADIUS_METERS) {
            continue;
          }
        }

        const merchantCategory = merchant.primary_category_id || "UMKM";

        // 6. Hard-Constraint: Category Relevance
        if (context.category && context.category.trim() !== "" && context.category.toLowerCase() !== "semua") {
          const normCat = context.category.toLowerCase();
          const candCat = merchantCategory.toLowerCase();
          const candHeadline = (creative.headline || "").toLowerCase();
          const candDesc = (creative.description || "").toLowerCase();

          const matchesCategory =
            candCat.includes(normCat) ||
            candHeadline.includes(normCat) ||
            candDesc.includes(normCat) ||
            this.matchCategorySynonyms(normCat, candCat);

          if (!matchesCategory) {
            continue;
          }
        }

        // 7. Hard-Constraint: Text Query Matching
        if (context.query && context.query.trim() !== "") {
          const normQ = context.query.toLowerCase();
          const nameMatch = (merchant.name || "").toLowerCase().includes(normQ);
          const headlineMatch = (creative.headline || "").toLowerCase().includes(normQ);
          const descMatch = (creative.description || "").toLowerCase().includes(normQ);
          const catMatch = merchantCategory.toLowerCase().includes(normQ);

          if (!nameMatch && !headlineMatch && !descMatch && !catMatch) {
            continue;
          }
        }

        // 8. Hard-Constraint: Walking Distance Threshold
        if (context.maxWalkingMinutes && context.maxWalkingMinutes > 0) {
          const distToMerchant = this.calculateDistanceMeters(
            context.longitude,
            context.latitude,
            merchantCoords.longitude,
            merchantCoords.latitude
          );
          const walkingMin = Math.round(distToMerchant / AVERAGE_WALKING_SPEED_METERS_PER_MINUTE);

          if (walkingMin > context.maxWalkingMinutes) {
            continue;
          }
        }

        // 9. Construct and return public ContextualBannerDTO
        return {
          placement_type: "CONTEXTUAL_BANNER",
          sponsored: true,
          label: "Sponsored",
          campaign_id: campaign.id,
          creative_id: creative.id,
          merchant_id: merchant.id,
          merchant_name: merchant.name,
          merchant_category: merchantCategory,
          headline: creative.headline,
          description: creative.description,
          image_url: creative.image_path || null,
          cta_type: creative.cta_type as any,
        };
      }

      return null;
    } catch (err) {
      console.warn("[ContextualBannerServingService] Failed to evaluate banner placement:", err);
      return null;
    }
  }

  private matchCategorySynonyms(queryCat: string, merchantCat: string): boolean {
    const synonyms: Record<string, string[]> = {
      makanan: ["food", "kuliner", "resto", "restaurant", "warung", "cafe", "cafe_resto", "fnb", "food_beverage"],
      minuman: ["beverage", "kopi", "coffee", "cafe", "fnb", "food_beverage"],
      kopi: ["coffee", "cafe", "kafe", "minuman", "fnb"],
      retail: ["toko", "kelontong", "shop", "mart"],
      fashion: ["pakaian", "baju", "distro", "boutique", "apparel"],
    };

    const targetSynonyms = synonyms[queryCat] || [];
    return targetSynonyms.some((syn) => merchantCat.includes(syn));
  }

  private parseCoordinates(location: any): { longitude: number; latitude: number } | null {
    if (!location) return null;
    const loc = typeof location === "string" ? JSON.parse(location) : location;

    if (
      loc &&
      typeof loc === "object" &&
      Array.isArray(loc.coordinates) &&
      loc.coordinates.length >= 2
    ) {
      const [lng, lat] = loc.coordinates;
      if (
        typeof lng === "number" &&
        typeof lat === "number" &&
        Number.isFinite(lng) &&
        Number.isFinite(lat)
      ) {
        return { longitude: lng, latitude: lat };
      }
    }

    return null;
  }

  private calculateDistanceMeters(lng1: number, lat1: number, lng2: number, lat2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }
}
