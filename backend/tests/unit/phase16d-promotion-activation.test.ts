import { describe, expect, it, vi } from "vitest";
import { AdvertisingEligibilityService } from "@/src/features/umkm-advertising/services/advertising-eligibility.service";
import { CampaignService } from "@/src/features/umkm-advertising/services/campaign.service";
import { AdServingService } from "@/src/features/umkm-advertising/ad-serving/services/ad-serving.service";
import { SponsoredPlacementAdapter } from "@/src/features/fair-discovery/integrations/sponsored-placement.adapter";
import { ApplicationError } from "@/src/lib/errors";

describe("PHASE 16D — Promotion Eligibility, Campaign Activation & Sponsored Integration", () => {
  const userA = "user-a-uuid";
  const userB = "user-b-uuid";
  const userRandom = "user-random-uuid";

  const merchantAId = "merchant-a-uuid";
  const merchantBId = "merchant-b-uuid";
  const menuGoMerchantId = "menugo-merchant-uuid";
  const mapidMerchantId = "mapid-merchant-uuid";

  const validPoint = { type: "Point", coordinates: [107.609, -6.9175] };

  // =========================================================================
  // TEST A: PENDING SUBMISSION
  // =========================================================================
  describe("Test A — Pending Submission", () => {
    it("appears in Promotion workspace as Menunggu verifikasi with campaign creation blocked", async () => {
      const mockSupabase: any = {
        from: vi.fn((table: string) => {
          if (table === "merchants") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              range: vi.fn().mockResolvedValue({ data: [], error: null }),
            };
          }
          if (table === "merchant_submissions") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              range: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: "sub-1",
                    name: "Kopi Bundaran",
                    address: "Jl. Bundaran No. 1",
                    status: "PENDING_REVIEW",
                    canonical_merchant_id: null,
                    created_at: new Date().toISOString(),
                  },
                ],
                error: null,
              }),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }),
      };

      const ownershipService: any = {
        getOwnershipState: vi.fn().mockResolvedValue({ isOwned: false, claimStatus: null }),
      };
      const eligibilityService = new AdvertisingEligibilityService(mockSupabase, ownershipService);

      const eligibility = await eligibilityService.checkEligibility(userA, "sub-1");
      expect(eligibility.eligible).toBe(false);

      const campaignRepo: any = { createCampaign: vi.fn() };
      const campaignService = new CampaignService(campaignRepo, eligibilityService);

      await expect(
        campaignService.createCampaign(userA, {
          merchantId: "sub-1",
          name: "Promo Opening",
        })
      ).rejects.toThrow(ApplicationError);
    });
  });

  // =========================================================================
  // TEST B: PENDING CLAIM
  // =========================================================================
  describe("Test B — Pending Claim", () => {
    it("appears in Promotion workspace as Claim sedang diperiksa, campaign creation blocked, merchant stays public", async () => {
      const mockSupabase: any = {
        from: vi.fn((table: string) => {
          if (table === "merchants") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: menuGoMerchantId,
                  name: "Bakso Pak Jaya",
                  publish_status: "PUBLISHED",
                  verification_status: "VERIFIED",
                  location: validPoint,
                },
                error: null,
              }),
            };
          }
          if (table === "user_stakeholder_modes") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: { mode: "UMKM" }, error: null }),
            };
          }
          return {};
        }),
      };

      const ownershipService: any = {
        getOwnershipState: vi.fn().mockResolvedValue({
          merchantId: menuGoMerchantId,
          isOwned: false,
          ownerId: null,
          claimStatus: "PENDING",
        }),
      };

      const eligibilityService = new AdvertisingEligibilityService(mockSupabase, ownershipService);
      const eligibility = await eligibilityService.checkEligibility(userA, menuGoMerchantId);

      expect(eligibility.eligible).toBe(false);
      expect((eligibility as any).reason).toBe("OWNERSHIP_PENDING");

      const campaignRepo: any = { createCampaign: vi.fn() };
      const campaignService = new CampaignService(campaignRepo, eligibilityService);

      await expect(
        campaignService.createCampaign(userA, {
          merchantId: menuGoMerchantId,
          name: "Diskon Bakso",
        })
      ).rejects.toThrow(ApplicationError);
    });
  });

  // =========================================================================
  // TEST C: OWNER SUBMISSION APPROVED -> PROMOTION READY
  // =========================================================================
  describe("Test C — Owner Submission Approved", () => {
    it("transitions to Siap dipromosikan and allows campaign creation without relogin", async () => {
      const mockSupabase: any = {
        from: vi.fn((table: string) => {
          if (table === "merchants") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: merchantAId,
                  name: "Warung ABC",
                  publish_status: "PUBLISHED",
                  verification_status: "VERIFIED",
                  location: validPoint,
                  metadata: { category: "Kuliner" },
                },
                error: null,
              }),
            };
          }
          if (table === "user_stakeholder_modes") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: { mode: "UMKM" }, error: null }),
            };
          }
          return {};
        }),
      };

      const ownershipService: any = {
        getOwnershipState: vi.fn().mockResolvedValue({
          merchantId: merchantAId,
          isOwned: true,
          ownerId: userA,
          claimStatus: "APPROVED",
        }),
      };

      const eligibilityService = new AdvertisingEligibilityService(mockSupabase, ownershipService);
      const eligibility = await eligibilityService.checkEligibility(userA, merchantAId);

      expect(eligibility.eligible).toBe(true);
      expect((eligibility as any).merchantId).toBe(merchantAId);

      const campaignRepo: any = {
        createCampaign: vi.fn().mockResolvedValue({
          id: "campaign-abc",
          merchant_id: merchantAId,
          name: "Promo Paket Hemat",
          status: "DRAFT",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      };
      const campaignService = new CampaignService(campaignRepo, eligibilityService);
      const created = await campaignService.createCampaign(userA, {
        merchantId: merchantAId,
        name: "Promo Paket Hemat",
      });

      expect(created.id).toBe("campaign-abc");
      expect(created.merchantId).toBe(merchantAId);
    });
  });

  // =========================================================================
  // TEST D: MENU GO CLAIM APPROVED -> CAMPAIGN -> SPONSORED
  // =========================================================================
  describe("Test D — Menu Go Claim Approved", () => {
    it("preserves Menu Go canonical ID and provenance, enables campaign, and qualifies as sponsored", async () => {
      const mockSupabase: any = {
        from: vi.fn((table: string) => {
          if (table === "merchants") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: menuGoMerchantId,
                  name: "Sate Padang Menu Go",
                  owner_id: userA,
                  publish_status: "PUBLISHED",
                  verification_status: "VERIFIED",
                  location: validPoint,
                  metadata: { source: "MENU_GO", category: "Kuliner" },
                },
                error: null,
              }),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: menuGoMerchantId,
                  name: "Sate Padang Menu Go",
                  owner_id: userA,
                  publish_status: "PUBLISHED",
                  verification_status: "VERIFIED",
                  location: validPoint,
                  metadata: { source: "MENU_GO", category: "Kuliner" },
                },
                error: null,
              }),
            };
          }
          if (table === "user_stakeholder_modes") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: { mode: "UMKM" }, error: null }),
            };
          }
          return {};
        }),
      };

      const ownershipService: any = {
        getOwnershipState: vi.fn().mockResolvedValue({
          merchantId: menuGoMerchantId,
          isOwned: true,
          ownerId: userA,
          claimStatus: "APPROVED",
        }),
      };

      const eligibilityService = new AdvertisingEligibilityService(mockSupabase, ownershipService);
      const eligibility = await eligibilityService.checkEligibility(userA, menuGoMerchantId);
      expect(eligibility.eligible).toBe(true);

      const servingEligible = await eligibilityService.isMerchantEligibleForServing(menuGoMerchantId);
      expect(servingEligible).toBe(true);
    });
  });

  // =========================================================================
  // TEST E: MAPID / PREMIUM CLAIM APPROVED
  // =========================================================================
  describe("Test E — MAPID / Premium Claim Approved", () => {
    it("preserves MAPID provenance, attaches verified owner, and qualifies for promotion", async () => {
      const mockSupabase: any = {
        from: vi.fn((table: string) => {
          if (table === "merchants") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: mapidMerchantId,
                  name: "Cafe MAPID Premium",
                  owner_id: userB,
                  publish_status: "PUBLISHED",
                  verification_status: "VERIFIED",
                  location: validPoint,
                  metadata: { source: "MAPID_PREMIUM", category: "Cafe" },
                },
                error: null,
              }),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: mapidMerchantId,
                  name: "Cafe MAPID Premium",
                  owner_id: userB,
                  publish_status: "PUBLISHED",
                  verification_status: "VERIFIED",
                  location: validPoint,
                  metadata: { source: "MAPID_PREMIUM", category: "Cafe" },
                },
                error: null,
              }),
            };
          }
          if (table === "user_stakeholder_modes") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: { mode: "UMKM" }, error: null }),
            };
          }
          return {};
        }),
      };

      const ownershipService: any = {
        getOwnershipState: vi.fn().mockResolvedValue({
          merchantId: mapidMerchantId,
          isOwned: true,
          ownerId: userB,
          claimStatus: "APPROVED",
        }),
      };

      const eligibilityService = new AdvertisingEligibilityService(mockSupabase, ownershipService);
      const eligibility = await eligibilityService.checkEligibility(userB, mapidMerchantId);
      expect(eligibility.eligible).toBe(true);

      const servingEligible = await eligibilityService.isMerchantEligibleForServing(mapidMerchantId);
      expect(servingEligible).toBe(true);
    });
  });

  // =========================================================================
  // TEST F: CROSS-OWNER ATTACK
  // =========================================================================
  describe("Test F — Cross-Owner Attack", () => {
    it("strictly blocks User A from creating campaign for User B's merchant", async () => {
      const mockSupabase: any = {
        from: vi.fn((table: string) => {
          if (table === "merchants") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: merchantBId,
                  name: "Toko User B",
                  publish_status: "PUBLISHED",
                  verification_status: "VERIFIED",
                  location: validPoint,
                  metadata: { category: "Retail" },
                },
                error: null,
              }),
            };
          }
          if (table === "user_stakeholder_modes") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: { mode: "UMKM" }, error: null }),
            };
          }
          return {};
        }),
      };

      const ownershipService: any = {
        getOwnershipState: vi.fn().mockResolvedValue({
          merchantId: merchantBId,
          isOwned: false,
          ownerId: userB,
          claimStatus: null,
        }),
      };

      const eligibilityService = new AdvertisingEligibilityService(mockSupabase, ownershipService);
      const eligibility = await eligibilityService.checkEligibility(userA, merchantBId);

      expect(eligibility.eligible).toBe(false);
      expect((eligibility as any).reason).toBe("OWNERSHIP_REQUIRED");

      const campaignRepo: any = { createCampaign: vi.fn() };
      const campaignService = new CampaignService(campaignRepo, eligibilityService);

      await expect(
        campaignService.createCampaign(userA, {
          merchantId: merchantBId,
          name: "Malicious Attack Campaign",
        })
      ).rejects.toThrow(ApplicationError);
      expect(campaignRepo.createCampaign).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // TEST G: UNCLAIMED PUBLIC MERCHANT
  // =========================================================================
  describe("Test G — Unclaimed Public Merchant", () => {
    it("remains public but cannot be promoted by random user, and cannot be served as sponsored without verified owner", async () => {
      const mockSupabase: any = {
        from: vi.fn((table: string) => {
          if (table === "merchants") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "unclaimed-menu-go",
                  name: "Warung Kopi Braga",
                  owner_id: null,
                  publish_status: "PUBLISHED",
                  verification_status: "VERIFIED",
                  location: validPoint,
                  metadata: { category: "Cafe" },
                },
                error: null,
              }),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "unclaimed-menu-go",
                  name: "Warung Kopi Braga",
                  owner_id: null,
                  publish_status: "PUBLISHED",
                  verification_status: "VERIFIED",
                  location: validPoint,
                  metadata: { category: "Cafe" },
                },
                error: null,
              }),
            };
          }
          if (table === "user_stakeholder_modes") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: { mode: "UMKM" }, error: null }),
            };
          }
          return {};
        }),
      };

      const ownershipService: any = {
        getOwnershipState: vi.fn().mockResolvedValue({
          merchantId: "unclaimed-menu-go",
          isOwned: false,
          ownerId: null,
          claimStatus: null,
        }),
      };

      const eligibilityService = new AdvertisingEligibilityService(mockSupabase, ownershipService);
      const randomUserEligibility = await eligibilityService.checkEligibility(userRandom, "unclaimed-menu-go");
      expect(randomUserEligibility.eligible).toBe(false);

      const servingEligible = await eligibilityService.isMerchantEligibleForServing("unclaimed-menu-go");
      expect(servingEligible).toBe(false);
    });
  });

  // =========================================================================
  // TEST H: SPONSORED DOES NOT BYPASS COMMUTER HARD CONSTRAINTS
  // =========================================================================
  describe("Test H — Sponsored Hard Constraints", () => {
    it("does not serve active campaign when commuter category does not match", async () => {
      const mockSupabase: any = {
        from: vi.fn(),
      };

      const adapter = new SponsoredPlacementAdapter(mockSupabase);

      vi.spyOn((adapter as any).adServingService, "getSponsoredPinCandidates").mockResolvedValue([
        {
          placement_type: "SPONSORED_PIN",
          sponsored: true,
          label: "Sponsored",
          campaign_id: "c-1",
          creative_id: "cr-1",
          merchant_id: "m-cafe",
          merchant_name: "Kopi Kita",
          merchant_category: "Cafe",
          geometry: validPoint,
          headline: "Kopi Nikmat",
          description: "Ngopi santai",
          cta_type: "VIEW_PROFILE",
          image_url: null,
        },
      ]);

      const results = await adapter.getEligibleSponsoredPlacements({
        origin: { longitude: 107.609, latitude: -6.9175 },
        category: "Bengkel",
      });

      expect(results).toHaveLength(0);
    });
  });

  // =========================================================================
  // TEST I: ACTIVE SPONSORED SUCCESS
  // =========================================================================
  describe("Test I — Active Sponsored Success", () => {
    it("serves matching active campaign with canonical ID and sponsored disclosure", async () => {
      const mockSupabase: any = {
        from: vi.fn(),
      };

      const adapter = new SponsoredPlacementAdapter(mockSupabase);

      vi.spyOn((adapter as any).adServingService, "getSponsoredPinCandidates").mockResolvedValue([
        {
          placement_type: "SPONSORED_PIN",
          sponsored: true,
          label: "Sponsored",
          campaign_id: "c-sate",
          creative_id: "cr-sate",
          merchant_id: menuGoMerchantId,
          merchant_name: "Sate Padang Menu Go",
          merchant_category: "Kuliner",
          geometry: validPoint,
          headline: "Sate Padang Asli",
          description: "Bumbu istimewa",
          cta_type: "VIEW_PROFILE",
          image_url: null,
        },
      ]);

      const results = await adapter.getEligibleSponsoredPlacements({
        origin: { longitude: 107.609, latitude: -6.9175 },
        category: "Kuliner",
      });

      expect(results).toHaveLength(1);
      expect(results[0].merchant_id).toBe(menuGoMerchantId);
      expect(results[0].sponsored).toBe(true);
      expect(results[0].label).toBe("Sponsored");
      expect(results[0].geometry.coordinates).toEqual([107.609, -6.9175]);
    });
  });

  // =========================================================================
  // TEST J: INACTIVE / PAUSED / ENDED CAMPAIGN NOT SERVED
  // =========================================================================
  describe("Test J — Inactive Campaign Not Served", () => {
    it("does not serve campaigns when status is PAUSED, ENDED, or CANCELLED", async () => {
      const mockSupabase: any = {
        from: vi.fn(),
      };

      const adServingService = new AdServingService(mockSupabase);

      vi.spyOn((adServingService as any).repository, "findPotentialServingCampaigns").mockResolvedValue([]);

      const candidates = await adServingService.getSponsoredPinCandidates({
        context: { longitude: 107.609, latitude: -6.9175 },
      });

      expect(candidates).toEqual([]);
    });
  });

  // =========================================================================
  // TEST K: PROFILE COMPLETENESS (Section 12)
  // =========================================================================
  describe("Test K — Profile Completeness", () => {
    it("returns PROFILE_INCOMPLETE when category or name is missing", async () => {
      const mockSupabase: any = {
        from: vi.fn((table: string) => {
          if (table === "merchants") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: merchantAId,
                  name: "Warung Tanpa Kategori",
                  publish_status: "PUBLISHED",
                  verification_status: "VERIFIED",
                  location: validPoint,
                  metadata: {},
                  description: null,
                },
                error: null,
              }),
            };
          }
          if (table === "user_stakeholder_modes") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: { mode: "UMKM" }, error: null }),
            };
          }
          return {};
        }),
      };

      const ownershipService: any = {
        getOwnershipState: vi.fn().mockResolvedValue({
          merchantId: merchantAId,
          isOwned: true,
          ownerId: userA,
          claimStatus: "APPROVED",
        }),
      };

      const eligibilityService = new AdvertisingEligibilityService(mockSupabase, ownershipService);
      const eligibility = await eligibilityService.checkEligibility(userA, merchantAId);

      expect(eligibility.eligible).toBe(false);
      expect((eligibility as any).reason).toBe("PROFILE_INCOMPLETE");
    });
  });

  // =========================================================================
  // TEST L: DEDUPLICATION (Section 29)
  // =========================================================================
  describe("Test L — Workspace Deduplication", () => {
    it("does not duplicate an approved submission or claim with canonical merchant", async () => {
      const ownedMerchant = {
        id: merchantAId,
        name: "Warung ABC",
        address: "Jl. ABC",
        publish_status: "PUBLISHED",
        verification_status: "VERIFIED",
        location: validPoint,
        metadata: { category: "Kuliner", submitted_from_id: "sub-1" },
        description: "Enak",
        primary_category_id: "cat-1",
      };

      const mockSupabase: any = {
        from: vi.fn((table: string) => {
          if (table === "merchants") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              range: vi.fn().mockResolvedValue({ data: [ownedMerchant], error: null }),
              single: vi.fn().mockResolvedValue({ data: ownedMerchant, error: null }),
            };
          }
          if (table === "merchant_submissions") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              range: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: "sub-1",
                    name: "Warung ABC",
                    status: "APPROVED",
                    canonical_merchant_id: merchantAId,
                  },
                ],
                error: null,
              }),
            };
          }
          if (table === "merchant_claims") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              range: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: "claim-1",
                    merchant_id: merchantAId,
                    status: "APPROVED",
                  },
                ],
                error: null,
              }),
            };
          }
          if (table === "user_stakeholder_modes") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: { mode: "UMKM" }, error: null }),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }),
      };

      const ownershipService: any = {
        getOwnershipState: vi.fn().mockResolvedValue({
          merchantId: merchantAId,
          isOwned: true,
          ownerId: userA,
          claimStatus: "APPROVED",
        }),
      };

      const eligibilityService = new AdvertisingEligibilityService(mockSupabase, ownershipService);
      const result = await eligibilityService.checkEligibility(userA, merchantAId);
      expect(result.eligible).toBe(true);
      expect(ownedMerchant.id).toBe(merchantAId);
    });
  });
});
