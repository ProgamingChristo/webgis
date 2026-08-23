import { CampaignRepository } from "../repositories/campaign.repository";
import { AdvertisingEligibilityService } from "./advertising-eligibility.service";
import { mapCampaignToDto } from "../mappers/campaign.mapper";
import { CreateCampaignInput, UpdateCampaignInput } from "../types/campaign.types";

export class CampaignService {
  constructor(
    private readonly repository: CampaignRepository,
    private readonly eligibilityService: AdvertisingEligibilityService
  ) {}

  async createCampaign(userId: string, input: CreateCampaignInput) {
    const eligibility = await this.eligibilityService.checkEligibility(userId, input.merchantId);
    
    if (!eligibility.eligible) {
      throw new Error(`User not eligible to advertise for this merchant: ${eligibility.reason}`);
    }

    const row = await this.repository.createCampaign(userId, input);
    return mapCampaignToDto(row);
  }

  async getCampaigns(userId: string, merchantId: string) {
    // 1. Verify eligibility (this guarantees ownership natively, thus acting as authorization)
    const eligibility = await this.eligibilityService.checkEligibility(userId, merchantId);
    if (!eligibility.eligible) {
      throw new Error(`Unauthorized access to campaigns: ${eligibility.reason}`);
    }

    const rows = await this.repository.getCampaigns(merchantId);
    return rows.map(mapCampaignToDto);
  }

  async getCampaignById(userId: string, campaignId: string) {
    const row = await this.repository.getCampaignById(campaignId);
    
    // Authorization: User must be eligible to manage this campaign's merchant
    const eligibility = await this.eligibilityService.checkEligibility(userId, row.merchant_id);
    if (!eligibility.eligible) {
      throw new Error(`Unauthorized access to campaign: ${eligibility.reason}`);
    }

    return mapCampaignToDto(row);
  }

  async updateCampaign(userId: string, campaignId: string, input: UpdateCampaignInput) {
    const row = await this.repository.getCampaignById(campaignId);
    
    const eligibility = await this.eligibilityService.checkEligibility(userId, row.merchant_id);
    if (!eligibility.eligible) {
      throw new Error(`Unauthorized update to campaign: ${eligibility.reason}`);
    }

    if (row.status !== "DRAFT") {
      throw new Error("Only DRAFT campaigns can be modified directly.");
    }

    const updatedRow = await this.repository.updateCampaign(campaignId, input);
    return mapCampaignToDto(updatedRow);
  }

  async cancelCampaign(userId: string, campaignId: string) {
    const row = await this.repository.getCampaignById(campaignId);
    
    const eligibility = await this.eligibilityService.checkEligibility(userId, row.merchant_id);
    if (!eligibility.eligible) {
      throw new Error(`Unauthorized cancellation of campaign: ${eligibility.reason}`);
    }

    if (row.status === "CANCELLED") {
      throw new Error("Campaign is already cancelled.");
    }

    const updatedRow = await this.repository.cancelCampaign(campaignId);
    return mapCampaignToDto(updatedRow);
  }
}
