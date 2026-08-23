import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/src/types/database.types";
import { CreativeRepository } from "../repositories/creative.repository";
import { AdvertisingEligibilityService } from "../../services/advertising-eligibility.service";
import { MerchantOwnershipService } from "@/src/features/merchant-ownership";

export class CreativeMediaService {
  private repository: CreativeRepository;
  private eligibilityService: AdvertisingEligibilityService;

  constructor(private supabase: SupabaseClient<Database>) {
    this.repository = new CreativeRepository(supabase);
    this.eligibilityService = new AdvertisingEligibilityService(
      supabase,
      new MerchantOwnershipService(supabase),
    );
  }

  async uploadCreativeImage(
    merchantId: string,
    campaignId: string,
    creativeId: string,
    fileData: Buffer | Blob,
    filename: string,
    mimeType: string
  ): Promise<string> {
    // 1. Verify eligibility & ownership
    const isEligible = await this.eligibilityService.verifyEligibility(merchantId);
    if (!isEligible) {
      throw new Error("Merchant is not eligible for advertising.");
    }

    const { data: campaign, error: campaignError } = await this.supabase
      .from("ad_campaigns")
      .select("id, merchant_id, status")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign || campaign.merchant_id !== merchantId) {
      throw new Error("Unauthorized access to campaign.");
    }

    if (campaign.status === "CANCELLED") {
       throw new Error("Cannot upload image to cancelled campaign.");
    }

    const existing = await this.repository.findById(creativeId);
    if (!existing || existing.campaign_id !== campaignId) {
       throw new Error("Creative tidak ditemukan.");
    }

    // 2. Upload to storage
    const bucket = "advertising-creatives";
    // Generate safe path: merchantId/campaignId/creativeId-timestamp-filename
    const timestamp = Date.now();
    // Sanitize filename
    const safeFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const path = `merchant/${merchantId}/campaign/${campaignId}/creative/${creativeId}/${timestamp}-${safeFilename}`;

    const { error: uploadError } = await this.supabase.storage
      .from(bucket)
      .upload(path, fileData, {
        contentType: mimeType,
        upsert: false
      });

    if (uploadError) {
      throw new Error("Gagal mengunggah gambar creative: " + uploadError.message);
    }

    // 3. Update database
    await this.repository.updateCreative(creativeId, {
      image_path: path
    });

    // 4. Return public URL
    const { data: publicUrlData } = this.supabase.storage.from(bucket).getPublicUrl(path);
    return publicUrlData.publicUrl;
  }
}
