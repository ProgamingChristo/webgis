import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ merchants: vi.fn(), campaigns: vi.fn() }));
vi.mock("@/src/features/umkm-advertising/services/merchant-claim.service", () => ({ MerchantClaimService: { getMyMerchants: mocks.merchants } }));
vi.mock("@/src/features/umkm-advertising/services/campaign.service", () => ({ CampaignService: { getCampaigns: mocks.campaigns } }));
import { getMerchantAnalyticsCampaigns } from "@/src/features/umkm-advertising/analytics/services/merchant-campaigns.service";

describe("Merchant analytics campaign contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.merchants.mockResolvedValue({ ownedMerchants: [{ id: "a" }, { id: "b" }], ineligibleMerchants: [{ id: "inactive" }], recommendedMerchants: [] });
    mocks.campaigns.mockImplementation(async (id: string) => [{ id: `${id}-campaign`, name: `Promosi ${id}` }]);
  });

  it("reads the existing object response and limits campaigns to the selected merchant", async () => {
    await expect(getMerchantAnalyticsCampaigns("b")).resolves.toEqual([{ id: "b-campaign", name: "Promosi b" }]);
    expect(mocks.campaigns).toHaveBeenCalledTimes(1);
    expect(mocks.campaigns).toHaveBeenCalledWith("b");
  });

  it("does not load campaigns for an unavailable or ineligible merchant", async () => {
    await expect(getMerchantAnalyticsCampaigns("unowned")).resolves.toEqual([]);
    await expect(getMerchantAnalyticsCampaigns("inactive")).resolves.toEqual([]);
    expect(mocks.campaigns).not.toHaveBeenCalled();
  });

  it("supports the existing analytics entry without a merchant filter", async () => {
    await expect(getMerchantAnalyticsCampaigns()).resolves.toHaveLength(2);
    expect(mocks.campaigns).not.toHaveBeenCalledWith("inactive");
  });

  it("surfaces API failures instead of fabricating an empty campaign history", async () => {
    mocks.campaigns.mockRejectedValue(new Error("unavailable"));
    await expect(getMerchantAnalyticsCampaigns("b")).rejects.toThrow("unavailable");
  });
});
