import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/src/types/database.types";
import { ProfilePosterDTO } from "../types/profile-poster.types";

export class ProfilePosterServingService {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /**
   * Retrieves an eligible profile promotion poster for the given merchant ID.
   * Strictly enforces SAME-MERCHANT identity: A poster from Merchant A will NEVER
   * appear on Merchant B's profile.
   */
  async getProfilePosterForMerchant(
    merchantId: string,
    now: Date = new Date()
  ): Promise<ProfilePosterDTO | null> {
    try {
      if (!merchantId || merchantId.trim() === "") {
        return null;
      }

      // 1. Verify Merchant Existence and Eligibility
      const { data: merchant, error: merchError } = await this.supabase
        .from("merchants")
        .select("id, name, publish_status, verification_status, location")
        .eq("id", merchantId)
        .single();

      if (
        merchError ||
        !merchant ||
        merchant.publish_status === "ARCHIVED" ||
        merchant.publish_status === "HIDDEN" ||
        merchant.verification_status === "REJECTED"
      ) {
        return null;
      }

      // 2. Fetch campaigns owned by THIS specific merchant
      const { data: rawCampaigns, error: campError } = await (this.supabase as any)
        .from("ad_campaigns")
        .select("id, merchant_id, status, start_at, end_at, created_at")
        .eq("merchant_id", merchantId)
        .in("status", ["ACTIVE", "APPROVED"])
        .order("created_at", { ascending: false });

      if (campError || !rawCampaigns || rawCampaigns.length === 0) {
        return null;
      }

      for (const campaign of rawCampaigns) {
        // Enforce same-merchant identity assert
        if (campaign.merchant_id !== merchantId) {
          continue;
        }

        // 3. Evaluate Effective Schedule / Lifecycle Status
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

        // 4. Fetch and verify PROFILE_POSTER creative (must be READY)
        const { data: creative, error: crError } = await (this.supabase as any)
          .from("ad_creatives")
          .select("id, headline, description, image_path, cta_type, status")
          .eq("campaign_id", campaign.id)
          .eq("creative_type", "PROFILE_POSTER")
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

        // 5. Construct and return public ProfilePosterDTO
        return {
          placement_type: "PROFILE_POSTER",
          sponsored: true,
          label: "Sponsored",
          campaign_id: campaign.id,
          creative_id: creative.id,
          merchant_id: merchant.id,
          merchant_name: merchant.name,
          headline: creative.headline,
          description: creative.description,
          image_url: creative.image_path || null,
          cta_type: creative.cta_type as any,
          campaign_end_at: campaign.end_at,
        };
      }

      return null;
    } catch (err) {
      console.warn("[ProfilePosterServingService] Failed to evaluate profile poster:", err);
      return null;
    }
  }
}
