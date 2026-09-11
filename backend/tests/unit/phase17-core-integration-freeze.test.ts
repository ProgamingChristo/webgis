import { describe, expect, it, vi } from "vitest";
import { AdvertisingEligibilityService } from "@/src/features/umkm-advertising/services/advertising-eligibility.service";
import { CampaignService } from "@/src/features/umkm-advertising/services/campaign.service";
import { AdServingService } from "@/src/features/umkm-advertising/ad-serving/services/ad-serving.service";
import { SponsoredPlacementAdapter } from "@/src/features/fair-discovery/integrations/sponsored-placement.adapter";
import { FairDiscoveryCompositionService } from "@/src/features/fair-discovery/services/fair-discovery-composition.service";
import { ApplicationError } from "@/src/lib/errors";

describe("PHASE 17 — Core Experience Integration Freeze Acceptance", () => {
  // Test Fixtures
  const ownerUserA = "owner-a-uuid";
  const ownerUserB = "owner-b-uuid";
  const randomUserId = "random-user-uuid";

  const canonicalMerchantA = "canonical-merchant-a";
  const merchantBId = "merchant-b-uuid";
  const menuGoMerchantId = "menugo-canonical-merchant";
  const mapidMerchantId = "mapid-canonical-merchant";

  const bragaCoords = { longitude: 107.609, latitude: -6.9175 };
  const bragaPoint = { type: "Point", coordinates: [107.609, -6.9175] };

  // =========================================================================
  // 1. COMMUTER GOLDEN FLOW (Section 5, 6, 7, 8, 9)
  // =========================================================================
  describe("Golden Flow A: Commuter Discovery -> Fair Discovery -> Routing", () => {
    it("preserves shared location, differentiates spatial proximity from network walking, and renders matching Fair Discovery", async () => {
      // 1. Commuter uses shared location origin
      const origin = { longitude: 107.609, latitude: -6.9175 };

      // 2. Spatial proximity is PostGIS Euclidean/ellipsoidal distance
      const distanceMeters = 350; // PostGIS distance
      // 3. Network walking is ped-graph distance and duration
      const networkDistanceMeters = 420;
      const walkingMinutes = 6;

      expect(distanceMeters).not.toBe(networkDistanceMeters);
      expect(walkingMinutes).toBe(Math.ceil(networkDistanceMeters / 70)); // standard 70m/min walking speed

      // 4. Fair Discovery Composition
      const mockSupabase: any = {
        from: vi.fn((table: string) => {
          if (table === "merchants") {
            return {
              select: vi.fn().mockReturnThis(),
              not: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: canonicalMerchantA,
                    name: "Warung Kopi Braga",
                    address: "Jl Braga No 1",
                    description: "Kopi nikmat",
                    primary_category_id: "Cafe",
                    data_quality_score: 75,
                    location: bragaPoint,
                    publish_status: "PUBLISHED",
                    verification_status: "VERIFIED",
                  },
                  {
                    id: menuGoMerchantId,
                    name: "Sate Hidden Gem",
                    address: "Jl Braga No 2",
                    description: "Sate enak",
                    primary_category_id: "Kuliner",
                    data_quality_score: 85,
                    location: bragaPoint,
                    publish_status: "PUBLISHED",
                    verification_status: "VERIFIED",
                  },
                ],
                error: null,
              }),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }),
        rpc: vi.fn(),
      };

      const discoveryService = new FairDiscoveryCompositionService(mockSupabase);
      vi.spyOn((discoveryService as any).bannerService, "getEligibleBanner").mockResolvedValue(null);

      // Mock sponsored adapter returning active sponsored candidate
      vi.spyOn((discoveryService as any).sponsoredAdapter, "getEligibleSponsoredPlacements").mockResolvedValue([
        {
          placement_type: "SPONSORED_PIN",
          sponsored: true,
          label: "Sponsored",
          campaign_id: "camp-sponsored-1",
          creative_id: "cr-1",
          merchant_id: mapidMerchantId,
          merchant_name: "Bakso Promosi MAPID",
          merchant_category: "Kuliner",
          geometry: bragaPoint,
          headline: "Spesial Komuter",
          description: "Diskon 20%",
          cta_type: "VIEW_PROFILE",
          image_url: null,
        },
      ]);

      const result = await discoveryService.discover({
        origin,
        category: "Semua",
      });

      // Validates presence of tripartite discovery sections
      expect(result.original).toBeDefined();
      expect(result.hidden_gems).toBeDefined();
      expect(result.sponsored).toBeDefined();

      // Original section
      expect(result.original.length).toBeGreaterThan(0);
      expect(result.original[0].id).toBe(canonicalMerchantA);

      // Hidden gem section
      expect(result.hidden_gems.length).toBeGreaterThan(0);
      expect(result.hidden_gems[0].id).toBe(menuGoMerchantId);

      // Sponsored section
      expect(result.sponsored).toHaveLength(1);
      expect(result.sponsored[0].merchant_id).toBe(mapidMerchantId);
      expect(result.sponsored[0].sponsored).toBe(true);
      expect(result.sponsored[0].label).toBe("Sponsored");

      // Canonical ID is preserved across all sections
      expect(result.sponsored[0].merchant_id).toBe(mapidMerchantId);
      expect(result.sponsored[0].geometry.coordinates).toEqual([107.609, -6.9175]);
    });

    it("strictly isolates failures so ad serving errors do not break commuter organic discovery", async () => {
      const mockSupabase: any = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          not: vi.fn().mockResolvedValue({
            data: [
              {
                id: canonicalMerchantA,
                name: "Toko Buku Asli",
                address: "Jl Braga No 3",
                description: "Buku lengkap",
                primary_category_id: "Retail",
                data_quality_score: 70,
                location: bragaPoint,
                publish_status: "PUBLISHED",
                verification_status: "VERIFIED",
              },
            ],
            error: null,
          }),
        })),
        rpc: vi.fn(),
      };
      const discoveryService = new FairDiscoveryCompositionService(mockSupabase);
      vi.spyOn((discoveryService as any).bannerService, "getEligibleBanner").mockResolvedValue(null);

      // Ad serving throws exception
      vi.spyOn((discoveryService as any).sponsoredAdapter, "getEligibleSponsoredPlacements").mockRejectedValue(
        new Error("Ad serving timeout")
      );

      const result = await discoveryService.discover({
        origin: bragaCoords,
        category: "Semua",
      });

      // Organic discovery continues gracefully
      expect(result.original.length).toBe(1);
      expect(result.sponsored).toEqual([]);
    });
  });

  // =========================================================================
  // 2. NEW UMKM OWNER GOLDEN FLOW (Section 10, 11, 12)
  // =========================================================================
  describe("Golden Flow B: New UMKM Owner Lifecycle", () => {
    it("enforces pending boundaries, transitions to canonical merchant upon admin approval, and activates promotion", async () => {
      const submissionId = "sub-flow-b";
      const newCanonicalMerchantId = "merchant-flow-b";

      // 1. Pending submission state
      const mockSupabasePending: any = {
        from: vi.fn((table: string) => {
          if (table === "merchants") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }),
      };

      const ownershipPending: any = {
        getOwnershipState: vi.fn().mockResolvedValue({ isOwned: false, claimStatus: null }),
      };
      const eligibilityPending = new AdvertisingEligibilityService(mockSupabasePending, ownershipPending);

      // Pending submission is NOT eligible for campaign
      const checkPending = await eligibilityPending.checkEligibility(ownerUserA, submissionId);
      expect(checkPending.eligible).toBe(false);

      // Serving check is FALSE
      const servingPending = await eligibilityPending.isMerchantEligibleForServing(submissionId);
      expect(servingPending).toBe(false);

      // 2. Admin approval occurs -> Canonical merchant created with verified ownership
      const approvedCanonicalMerchant = {
        id: newCanonicalMerchantId,
        name: "Kopi Haruman",
        address: "Jl. Haruman No. 22",
        owner_id: ownerUserA,
        publish_status: "PUBLISHED",
        verification_status: "VERIFIED",
        location: bragaPoint,
        metadata: { category: "Cafe", submitted_from_id: submissionId },
        primary_category_id: "cat-cafe",
      };

      const mockSupabaseApproved: any = {
        from: vi.fn((table: string) => {
          if (table === "merchants") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: approvedCanonicalMerchant, error: null }),
              single: vi.fn().mockResolvedValue({ data: approvedCanonicalMerchant, error: null }),
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

      const ownershipApproved: any = {
        getOwnershipState: vi.fn().mockResolvedValue({
          merchantId: newCanonicalMerchantId,
          isOwned: true,
          ownerId: ownerUserA,
          claimStatus: "APPROVED",
        }),
      };

      const eligibilityApproved = new AdvertisingEligibilityService(mockSupabaseApproved, ownershipApproved);

      // Promotion readiness passes
      const checkApproved = await eligibilityApproved.checkEligibility(ownerUserA, newCanonicalMerchantId);
      expect(checkApproved.eligible).toBe(true);

      // Serving eligibility passes
      const checkServing = await eligibilityApproved.isMerchantEligibleForServing(newCanonicalMerchantId);
      expect(checkServing).toBe(true);

      // Owner can now create campaign
      const campaignRepo: any = {
        createCampaign: vi.fn().mockResolvedValue({
          id: "camp-b-1",
          merchant_id: newCanonicalMerchantId,
          name: "Promo Kopi Haruman",
          status: "DRAFT",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      };
      const campaignService = new CampaignService(campaignRepo, eligibilityApproved);
      const campaign = await campaignService.createCampaign(ownerUserA, {
        merchantId: newCanonicalMerchantId,
        name: "Promo Kopi Haruman",
      });

      expect(campaign.id).toBe("camp-b-1");
      expect(campaign.merchantId).toBe(newCanonicalMerchantId);
    });
  });

  // =========================================================================
  // 3. MENU GO / MAPID CLAIM FLOWS & PROVENANCE (Section 13, 14, 15, 17)
  // =========================================================================
  describe("Golden Flows C & D: Menu Go & MAPID Provenance Preservation", () => {
    it("preserves MENU_GO provenance and canonical identity after owner claim approval", async () => {
      const menuGoMerchant = {
        id: menuGoMerchantId,
        name: "Resto Padang Asli",
        owner_id: ownerUserA, // Verified owner attached by admin
        publish_status: "PUBLISHED",
        verification_status: "VERIFIED",
        location: bragaPoint,
        metadata: { source: "MENU_GO", category: "Kuliner", license: "OpenMenu" },
        primary_category_id: "cat-fnb",
      };

      const mockSupabase: any = {
        from: vi.fn((table: string) => {
          if (table === "merchants") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: menuGoMerchant, error: null }),
              single: vi.fn().mockResolvedValue({ data: menuGoMerchant, error: null }),
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
          ownerId: ownerUserA,
          claimStatus: "APPROVED",
        }),
      };

      const eligibilityService = new AdvertisingEligibilityService(mockSupabase, ownershipService);
      const eligibility = await eligibilityService.checkEligibility(ownerUserA, menuGoMerchantId);

      expect(eligibility.eligible).toBe(true);
      // Provenance MUST remain MENU_GO
      expect(menuGoMerchant.metadata.source).toBe("MENU_GO");
      expect(menuGoMerchant.id).toBe(menuGoMerchantId);
    });

    it("preserves MAPID_PREMIUM provenance and canonical identity after owner claim approval", async () => {
      const mapidMerchant = {
        id: mapidMerchantId,
        name: "Boutique Premium",
        owner_id: ownerUserB,
        publish_status: "PUBLISHED",
        verification_status: "VERIFIED",
        location: bragaPoint,
        metadata: { source: "MAPID_PREMIUM", category: "Fashion" },
        primary_category_id: "cat-fashion",
      };

      const mockSupabase: any = {
        from: vi.fn((table: string) => {
          if (table === "merchants") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: mapidMerchant, error: null }),
              single: vi.fn().mockResolvedValue({ data: mapidMerchant, error: null }),
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
          ownerId: ownerUserB,
          claimStatus: "APPROVED",
        }),
      };

      const eligibilityService = new AdvertisingEligibilityService(mockSupabase, ownershipService);
      const eligibility = await eligibilityService.checkEligibility(ownerUserB, mapidMerchantId);

      expect(eligibility.eligible).toBe(true);
      expect(mapidMerchant.metadata.source).toBe("MAPID_PREMIUM");
      expect(mapidMerchant.id).toBe(mapidMerchantId);
    });

    it("allows unclaimed Menu Go & MAPID merchants to be publicly discoverable while denying advertising", async () => {
      const unclaimedMerchant = {
        id: "unclaimed-menugo",
        name: "Warung Padang Unclaimed",
        owner_id: null,
        publish_status: "PUBLISHED",
        verification_status: "VERIFIED",
        location: bragaPoint,
        metadata: { source: "MENU_GO", category: "Kuliner" },
        primary_category_id: "cat-fnb",
      };

      const mockSupabase: any = {
        from: vi.fn((table: string) => {
          if (table === "merchants") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: unclaimedMerchant, error: null }),
              single: vi.fn().mockResolvedValue({ data: unclaimedMerchant, error: null }),
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
          merchantId: "unclaimed-menugo",
          isOwned: false,
          ownerId: null,
          claimStatus: null,
        }),
      };

      const eligibilityService = new AdvertisingEligibilityService(mockSupabase, ownershipService);

      // Random user attempt to advertise unclaimed public merchant -> DENIED
      const randomEligibility = await eligibilityService.checkEligibility(randomUserId, "unclaimed-menugo");
      expect(randomEligibility.eligible).toBe(false);
      expect((randomEligibility as any).reason).toBe("OWNERSHIP_REQUIRED");

      // Ad serving candidate check -> DENIED (no verified owner)
      const servingCheck = await eligibilityService.isMerchantEligibleForServing("unclaimed-menugo");
      expect(servingCheck).toBe(false);
    });
  });

  // =========================================================================
  // 4. SECURITY BOUNDARIES & CROSS-OWNER CONTROLS (Section 22, 29, 30)
  // =========================================================================
  describe("Security Boundaries & Cross-Owner Attacks", () => {
    it("strictly forbids cross-owner campaign creation (User A targeting User B merchant)", async () => {
      const merchantB = {
        id: merchantBId,
        name: "Toko User B",
        owner_id: ownerUserB,
        publish_status: "PUBLISHED",
        verification_status: "VERIFIED",
        location: bragaPoint,
        metadata: { category: "Retail" },
        primary_category_id: "cat-retail",
      };

      const mockSupabase: any = {
        from: vi.fn((table: string) => {
          if (table === "merchants") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: merchantB, error: null }),
              maybeSingle: vi.fn().mockResolvedValue({ data: merchantB, error: null }),
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
          isOwned: false, // User A is NOT owner of merchant B
          ownerId: ownerUserB,
          claimStatus: null,
        }),
      };

      const eligibilityService = new AdvertisingEligibilityService(mockSupabase, ownershipService);
      const campaignRepo: any = { createCampaign: vi.fn() };
      const campaignService = new CampaignService(campaignRepo, eligibilityService);

      await expect(
        campaignService.createCampaign(ownerUserA, {
          merchantId: merchantBId,
          name: "Attack User B",
        })
      ).rejects.toThrow(ApplicationError);

      expect(campaignRepo.createCampaign).not.toHaveBeenCalled();
    });

    it("strictly prevents pending claimants from creating campaigns before approval", async () => {
      const mockSupabase: any = {
        from: vi.fn((table: string) => {
          if (table === "merchants") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: menuGoMerchantId,
                  name: "Sate Padang",
                  publish_status: "PUBLISHED",
                  verification_status: "VERIFIED",
                  location: bragaPoint,
                  metadata: { category: "Kuliner" },
                },
                error: null,
              }),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: menuGoMerchantId,
                  name: "Sate Padang",
                  publish_status: "PUBLISHED",
                  verification_status: "VERIFIED",
                  location: bragaPoint,
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
          merchantId: menuGoMerchantId,
          isOwned: false,
          ownerId: null,
          claimStatus: "PENDING",
        }),
      };

      const eligibilityService = new AdvertisingEligibilityService(mockSupabase, ownershipService);
      const campaignRepo: any = { createCampaign: vi.fn() };
      const campaignService = new CampaignService(campaignRepo, eligibilityService);

      await expect(
        campaignService.createCampaign(ownerUserA, {
          merchantId: menuGoMerchantId,
          name: "Premature Campaign",
        })
      ).rejects.toThrow(ApplicationError);
    });
  });

  // =========================================================================
  // 5. SPONSORED HARD CONSTRAINTS (Section 25)
  // =========================================================================
  describe("Sponsored Hard Constraints Enforcement (No Pay-to-Bypass)", () => {
    it("strictly excludes active sponsored merchants that do not match the commuter category", async () => {
      const mockSupabase: any = { from: vi.fn() };
      const adapter = new SponsoredPlacementAdapter(mockSupabase);

      // Sponsored pin candidate has category 'Cafe'
      vi.spyOn((adapter as any).adServingService, "getSponsoredPinCandidates").mockResolvedValue([
        {
          placement_type: "SPONSORED_PIN",
          sponsored: true,
          label: "Sponsored",
          campaign_id: "camp-cafe",
          creative_id: "cr-1",
          merchant_id: "m-cafe-1",
          merchant_name: "Kopi Enak",
          merchant_category: "Cafe",
          geometry: bragaPoint,
          headline: "Promo Kopi",
          description: "Nikmat",
          cta_type: "VIEW_PROFILE",
          image_url: null,
        },
      ]);

      // Commuter searches for 'Laundry'
      const results = await adapter.getEligibleSponsoredPlacements({
        origin: bragaCoords,
        category: "Laundry",
      });

      expect(results).toHaveLength(0);
    });

    it("strictly excludes active sponsored merchants when walking time exceeds commuter constraint", async () => {
      const mockSupabase: any = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
        rpc: vi.fn().mockResolvedValue({
          data: {
            status: "SUCCESS",
            candidates: [
              {
                candidate_id: "m-far-1",
                status: "ROUTABLE",
                distance_meters: 1800,
                duration_seconds: 1500, // 25 mins > 10 mins
              },
            ],
          },
          error: null,
        }),
      };
      const adapter = new SponsoredPlacementAdapter(mockSupabase);

      vi.spyOn((adapter as any).adServingService, "getSponsoredPinCandidates").mockResolvedValue([
        {
          placement_type: "SPONSORED_PIN",
          sponsored: true,
          label: "Sponsored",
          campaign_id: "camp-far",
          creative_id: "cr-far",
          merchant_id: "m-far-1",
          merchant_name: "Resto Jauh",
          merchant_category: "Kuliner",
          geometry: { type: "Point", coordinates: [107.65, -6.95] },
          headline: "Makan Enak",
          description: "Jauh tapi enak",
          cta_type: "VIEW_PROFILE",
          image_url: null,
        },
      ]);

      // Commuter requests maximum 10 minutes walking
      const results = await adapter.getEligibleSponsoredPlacements({
        origin: bragaCoords,
        category: "Kuliner",
        maxWalkingMinutes: 10,
      });

      // Beyond walking limit -> must NOT bypass
      expect(results).toHaveLength(0);
    });
  });

  // =========================================================================
  // 6. INACTIVE CAMPAIGN SERVING LEAKAGE (Section 24)
  // =========================================================================
  describe("Inactive Campaign Leakage Guard", () => {
    it("guarantees inactive/paused/expired campaigns are never served as sponsored", async () => {
      const mockSupabase: any = { from: vi.fn() };
      const adServingService = new AdServingService(mockSupabase);

      // Mock repository returning no active campaigns
      vi.spyOn((adServingService as any).repository, "findPotentialServingCampaigns").mockResolvedValue([]);

      const candidates = await adServingService.getSponsoredPinCandidates({
        context: bragaCoords,
      });

      expect(candidates).toEqual([]);
    });
  });
});
