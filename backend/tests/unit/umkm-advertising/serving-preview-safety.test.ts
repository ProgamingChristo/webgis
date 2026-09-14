import { describe, expect, it, vi } from "vitest";
import { SponsoredPinServingService } from "@/src/features/umkm-advertising/ad-serving/services/sponsored-pin-serving.service";

function campaignRecord(merchantId = "merchant-1") {
  return {
    campaign: {
      id: "campaign-1",
      merchant_id: merchantId,
      name: "Promo Sarapan",
      description: null,
      status: "ACTIVE",
      start_at: "2026-09-01T00:00:00.000Z",
      end_at: "2026-09-30T00:00:00.000Z",
      updated_at: "2026-09-10T00:00:00.000Z",
    },
    merchant: {
      id: merchantId,
      name: "Kedai Pagi",
      category: "Kuliner",
      publish_status: "PUBLISHED",
      location: { type: "Point", coordinates: [107.609, -6.9175] },
    },
    creative: {
      id: "creative-1",
      creative_type: "SPONSORED_PIN",
      status: "READY",
      headline: "Sarapan hemat",
      description: null,
      cta_type: "VIEW_PROFILE",
      image_path: null,
    },
    target: {
      target_type: "RADIUS",
      radius_meters: 1000,
      center_geometry: { type: "Point", coordinates: [107.609, -6.9175] },
      study_area_id: null,
    },
  };
}

describe("technical serving preview safety", () => {
  it("blocks a mismatched merchant campaign ID before eligibility evaluation", async () => {
    const service = new SponsoredPinServingService({} as any) as any;
    service.repository = { getCampaignWithDetails: vi.fn().mockResolvedValue(campaignRecord("merchant-other")) };
    service.readinessService = { evaluateReadiness: vi.fn() };

    await expect(service.evaluateCampaignServing("merchant-1", "campaign-1", { longitude: 107.6, latitude: -6.9 }))
      .rejects.toThrow("Merchant tidak memiliki campaign ini");
    expect(service.readinessService.evaluateReadiness).not.toHaveBeenCalled();
  });

  it("returns an eligible technical preview without inserting production events or spend", async () => {
    const from = vi.fn(() => { throw new Error("Technical preview must not write to a database table directly."); });
    const service = new SponsoredPinServingService({ from } as any) as any;
    const record = campaignRecord();
    service.repository = { getCampaignWithDetails: vi.fn().mockResolvedValue(record) };
    service.readinessService = { evaluateReadiness: vi.fn().mockResolvedValue({ ready: true, blockers: [], checks: { merchant: true, creative: true, targeting: true, schedule: true, payment: true } }) };
    service.lifecycleService = { getEffectiveCampaignStatus: vi.fn().mockReturnValue("ACTIVE") };
    service.eligibilityService = { verifyEligibility: vi.fn().mockResolvedValue(true) };
    service.servingService = {
      parseCoordinates: vi.fn().mockReturnValue({ longitude: 107.609, latitude: -6.9175 }),
      evaluateSpatialMatch: vi.fn().mockResolvedValue(true),
      mapToSponsoredPinDTO: vi.fn().mockReturnValue({ campaign_id: "campaign-1", sponsored: true, label: "Sponsored" }),
    };

    const result = await service.evaluateCampaignServing("merchant-1", "campaign-1", { longitude: 107.609, latitude: -6.9175 });

    expect(result.servable).toBe(true);
    expect(result.placement).toMatchObject({ sponsored: true, label: "Sponsored" });
    expect(from).not.toHaveBeenCalled();
  });
});
