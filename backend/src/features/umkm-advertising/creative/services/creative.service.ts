import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/src/types/database.types";
import { CreativeRepository } from "../repositories/creative.repository";
import { CreateCreativeInput, UpdateCreativeInput } from "../schemas/creative.schema";
import { CreativeDTO } from "../dto/creative.dto";
import { toCreativeDTO } from "../mappers/creative.mapper";
import { AdvertisingEligibilityService } from "../../services/advertising-eligibility.service";
import { MerchantOwnershipService } from "@/src/features/merchant-ownership";

export class CreativeService {
  private repository: CreativeRepository;
  private eligibilityService: AdvertisingEligibilityService;

  constructor(private supabase: SupabaseClient<Database>) {
    this.repository = new CreativeRepository(supabase);
    this.eligibilityService = new AdvertisingEligibilityService(
      supabase,
      new MerchantOwnershipService(supabase),
    );
  }

  private async verifyCampaignOwnershipAndStatus(merchantId: string, campaignId: string) {
    // 1. Verify eligibility (which also verifies ownership implicitly if merchantId belongs to user)
    const isEligible = await this.eligibilityService.verifyEligibility(merchantId);
    if (!isEligible) {
      throw new Error("Merchant is not eligible for advertising.");
    }

    // 2. Verify campaign exists and belongs to this merchant
    const { data: campaign, error: campaignError } = await this.supabase
      .from("ad_campaigns")
      .select("id, merchant_id, status")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error("Campaign tidak ditemukan.");
    }

    if (campaign.merchant_id !== merchantId) {
       throw new Error("Unauthorized access to campaign.");
    }

    if (campaign.status === "CANCELLED") {
      throw new Error("Tidak dapat mengubah creative pada campaign yang sudah dibatalkan.");
    }

    return campaign;
  }

  async createCreative(
    merchantId: string,
    campaignId: string,
    input: CreateCreativeInput
  ): Promise<CreativeDTO> {
    await this.verifyCampaignOwnershipAndStatus(merchantId, campaignId);

    const row = await this.repository.createCreative({
      campaign_id: campaignId,
      creative_type: input.creative_type,
      headline: input.headline,
      description: input.description,
      cta_type: input.cta_type,
      status: "DRAFT",
    });

    return toCreativeDTO(row);
  }

  async getCreativesByCampaign(merchantId: string, campaignId: string): Promise<CreativeDTO[]> {
    // Basic verification without checking if campaign is CANCELLED (read-only allowed)
    const { data: campaign, error: campaignError } = await this.supabase
      .from("ad_campaigns")
      .select("id, merchant_id")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign || campaign.merchant_id !== merchantId) {
      throw new Error("Unauthorized access to campaign.");
    }

    const isEligible = await this.eligibilityService.verifyEligibility(merchantId);
    if (!isEligible) {
       throw new Error("Merchant is not eligible for advertising.");
    }

    const rows = await this.repository.findByCampaignId(campaignId);
    return rows.map(toCreativeDTO);
  }

  async getCreativeById(merchantId: string, campaignId: string, creativeId: string): Promise<CreativeDTO> {
    const { data: campaign, error: campaignError } = await this.supabase
      .from("ad_campaigns")
      .select("id, merchant_id")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign || campaign.merchant_id !== merchantId) {
      throw new Error("Unauthorized access to campaign.");
    }

    const row = await this.repository.findById(creativeId);
    if (!row || row.campaign_id !== campaignId) {
      throw new Error("Creative tidak ditemukan.");
    }

    return toCreativeDTO(row);
  }

  async updateCreative(
    merchantId: string,
    campaignId: string,
    creativeId: string,
    input: UpdateCreativeInput
  ): Promise<CreativeDTO> {
    await this.verifyCampaignOwnershipAndStatus(merchantId, campaignId);

    const existing = await this.repository.findById(creativeId);
    if (!existing || existing.campaign_id !== campaignId) {
      throw new Error("Creative tidak ditemukan.");
    }

    const row = await this.repository.updateCreative(creativeId, {
      headline: input.headline,
      description: input.description,
      cta_type: input.cta_type,
    });

    return toCreativeDTO(row);
  }

  async markCreativeReady(
    merchantId: string,
    campaignId: string,
    creativeId: string
  ): Promise<CreativeDTO> {
    await this.verifyCampaignOwnershipAndStatus(merchantId, campaignId);

    const existing = await this.repository.findById(creativeId);
    if (!existing || existing.campaign_id !== campaignId) {
      throw new Error("Creative tidak ditemukan.");
    }

    // Phase 4 Validation before marking READY
    if (!existing.headline || existing.headline.trim() === "") {
        throw new Error("Headline wajib diisi sebelum status Ready.");
    }
    // Note: For SPONSORED_PIN, image is optional. If it's PROFILE_POSTER, we might enforce image_path here.

    const row = await this.repository.updateCreative(creativeId, {
      status: "READY"
    });

    return toCreativeDTO(row);
  }

  async deleteCreative(
    merchantId: string,
    campaignId: string,
    creativeId: string
  ): Promise<void> {
    await this.verifyCampaignOwnershipAndStatus(merchantId, campaignId);

    const existing = await this.repository.findById(creativeId);
    if (!existing || existing.campaign_id !== campaignId) {
      throw new Error("Creative tidak ditemukan.");
    }

    await this.repository.deleteCreative(creativeId);
  }
}
