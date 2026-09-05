import { MerchantClaimService } from "../../services/merchant-claim.service";
import { CampaignService } from "../../services/campaign.service";

export async function getMerchantAnalyticsCampaigns(merchantId?: string | null) {
  const response = await MerchantClaimService.getMyMerchants();
  // Campaign reads use the same backend eligibility boundary as creation.
  const owned = response.ownedMerchants;
  const merchants = merchantId ? owned.filter((merchant) => merchant.id === merchantId) : owned;
  const campaigns = await Promise.all(merchants.map(async (merchant) => {
    const campaigns = await CampaignService.getCampaigns(merchant.id);
    return campaigns.map((campaign) => ({ id: campaign.id, name: campaign.name }));
  }));
  return campaigns.flat();
}
