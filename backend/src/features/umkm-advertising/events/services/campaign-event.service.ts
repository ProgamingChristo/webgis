import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/src/types/database.types";
import {
  RecordCampaignEventInput,
  RecordEventResult,
} from "../types/campaign-event.types";
import { ALLOWED_EVENT_PLACEMENT_MAP } from "../constants/campaign-event.constants";
import { CampaignEventRepository } from "../repositories/campaign-event.repository";
import { ApplicationError } from "@/src/lib/errors";

export class CampaignEventService {
  private readonly repository: CampaignEventRepository;

  constructor(private readonly supabase: SupabaseClient<Database>) {
    this.repository = new CampaignEventRepository(supabase);
  }

  /**
   * Records a validated campaign interaction event.
   * Enforces campaign existence, merchant ownership derivation, creative belonging,
   * placement compatibility, and database-level idempotency.
   */
  async recordEvent(input: RecordCampaignEventInput): Promise<RecordEventResult> {
    const {
      event_type,
      campaign_id,
      creative_id,
      placement,
      session_key,
      context = {},
    } = input;

    // 1. Validate Event Type & Placement Compatibility
    const allowedPlacements = ALLOWED_EVENT_PLACEMENT_MAP[event_type];
    if (!allowedPlacements || !allowedPlacements.includes(placement)) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        `Tipe event '${event_type}' tidak kompatibel dengan placement '${placement}'.`
      );
    }

    // 2. Fetch and verify Campaign existence & derive merchant_id
    const { data: campaign, error: campError } = await (this.supabase as any)
      .from("ad_campaigns")
      .select("id, merchant_id, status")
      .eq("id", campaign_id)
      .single();

    if (campError || !campaign) {
      throw new ApplicationError(
        "NOT_FOUND",
        "Campaign yang direferensikan tidak ditemukan."
      );
    }

    // 3. Verify Creative (if provided)
    if (creative_id) {
      const { data: creative, error: crError } = await (this.supabase as any)
        .from("ad_creatives")
        .select("id, campaign_id, creative_type, status")
        .eq("id", creative_id)
        .single();

      if (crError || !creative) {
        throw new ApplicationError(
          "NOT_FOUND",
          "Creative yang direferensikan tidak ditemukan."
        );
      }

      if (creative.campaign_id !== campaign_id) {
        throw new ApplicationError(
          "VALIDATION_ERROR",
          "Creative tidak terdaftar pada campaign ini."
        );
      }

      if (creative.creative_type !== placement) {
        throw new ApplicationError(
          "VALIDATION_ERROR",
          `Creative type '${creative.creative_type}' tidak cocok dengan placement '${placement}'.`
        );
      }
    }

    // 4. Construct Deterministic Dedup Key
    const dedupKey =
      input.dedup_key ||
      `${event_type}:${campaign_id}:${creative_id || "none"}:${placement}:${session_key}`;

    // 5. Idempotent Insertion into Database
    return this.repository.insertEventIdempotent({
      campaign_id,
      merchant_id: campaign.merchant_id,
      creative_id: creative_id || null,
      event_type,
      placement,
      session_key,
      dedup_key: dedupKey,
      context,
    });
  }
}
