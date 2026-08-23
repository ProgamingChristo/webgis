import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/src/types/database.types";
import { CampaignReadinessService } from "./campaign-readiness.service";
import {
  CampaignAllowedActions,
  CampaignLifecycleDTO,
  CampaignLifecycleStatus,
  CampaignReadinessResult,
} from "../types/lifecycle.types";
import {
  CampaignNotFoundError,
  CampaignNotOwnedError,
  CampaignNotPausableError,
  CampaignNotResumableError,
  CampaignTerminalError,
} from "../errors/lifecycle.errors";

export class CampaignLifecycleService {
  private readonly readinessService: CampaignReadinessService;

  constructor(private readonly supabase: SupabaseClient<Database>) {
    this.readinessService = new CampaignReadinessService(supabase);
  }

  /**
   * Deterministically calculates the effective lifecycle status of a campaign
   * based on its persisted status, readiness evaluation, schedule boundaries, and injected reference time.
   * Schedule interval is strictly half-open: [start_at, end_at)
   */
  getEffectiveCampaignStatus(
    persistedStatus: string,
    readiness: CampaignReadinessResult,
    startAt: string | null,
    endAt: string | null,
    now: Date = new Date()
  ): CampaignLifecycleStatus {
    if (persistedStatus === "CANCELLED") {
      return "CANCELLED";
    }

    if (persistedStatus === "ENDED") {
      return "ENDED";
    }

    const currentTime = now.getTime();

    // Check if campaign has reached end_at
    if (endAt) {
      const endTime = new Date(endAt).getTime();
      if (!isNaN(endTime) && currentTime >= endTime) {
        return "ENDED";
      }
    }

    if (persistedStatus === "PAUSED") {
      return "PAUSED";
    }

    if (!readiness.ready) {
      return "DRAFT";
    }

    if (startAt && endAt) {
      const startTime = new Date(startAt).getTime();
      const endTime = new Date(endAt).getTime();

      if (!isNaN(startTime) && !isNaN(endTime)) {
        if (currentTime < startTime) {
          return "SCHEDULED";
        }
        if (currentTime >= startTime && currentTime < endTime) {
          return "ACTIVE";
        }
      }
    }

    return "READY";
  }

  calculateAllowedActions(
    effectiveStatus: CampaignLifecycleStatus
  ): CampaignAllowedActions {
    return {
      canEditSchedule:
        effectiveStatus === "DRAFT" ||
        effectiveStatus === "READY" ||
        effectiveStatus === "SCHEDULED" ||
        effectiveStatus === "PAUSED",
      canPause:
        effectiveStatus === "SCHEDULED" || effectiveStatus === "ACTIVE",
      canResume: effectiveStatus === "PAUSED",
      canCancel:
        effectiveStatus !== "CANCELLED" && effectiveStatus !== "ENDED",
    };
  }

  async getLifecycleState(
    merchantId: string,
    campaignId: string,
    now: Date = new Date()
  ): Promise<CampaignLifecycleDTO> {
    const { data: campaign, error } = await this.supabase
      .from("ad_campaigns")
      .select("id, merchant_id, name, status, start_at, end_at")
      .eq("id", campaignId)
      .maybeSingle();

    if (error || !campaign) {
      throw new CampaignNotFoundError("Campaign tidak ditemukan.");
    }

    if (campaign.merchant_id !== merchantId) {
      throw new CampaignNotOwnedError("Merchant tidak memiliki campaign ini.");
    }

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

    const effectiveStatus = this.getEffectiveCampaignStatus(
      campaign.status,
      readiness,
      campaign.start_at,
      campaign.end_at,
      now
    );

    // Auto-reconcile persisted status in database if effectiveStatus changed naturally (e.g. SCHEDULED -> ACTIVE or ACTIVE -> ENDED)
    if (
      effectiveStatus !== campaign.status &&
      campaign.status !== "CANCELLED" &&
      campaign.status !== "PAUSED"
    ) {
      await this.supabase
        .from("ad_campaigns")
        .update({ status: effectiveStatus })
        .eq("id", campaignId);
    }

    const allowedActions = this.calculateAllowedActions(effectiveStatus);

    return {
      campaignId: campaign.id,
      merchantId: campaign.merchant_id,
      name: campaign.name,
      status: campaign.status as CampaignLifecycleStatus,
      effectiveStatus,
      startAt: campaign.start_at,
      endAt: campaign.end_at,
      readiness,
      allowedActions,
    };
  }

  async pauseCampaign(
    merchantId: string,
    campaignId: string,
    now: Date = new Date()
  ): Promise<CampaignLifecycleDTO> {
    const current = await this.getLifecycleState(merchantId, campaignId, now);

    if (!current.allowedActions.canPause) {
      throw new CampaignNotPausableError(
        `Campaign dengan status ${current.effectiveStatus} tidak dapat di-pause.`
      );
    }

    const { error: updateError } = await this.supabase
      .from("ad_campaigns")
      .update({ status: "PAUSED" })
      .eq("id", campaignId);

    if (updateError) {
      throw new Error(`Gagal pause campaign: ${updateError.message}`);
    }

    return this.getLifecycleState(merchantId, campaignId, now);
  }

  async resumeCampaign(
    merchantId: string,
    campaignId: string,
    now: Date = new Date()
  ): Promise<CampaignLifecycleDTO> {
    const current = await this.getLifecycleState(merchantId, campaignId, now);

    if (!current.allowedActions.canResume) {
      throw new CampaignNotResumableError(
        `Campaign dengan status ${current.effectiveStatus} tidak dapat di-resume.`
      );
    }

    const nextStatus = this.getEffectiveCampaignStatus(
      "READY",
      current.readiness,
      current.startAt,
      current.endAt,
      now
    );

    const { error: updateError } = await this.supabase
      .from("ad_campaigns")
      .update({ status: nextStatus })
      .eq("id", campaignId);

    if (updateError) {
      throw new Error(`Gagal resume campaign: ${updateError.message}`);
    }

    return this.getLifecycleState(merchantId, campaignId, now);
  }

  async cancelCampaign(
    merchantId: string,
    campaignId: string,
    now: Date = new Date()
  ): Promise<CampaignLifecycleDTO> {
    const current = await this.getLifecycleState(merchantId, campaignId, now);

    if (!current.allowedActions.canCancel) {
      throw new CampaignTerminalError(
        `Campaign dengan status ${current.effectiveStatus} sudah terminal dan tidak dapat dibatalkan.`
      );
    }

    const { error: updateError } = await this.supabase
      .from("ad_campaigns")
      .update({ status: "CANCELLED" })
      .eq("id", campaignId);

    if (updateError) {
      throw new Error(`Gagal membatalkan campaign: ${updateError.message}`);
    }

    return this.getLifecycleState(merchantId, campaignId, now);
  }
}
