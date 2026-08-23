import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdServingService } from "@/src/features/umkm-advertising/ad-serving/services/ad-serving.service";
import { AdServingContextInvalidError } from "@/src/features/umkm-advertising/ad-serving/errors/ad-serving.errors";

describe("AdServingService Unit Tests", () => {
  let service: AdServingService;
  let mockSupabase: any;

  const validMerchant = {
    id: "merchant-1",
    name: "Kopi Braga",
    category: "CAFE",
    is_active: true,
    location: { type: "Point", coordinates: [107.609, -6.9175] },
  };

  const validCreative = {
    id: "creative-1",
    campaign_id: "campaign-1",
    creative_type: "SPONSORED_PIN",
    headline: "Diskon Kopi 20%",
    description: "Promo commuter",
    cta_type: "VIEW_PROFILE",
    status: "READY",
  };

  const validRadiusTarget = {
    id: "target-1",
    campaign_id: "campaign-1",
    target_type: "RADIUS",
    radius_meters: 1000,
    center_geometry: { type: "Point", coordinates: [107.609, -6.9175] },
    study_area_id: null,
  };

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
      rpc: vi.fn(),
    };
    service = new AdServingService(mockSupabase);
  });

  describe("Coordinate Validation Rules", () => {
    it("should throw AdServingContextInvalidError when longitude is out of range", async () => {
      await expect(
        service.getSponsoredPinCandidates({
          context: { longitude: 200, latitude: -6.9175 },
        })
      ).rejects.toThrow(AdServingContextInvalidError);
    });

    it("should throw AdServingContextInvalidError when latitude is out of range", async () => {
      await expect(
        service.getSponsoredPinCandidates({
          context: { longitude: 107.609, latitude: -95 },
        })
      ).rejects.toThrow(AdServingContextInvalidError);
    });

    it("should throw AdServingContextInvalidError when coordinate is NaN", async () => {
      await expect(
        service.getSponsoredPinCandidates({
          context: { longitude: NaN, latitude: -6.9175 },
        })
      ).rejects.toThrow(AdServingContextInvalidError);
    });
  });

  describe("Spatial Matching Engine", () => {
    it("should return true when point is within radius (approx 100m away)", async () => {
      const merchantCoords = { longitude: 107.609, latitude: -6.9175 };
      const closeContext = { longitude: 107.6095, latitude: -6.9175 }; // ~55m away

      const isInside = await service.evaluateSpatialMatch(
        validRadiusTarget,
        merchantCoords,
        closeContext
      );

      expect(isInside).toBe(true);
    });

    it("should return false when point is outside radius (e.g. 5km away)", async () => {
      const merchantCoords = { longitude: 107.609, latitude: -6.9175 };
      const farContext = { longitude: 107.65, latitude: -6.95 }; // ~5.7km away

      const isInside = await service.evaluateSpatialMatch(
        validRadiusTarget,
        merchantCoords,
        farContext
      );

      expect(isInside).toBe(false);
    });
  });

  describe("Public DTO Safety & Contract", () => {
    it("should produce a strictly safe SponsoredPinDTO without leaking private/financial fields", () => {
      const rawRecord: any = {
        campaign: {
          id: "campaign-1",
          merchant_id: "merchant-1",
          name: "Promo Kopi",
          description: "Internal deskripsi",
          status: "ACTIVE",
          created_by: "user-secret-id",
          updated_at: "2026-09-05T00:00:00.000Z",
        },
        merchant: validMerchant,
        creative: validCreative,
        target: validRadiusTarget,
      };

      const dto = service.mapToSponsoredPinDTO(rawRecord, 107.609, -6.9175);

      expect(dto).toEqual({
        placement_type: "SPONSORED_PIN",
        sponsored: true,
        label: "Sponsored",
        campaign_id: "campaign-1",
        creative_id: "creative-1",
        merchant_id: "merchant-1",
        merchant_name: "Kopi Braga",
        merchant_category: "CAFE",
        geometry: {
          type: "Point",
          coordinates: [107.609, -6.9175],
        },
        headline: "Diskon Kopi 20%",
        description: "Promo commuter",
        cta_type: "VIEW_PROFILE",
        image_url: null,
      });

      expect((dto as any).created_by).toBeUndefined();
      expect((dto as any).status).toBeUndefined();
      expect((dto as any).owner_id).toBeUndefined();
    });
  });
});
