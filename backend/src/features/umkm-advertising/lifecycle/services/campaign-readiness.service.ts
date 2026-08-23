import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/src/types/database.types";
import { AdvertisingEligibilityService } from "../../services/advertising-eligibility.service";
import { MerchantOwnershipService } from "@/src/features/merchant-ownership";
import {
  CampaignReadinessBlocker,
  CampaignReadinessResult,
} from "../types/lifecycle.types";

export class CampaignReadinessService {
  private readonly eligibilityService: AdvertisingEligibilityService;

  constructor(private readonly supabase: SupabaseClient<Database>) {
    const ownershipService = new MerchantOwnershipService(supabase);
    this.eligibilityService = new AdvertisingEligibilityService(supabase, ownershipService);
  }

  async evaluateReadiness(
    merchantId: string,
    campaignId: string,
    campaignData?: {
      start_at: string | null;
      end_at: string | null;
      status: string;
    },
    now: Date = new Date()
  ): Promise<CampaignReadinessResult> {
    void now;

    const blockers: CampaignReadinessBlocker[] = [];

    // 1. Merchant Advertising Eligibility check
    const isMerchantEligible = await this.eligibilityService.verifyEligibility(merchantId);
    if (!isMerchantEligible) {
      blockers.push("MERCHANT_NOT_ELIGIBLE");
    }

    // 2. Creative Readiness check: At least one creative in READY status
    const { data: creatives } = await this.supabase
      .from("ad_creatives")
      .select("id, status")
      .eq("campaign_id", campaignId);

    const hasReadyCreative = (creatives || []).some((c) => c.status === "READY");
    if (!hasReadyCreative) {
      blockers.push("CREATIVE_NOT_READY");
    }

    // 3. Targeting Readiness check: Target row exists in ad_campaign_targets
    const { data: target } = await this.supabase
      .from("ad_campaign_targets")
      .select("id, target_type, radius_meters, study_area_id")
      .eq("campaign_id", campaignId)
      .maybeSingle();

    const isTargetingConfigured = Boolean(
      target &&
        ((target.target_type === "RADIUS" && Number(target.radius_meters) > 0) ||
          (target.target_type === "STUDY_AREA" && target.study_area_id))
    );

    if (!isTargetingConfigured) {
      blockers.push("TARGETING_NOT_CONFIGURED");
    }

    // 4. Schedule Validity check
    let isScheduleValid = false;
    let scheduleConfigured = false;

    let startAt: string | null = null;
    let endAt: string | null = null;

    if (campaignData) {
      startAt = campaignData.start_at;
      endAt = campaignData.end_at;
    } else {
      const { data: c } = await this.supabase
        .from("ad_campaigns")
        .select("start_at, end_at, status")
        .eq("id", campaignId)
        .maybeSingle();

      if (c) {
        startAt = c.start_at;
        endAt = c.end_at;
      }
    }

    if (!startAt || !endAt) {
      blockers.push("SCHEDULE_NOT_CONFIGURED");
    } else {
      scheduleConfigured = true;
      const startTime = new Date(startAt).getTime();
      const endTime = new Date(endAt).getTime();

      if (isNaN(startTime) || isNaN(endTime) || endTime <= startTime) {
        blockers.push("SCHEDULE_INVALID");
      } else {
        isScheduleValid = true;
      }
    }

    const ready =
      isMerchantEligible &&
      hasReadyCreative &&
      isTargetingConfigured &&
      isScheduleValid &&
      scheduleConfigured;

    return {
      ready,
      checks: {
        merchant: isMerchantEligible,
        creative: hasReadyCreative,
        targeting: isTargetingConfigured,
        schedule: isScheduleValid && scheduleConfigured,
      },
      blockers,
    };
  }
}
