import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/src/types/database.types";
import { AdServingRepository, CandidateCampaignRecord } from "../repositories/ad-serving.repository";
import { CampaignLifecycleService } from "../../lifecycle/services/campaign-lifecycle.service";
import { CampaignReadinessService } from "../../lifecycle/services/campaign-readiness.service";
import { AdvertisingEligibilityService } from "../../services/advertising-eligibility.service";
import { MerchantOwnershipService } from "@/src/features/merchant-ownership";
import { CtaType } from "../../creative/types/creative.types";
import {
  QueryCandidatesOptions,
  SponsoredPinDTO,
  SponsoredPinServingContext,
} from "../types/ad-serving.types";
import {
  CANONICAL_PLACEMENT_TYPE,
  CANONICAL_SPONSORED_LABEL,
  DEFAULT_SERVING_LIMIT,
  MAX_SERVING_LIMIT,
} from "../constants/ad-serving.constants";
import { servingContextSchema } from "../schemas/ad-serving.schema";
import { AdServingContextInvalidError } from "../errors/ad-serving.errors";

export class AdServingService {
  private readonly repository: AdServingRepository;
  private readonly lifecycleService: CampaignLifecycleService;
  private readonly readinessService: CampaignReadinessService;
  private readonly eligibilityService: AdvertisingEligibilityService;

  constructor(private readonly supabase: SupabaseClient<Database>) {
    this.repository = new AdServingRepository(supabase);
    this.lifecycleService = new CampaignLifecycleService(supabase);
    this.readinessService = new CampaignReadinessService(supabase);
    const ownershipService = new MerchantOwnershipService(supabase);
    this.eligibilityService = new AdvertisingEligibilityService(supabase, ownershipService);
  }

  /**
   * Authoritative candidate selection engine for Sponsored Pins at a given spatial context.
   * Evaluates effective lifecycle, merchant eligibility, creative readiness, spatial target matching,
   * deduplicates by merchant, and produces a safe public SponsoredPinDTO array.
   */
  async getSponsoredPinCandidates(options: QueryCandidatesOptions): Promise<SponsoredPinDTO[]> {
    const { context, limit = DEFAULT_SERVING_LIMIT, now = new Date() } = options;

    // 1. Validate context coordinates
    const validation = servingContextSchema.safeParse(context);
    if (!validation.success) {
      const errorMsg =
        validation.error.issues[0]?.message ||
        "Koordinat konteks penayangan tidak valid.";
      throw new AdServingContextInvalidError(errorMsg);
    }

    const clampedLimit = Math.min(Math.max(1, limit), MAX_SERVING_LIMIT);

    // 2. Fetch candidate campaign records from database
    const rawCandidates = await this.repository.findPotentialServingCampaigns();
    if (rawCandidates.length === 0) {
      return [];
    }

    const eligibleCandidates: Array<{
      record: CandidateCampaignRecord;
      merchantLng: number;
      merchantLat: number;
    }> = [];

    // 3. Evaluate each candidate against serving rules
    for (const item of rawCandidates) {
      const { campaign, merchant, creative, target } = item;

      // 3.1. Evaluate Campaign Readiness & Effective Lifecycle Status
      const readiness = await this.readinessService.evaluateReadiness(
        campaign.merchant_id,
        campaign.id,
        {
          start_at: campaign.start_at,
          end_at: campaign.end_at,
          status: campaign.status,
        },
        now
      );

      const effectiveStatus = this.lifecycleService.getEffectiveCampaignStatus(
        campaign.status,
        readiness,
        campaign.start_at,
        campaign.end_at,
        now
      );

      // Must strictly be ACTIVE
      if (effectiveStatus !== "ACTIVE") {
        continue;
      }

      // 3.2. Merchant Eligibility check
      if (!merchant || merchant.publish_status === "ARCHIVED") {
        continue;
      }

      const isMerchantEligible = await this.eligibilityService.verifyEligibility(merchant.id);
      if (!isMerchantEligible) {
        continue;
      }

      // Extract merchant coordinates
      const merchantCoords = this.parseCoordinates(merchant.location);
      if (!merchantCoords) {
        continue;
      }

      // 3.3. Creative checks: Must be SPONSORED_PIN, READY, valid headline, valid CTA
      if (!creative || creative.creative_type !== "SPONSORED_PIN" || creative.status !== "READY") {
        continue;
      }

      if (!creative.headline || creative.headline.trim() === "") {
        continue;
      }

      const ctaType = creative.cta_type as CtaType;
      if (ctaType !== "VIEW_PROFILE" && ctaType !== "REQUEST_ROUTE") {
        continue;
      }

      // 3.4. Target Spatial Matching (Authoritative)
      if (!target) {
        continue;
      }

      const isInside = await this.evaluateSpatialMatch(target, merchantCoords, context);
      if (!isInside) {
        continue;
      }

      eligibleCandidates.push({
        record: item,
        merchantLng: merchantCoords.longitude,
        merchantLat: merchantCoords.latitude,
      });
    }

    // 4. Deduplicate: At most one sponsored pin per merchant (Tie-break: most recently updated campaign)
    const merchantMap = new Map<string, {
      record: CandidateCampaignRecord;
      merchantLng: number;
      merchantLat: number;
    }>();

    for (const item of eligibleCandidates) {
      const merchantId = item.record.campaign.merchant_id;
      const existing = merchantMap.get(merchantId);

      if (!existing) {
        merchantMap.set(merchantId, item);
      } else {
        const existingUpdated = new Date(existing.record.campaign.updated_at).getTime();
        const currentUpdated = new Date(item.record.campaign.updated_at).getTime();
        if (currentUpdated > existingUpdated) {
          merchantMap.set(merchantId, item);
        }
      }
    }

    const deduplicated = Array.from(merchantMap.values());

    // 5. Stable technical ordering (newest updated first) and clamp limit
    deduplicated.sort((a, b) => {
      const timeA = new Date(a.record.campaign.updated_at).getTime();
      const timeB = new Date(b.record.campaign.updated_at).getTime();
      return timeB - timeA;
    });

    const finalCandidates = deduplicated.slice(0, clampedLimit);

    // 6. Map to safe public SponsoredPinDTO
    return finalCandidates.map((item) =>
      this.mapToSponsoredPinDTO(
        item.record,
        item.merchantLng,
        item.merchantLat
      )
    );
  }

  /**
   * Helper to parse GeoJSON Point / location object into { longitude, latitude }
   */
  parseCoordinates(location: any): { longitude: number; latitude: number } | null {
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
        Number.isFinite(lat) &&
        lng >= -180 &&
        lng <= 180 &&
        lat >= -90 &&
        lat <= 90
      ) {
        return { longitude: lng, latitude: lat };
      }
    }

    return null;
  }

  /**
   * Authoritative spatial matching for a target configuration against a context point.
   */
  async evaluateSpatialMatch(
    target: {
      target_type: string;
      radius_meters: number | null;
      center_geometry: any;
      study_area_id: string | null;
    },
    merchantCoords: { longitude: number; latitude: number },
    context: SponsoredPinServingContext
  ): Promise<boolean> {
    if (target.target_type === "RADIUS") {
      const radiusMeters = Number(target.radius_meters) || 0;
      if (radiusMeters <= 0) return false;

      // Extract target center or fallback to merchant coordinates
      const centerCoords = this.parseCoordinates(target.center_geometry) || merchantCoords;

      const distance = this.repository.calculateDistanceMeters(
        context.longitude,
        context.latitude,
        centerCoords.longitude,
        centerCoords.latitude
      );

      return distance <= radiusMeters;
    }

    if (target.target_type === "STUDY_AREA" && target.study_area_id) {
      return this.repository.isPointInsideStudyArea(
        target.study_area_id,
        context.longitude,
        context.latitude
      );
    }

    return false;
  }

  /**
   * Maps an internal database campaign record to a safe, public-facing SponsoredPinDTO.
   * Strips all internal identifiers, financial data, and owner information.
   */
  mapToSponsoredPinDTO(
    record: CandidateCampaignRecord,
    merchantLng: number,
    merchantLat: number
  ): SponsoredPinDTO {
    const { campaign, merchant, creative } = record;

    return {
      placement_type: CANONICAL_PLACEMENT_TYPE,
      sponsored: true,
      label: CANONICAL_SPONSORED_LABEL,
      campaign_id: campaign.id,
      creative_id: creative?.id || "",
      merchant_id: merchant?.id || campaign.merchant_id,
      merchant_name: merchant?.name || "UMKM Mitra",
      merchant_category: (merchant as any)?.category || merchant?.primary_category_id || "UMKM",
      geometry: {
        type: "Point",
        coordinates: [merchantLng, merchantLat],
      },
      headline: creative?.headline || campaign.name,
      description: creative?.description || campaign.description || null,
      cta_type: (creative?.cta_type as CtaType) || "VIEW_PROFILE",
      image_url: creative?.image_path || null,
    };
  }
}
