import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/src/types/database.types";
import { updateScheduleSchema } from "../schemas/lifecycle.schema";
import { CampaignLifecycleService } from "./campaign-lifecycle.service";
import { CampaignReadinessService } from "./campaign-readiness.service";
import { CampaignLifecycleDTO, UpdateScheduleInput } from "../types/lifecycle.types";
import {
  CampaignNotEditableError,
  CampaignNotFoundError,
  CampaignNotOwnedError,
  ScheduleInvalidError,
} from "../errors/lifecycle.errors";

export class CampaignScheduleService {
  private readonly lifecycleService: CampaignLifecycleService;
  private readonly readinessService: CampaignReadinessService;

  constructor(private readonly supabase: SupabaseClient<Database>) {
    this.lifecycleService = new CampaignLifecycleService(supabase);
    this.readinessService = new CampaignReadinessService(supabase);
  }

  async updateSchedule(
    merchantId: string,
    campaignId: string,
    rawInput: UpdateScheduleInput,
    now: Date = new Date()
  ): Promise<CampaignLifecycleDTO> {
    // 1. Validate schedule input schema
    const parseResult = updateScheduleSchema.safeParse(rawInput);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || "Jadwal campaign tidak valid.";
      throw new ScheduleInvalidError(firstError);
    }

    const { start_at, end_at } = parseResult.data;
    const endTime = new Date(end_at).getTime();
    const currentTime = now.getTime();

    // 2. Reject schedule ending in the past
    if (endTime <= currentTime) {
      throw new ScheduleInvalidError(
        "Waktu selesai (end_at) tidak boleh berada di masa lampau."
      );
    }

    // 3. Fetch current campaign
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

    // 4. Verify editability: ACTIVE campaigns must be paused first before editing schedule
    if (campaign.status === "ACTIVE") {
      throw new CampaignNotEditableError(
        "Campaign sedang aktif. Silakan pause campaign terlebih dahulu untuk mengubah jadwal."
      );
    }

    if (campaign.status === "CANCELLED" || campaign.status === "ENDED") {
      throw new CampaignNotEditableError(
        `Jadwal tidak dapat diubah karena campaign sudah ${campaign.status}.`
      );
    }

    // 5. Evaluate next readiness with the new schedule
    const readiness = await this.readinessService.evaluateReadiness(
      merchantId,
      campaignId,
      {
        start_at,
        end_at,
        status: campaign.status,
      },
      now
    );

    // 6. Determine next lifecycle status
    let nextStatus = campaign.status;
    if (campaign.status === "PAUSED") {
      nextStatus = "PAUSED";
    } else {
      nextStatus = this.lifecycleService.getEffectiveCampaignStatus(
        campaign.status,
        readiness,
        start_at,
        end_at,
        now
      );
    }

    // 7. Persist updated schedule and status
    const { error: updateError } = await this.supabase
      .from("ad_campaigns")
      .update({
        start_at,
        end_at,
        status: nextStatus,
      })
      .eq("id", campaignId);

    if (updateError) {
      throw new Error(`Gagal menyimpan jadwal campaign: ${updateError.message}`);
    }

    return this.lifecycleService.getLifecycleState(merchantId, campaignId, now);
  }
}
