import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/src/types/database.types";
import { AdServingRepository } from "../repositories/ad-serving.repository";
import { AdServingService } from "./ad-serving.service";
import { CampaignLifecycleService } from "../../lifecycle/services/campaign-lifecycle.service";
import { CampaignReadinessService } from "../../lifecycle/services/campaign-readiness.service";
import { AdvertisingEligibilityService } from "../../services/advertising-eligibility.service";
import { MerchantOwnershipService } from "@/src/features/merchant-ownership";
import {
  ServingBlockerCode,
  ServingChecklist,
  ServingPreviewResult,
  SponsoredPinDTO,
  SponsoredPinServingContext,
} from "../types/ad-serving.types";
import { servingContextSchema } from "../schemas/ad-serving.schema";
import {
  AdServingContextInvalidError,
} from "../errors/ad-serving.errors";
import { CampaignNotFoundError, CampaignNotOwnedError } from "../../lifecycle/errors/lifecycle.errors";

export class SponsoredPinServingService {
  private readonly repository: AdServingRepository;
  private readonly servingService: AdServingService;
  private readonly lifecycleService: CampaignLifecycleService;
  private readonly readinessService: CampaignReadinessService;
  private readonly eligibilityService: AdvertisingEligibilityService;

  constructor(private readonly supabase: SupabaseClient<Database>) {
    this.repository = new AdServingRepository(supabase);
    this.servingService = new AdServingService(supabase);
    this.lifecycleService = new CampaignLifecycleService(supabase);
    this.readinessService = new CampaignReadinessService(supabase);
    const ownershipService = new MerchantOwnershipService(supabase);
    this.eligibilityService = new AdvertisingEligibilityService(supabase, ownershipService);
  }

  /**
   * Owner-facing evaluation engine that analyzes exactly why a single campaign
   * is or is not servable at a given test context location.
   * Produces a detailed step-by-step checklist and blocker codes for merchant inspection.
   * Creates ZERO impression or analytics events.
   */
  async evaluateCampaignServing(
    merchantId: string,
    campaignId: string,
    rawContext: SponsoredPinServingContext,
    now: Date = new Date()
  ): Promise<ServingPreviewResult> {
    // 1. Validate context coordinates
    const validation = servingContextSchema.safeParse(rawContext);
    if (!validation.success) {
      const errorMsg =
        validation.error.issues[0]?.message ||
        "Koordinat konteks penayangan tidak valid.";
      throw new AdServingContextInvalidError(errorMsg);
    }
    const context = validation.data;

    // 2. Fetch campaign record with all associated details
    const record = await this.repository.getCampaignWithDetails(campaignId);
    if (!record || !record.campaign) {
      throw new CampaignNotFoundError("Campaign tidak ditemukan.");
    }

    if (record.campaign.merchant_id !== merchantId) {
      throw new CampaignNotOwnedError("Merchant tidak memiliki campaign ini.");
    }

    const { campaign, merchant, creative, target } = record;
    const blockers: ServingBlockerCode[] = [];
    const checks: ServingChecklist = {
      lifecycle: false,
      merchant: false,
      creative: false,
      targeting: false,
    };

    // 3.1. Evaluate Campaign Readiness and Effective Lifecycle Status
    const readiness = await this.readinessService.evaluateReadiness(
      merchantId,
      campaignId,
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

    if (effectiveStatus === "ACTIVE") {
      checks.lifecycle = true;
    } else {
      blockers.push("CAMPAIGN_NOT_ACTIVE");
    }

    // 3.2. Evaluate Merchant Eligibility and Coordinates
    let merchantCoords: { longitude: number; latitude: number } | null = null;

    if (merchant && merchant.publish_status !== "ARCHIVED") {
      const isMerchantEligible = await this.eligibilityService.verifyEligibility(merchantId);
      merchantCoords = this.servingService.parseCoordinates(merchant.location);

      if (isMerchantEligible && merchantCoords) {
        checks.merchant = true;
      } else if (!isMerchantEligible) {
        blockers.push("MERCHANT_NOT_ELIGIBLE");
      } else if (!merchantCoords) {
        blockers.push("MERCHANT_GEOMETRY_INVALID");
      }
    } else {
      blockers.push("MERCHANT_NOT_ELIGIBLE");
    }

    // 3.3. Evaluate Creative Asset
    if (!creative) {
      blockers.push("CREATIVE_NOT_FOUND");
    } else if (creative.creative_type !== "SPONSORED_PIN") {
      blockers.push("WRONG_CREATIVE_TYPE");
    } else if (creative.status !== "READY" || !creative.headline || creative.headline.trim() === "") {
      blockers.push("CREATIVE_NOT_READY");
    } else {
      checks.creative = true;
    }

    // 3.4. Evaluate Spatial Targeting
    if (!target) {
      blockers.push("TARGET_NOT_CONFIGURED");
    } else {
      const fallbackMerchant = merchantCoords || { longitude: 0, latitude: 0 };
      const isInside = await this.servingService.evaluateSpatialMatch(
        target,
        fallbackMerchant,
        context
      );

      if (isInside) {
        checks.targeting = true;
      } else {
        blockers.push("OUTSIDE_TARGET");
      }
    }

    const servable = blockers.length === 0;

    let placement: SponsoredPinDTO | null = null;
    if (servable && merchantCoords) {
      placement = this.servingService.mapToSponsoredPinDTO(
        record,
        merchantCoords.longitude,
        merchantCoords.latitude
      );
    }

    return {
      campaignId: campaign.id,
      merchantId: campaign.merchant_id,
      effectiveStatus,
      servable,
      checks,
      blockers,
      placement,
      evaluatedContext: context,
    };
  }
}
