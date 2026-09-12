/**
 * GETRA PHASE 15 — Fair Discovery + Hidden Gem + Sponsored Disclosure
 *
 * Tests the complete Fair Discovery pipeline:
 * 1. Hard constraints applied BEFORE fairness classification
 * 2. Original / Hidden Gem / Sponsored result partitioning
 * 3. Sponsored eligibility bypass prevention (NO_PAY_TO_BYPASS)
 * 4. Canonical deduplication (same merchant cannot appear in multiple buckets)
 * 5. Routing readiness for all result types
 * 6. Constraint integrity: category, open-now, walking, radius
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { FairDiscoveryCompositionService } from "@/src/features/fair-discovery/services/fair-discovery-composition.service";
import { SponsoredPlacementAdapter } from "@/src/features/fair-discovery/integrations/sponsored-placement.adapter";
import { CommuterNetworkRepository } from "@/src/features/commuter";
import { SponsoredPinDTO } from "@/src/features/umkm-advertising";
import { GeoPoint } from "@/src/features/fair-discovery/types/fair-discovery.types";
import {
  HIDDEN_GEM_MIN_DATA_QUALITY_SCORE,
  MAX_SPONSORED_RESULTS_PER_DISCOVERY,
} from "@/src/features/fair-discovery/constants/fair-discovery.constants";

// ─── Constants ────────────────────────────────────────────────────────────────

const ORIGIN: GeoPoint = { longitude: 107.6, latitude: -6.91 };

// Opening hours payload that evaluates to OPEN at any arbitrary 'now'
// We control 'now' in tests to avoid flakiness.
const OPENING_HOURS_ALWAYS_OPEN = {
  monday: { open: "00:00", close: "23:59" },
  tuesday: { open: "00:00", close: "23:59" },
  wednesday: { open: "00:00", close: "23:59" },
  thursday: { open: "00:00", close: "23:59" },
  friday: { open: "00:00", close: "23:59" },
  saturday: { open: "00:00", close: "23:59" },
  sunday: { open: "00:00", close: "23:59" },
};

// ─── Merchant fixtures ─────────────────────────────────────────────────────────

/**
 * Merchant A — eligible: within radius, high data_quality_score (Hidden Gem candidate)
 */
const MERCHANT_A = {
  id: "p15-merchant-a",
  name: "Warung Kopi Tersembunyi",
  address: "Jl. Tersembunyi 1",
  description: "Kopi lokal nikmat, jarang diketahui",
  location: JSON.stringify({ type: "Point", coordinates: [107.601, -6.911] }), // ~130m
  primary_category_id: "KOPI",
  data_quality_score: HIDDEN_GEM_MIN_DATA_QUALITY_SCORE + 5, // Hidden Gem
  price_level: "CHEAP",
  opening_hours: OPENING_HOURS_ALWAYS_OPEN,
  publish_status: "PUBLISHED",
  verification_status: "VERIFIED",
};

/**
 * Merchant B — eligible: normal data quality (Original result)
 */
const MERCHANT_B = {
  id: "p15-merchant-b",
  name: "Nasi Uduk Pak Budi",
  address: "Jl. Pasar 5",
  description: "Nasi uduk murah meriah",
  location: JSON.stringify({ type: "Point", coordinates: [107.603, -6.913] }), // ~400m
  primary_category_id: "MAKANAN",
  data_quality_score: 55,
  price_level: "CHEAP",
  opening_hours: OPENING_HOURS_ALWAYS_OPEN,
  publish_status: "PUBLISHED",
  verification_status: "VERIFIED",
};

/**
 * Merchant C — FAILS budget (no direct budget field in merchant model — price_level proxy only)
 * Used here to verify a RETAIL merchant is excluded from KOPI category searches.
 */
const MERCHANT_C = {
  id: "p15-merchant-c",
  name: "Toko Elektronik Mahal",
  address: "Jl. Elektronik 9",
  description: "Gadget dan elektronik",
  location: JSON.stringify({ type: "Point", coordinates: [107.604, -6.914] }), // ~600m
  primary_category_id: "ELEKTRONIK",
  data_quality_score: 60,
  price_level: "EXPENSIVE",
  opening_hours: OPENING_HOURS_ALWAYS_OPEN,
  publish_status: "PUBLISHED",
  verification_status: "VERIFIED",
};

/**
 * Merchant D — FAILS open-now constraint (no opening hours)
 */
const MERCHANT_D = {
  id: "p15-merchant-d",
  name: "Warung Tutup Pak Dodi",
  address: "Jl. Tutup 2",
  description: "Warung makan",
  location: JSON.stringify({ type: "Point", coordinates: [107.602, -6.912] }), // ~250m
  primary_category_id: "MAKANAN",
  data_quality_score: 65,
  price_level: "CHEAP",
  opening_hours: null, // unknown hours — evaluateOpeningHours returns UNKNOWN → excluded by openNow
  publish_status: "PUBLISHED",
  verification_status: "VERIFIED",
};

// Sponsored fixture (eligible merchant with paid promotion)
const ELIGIBLE_SPONSORED: SponsoredPinDTO = {
  placement_type: "SPONSORED_PIN",
  sponsored: true,
  label: "Sponsored",
  campaign_id: "p15-campaign-1",
  creative_id: "p15-creative-1",
  merchant_id: "p15-sponsored-merchant",
  merchant_name: "Kopi Sponsor Eligible",
  merchant_category: "KOPI",
  headline: "Promo Kopi Pagi",
  description: "Kopi segar diskon 20%",
  image_url: "https://example.com/kopi.jpg",
  cta_type: "REQUEST_ROUTE",
  geometry: { type: "Point", coordinates: [107.602, -6.912] },
};

// Sponsored that shares canonical ID with MERCHANT_B (deduplication test)
const DUPLICATE_SPONSORED: SponsoredPinDTO = {
  ...ELIGIBLE_SPONSORED,
  merchant_id: "p15-merchant-b",
  campaign_id: "p15-campaign-dup",
};

// ─── Mock helpers ──────────────────────────────────────────────────────────────

function makeMockSupabase(merchants: any[]) {
  return {
    from: vi.fn((table: string) => {
      if (table === "merchants") {
        return {
          select: vi.fn().mockReturnValue({
            not: vi.fn().mockResolvedValue({ data: merchants, error: null }),
          }),
        };
      }
      if (table === "ad_campaigns") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    }),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Phase 15 — Fair Discovery Pipeline", () => {
  let supabase: any;
  let service: FairDiscoveryCompositionService;

  beforeEach(() => {
    supabase = makeMockSupabase([MERCHANT_A, MERCHANT_B, MERCHANT_C, MERCHANT_D]);
    service = new FairDiscoveryCompositionService(supabase);
    vi.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 1: HARD CONSTRAINTS BEFORE FAIRNESS
  // ─────────────────────────────────────────────────────────────────────────────

  describe("HARD CONSTRAINTS BEFORE FAIRNESS", () => {
    it("category constraint excludes non-matching merchants from all result buckets", async () => {
      vi.spyOn(SponsoredPlacementAdapter.prototype, "getEligibleSponsoredPlacements").mockResolvedValue([]);

      const result = await service.discover({
        origin: ORIGIN,
        radiusMeters: 5000,
        category: "KOPI",
      });

      const allIds = [
        ...result.original.map((m) => m.id),
        ...result.hidden_gems.map((m) => m.id),
      ];

      // MERCHANT_C (ELEKTRONIK), MERCHANT_B (MAKANAN), MERCHANT_D (MAKANAN) must be excluded
      expect(allIds).not.toContain("p15-merchant-c");
      expect(allIds).not.toContain("p15-merchant-b");
      expect(allIds).not.toContain("p15-merchant-d");

      // Only MERCHANT_A (KOPI) should pass
      expect(allIds).toContain("p15-merchant-a");
    });

    it("open-now constraint excludes merchants with null opening hours", async () => {
      vi.spyOn(SponsoredPlacementAdapter.prototype, "getEligibleSponsoredPlacements").mockResolvedValue([]);

      const result = await service.discover({
        origin: ORIGIN,
        radiusMeters: 5000,
        openNow: true,
      });

      const allIds = [
        ...result.original.map((m) => m.id),
        ...result.hidden_gems.map((m) => m.id),
      ];

      // MERCHANT_D has null opening_hours → evaluates to UNKNOWN → excluded by openNow
      expect(allIds).not.toContain("p15-merchant-d");
    });

    it("radius constraint excludes merchants beyond specified radius", async () => {
      vi.spyOn(SponsoredPlacementAdapter.prototype, "getEligibleSponsoredPlacements").mockResolvedValue([]);

      // Radius = 200m → only MERCHANT_A (~130m) should be included
      const result = await service.discover({
        origin: ORIGIN,
        radiusMeters: 200,
      });

      const allIds = [
        ...result.original.map((m) => m.id),
        ...result.hidden_gems.map((m) => m.id),
      ];

      expect(allIds).toContain("p15-merchant-a");
      // B (~400m), C (~600m), D (~250m) are beyond 200m
      expect(allIds).not.toContain("p15-merchant-b");
      expect(allIds).not.toContain("p15-merchant-c");
      expect(allIds).not.toContain("p15-merchant-d");
    });

    it("walking time constraint uses network backend, not frontend Haversine", async () => {
      vi.spyOn(SponsoredPlacementAdapter.prototype, "getEligibleSponsoredPlacements").mockResolvedValue([]);

      // Mock walking cost: A = 8 min (passes 10min limit), B = 15 min (fails), D = UNROUTABLE
      vi.spyOn(CommuterNetworkRepository.prototype, "walkingCosts").mockResolvedValue({
        status: "READY",
        candidates: [
          {
            candidate_id: "p15-merchant-a",
            status: "ROUTABLE",
            duration_seconds: 8 * 60,
            distance_meters: 650,
            network_distance_meters: 620,
            access_distance_meters: 30,
            destination_node_id: 101,
          },
          {
            candidate_id: "p15-merchant-b",
            status: "ROUTABLE",
            duration_seconds: 15 * 60,
            distance_meters: 1200,
            network_distance_meters: 1150,
            access_distance_meters: 50,
            destination_node_id: 102,
          },
          {
            candidate_id: "p15-merchant-c",
            status: "UNROUTABLE",
            duration_seconds: null,
            distance_meters: null,
            network_distance_meters: null,
            access_distance_meters: null,
            destination_node_id: null,
          },
          {
            candidate_id: "p15-merchant-d",
            status: "NO_NETWORK_ACCESS",
            duration_seconds: null,
            distance_meters: null,
            network_distance_meters: null,
            access_distance_meters: null,
            destination_node_id: null,
          },
        ],
      });

      const result = await service.discover({
        origin: ORIGIN,
        radiusMeters: 5000,
        maxWalkingMinutes: 10,
      });

      const allIds = [
        ...result.original.map((m) => m.id),
        ...result.hidden_gems.map((m) => m.id),
      ];

      // Only MERCHANT_A with 8 min passes the 10 min limit
      expect(allIds).toContain("p15-merchant-a");
      expect(allIds).not.toContain("p15-merchant-b");
      expect(allIds).not.toContain("p15-merchant-c");
      expect(allIds).not.toContain("p15-merchant-d");

      // Verify walking time is sourced from BACKEND NETWORK (8 min), not computed frontend
      const gemOrOriginal = [...result.hidden_gems, ...result.original].find(
        (m) => m.id === "p15-merchant-a"
      );
      expect(gemOrOriginal?.walking_minutes).toBe(8);
    });

    it("walking minutes value is null when no walking constraint is active (no fabrication)", async () => {
      vi.spyOn(SponsoredPlacementAdapter.prototype, "getEligibleSponsoredPlacements").mockResolvedValue([]);

      const result = await service.discover({
        origin: ORIGIN,
        radiusMeters: 5000,
        // maxWalkingMinutes intentionally omitted
      });

      const allMerchants = [...result.original, ...result.hidden_gems];
      // No straight-line walking time should be fabricated
      expect(allMerchants.every((m) => m.walking_minutes === null)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 2: ORIGINAL RESULTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe("ORIGINAL RESULTS", () => {
    it("returns eligible merchants as Original when they don't meet Hidden Gem threshold", async () => {
      vi.spyOn(SponsoredPlacementAdapter.prototype, "getEligibleSponsoredPlacements").mockResolvedValue([]);

      const result = await service.discover({ origin: ORIGIN, radiusMeters: 5000 });

      // MERCHANT_B has data_quality_score=55 < 80 threshold → Original
      const originalIds = result.original.map((m) => m.id);
      expect(originalIds).toContain("p15-merchant-b");
    });

    it("Original results are ordered by ascending distance (proximity ranking)", async () => {
      vi.spyOn(SponsoredPlacementAdapter.prototype, "getEligibleSponsoredPlacements").mockResolvedValue([]);

      const result = await service.discover({ origin: ORIGIN, radiusMeters: 5000 });

      const distances = result.original.map((m) => m.distance_meters);
      for (let i = 1; i < distances.length; i++) {
        expect(distances[i]).toBeGreaterThanOrEqual(distances[i - 1]);
      }
    });

    it("Original merchants have valid canonical coordinates in geometry", async () => {
      vi.spyOn(SponsoredPlacementAdapter.prototype, "getEligibleSponsoredPlacements").mockResolvedValue([]);

      const result = await service.discover({ origin: ORIGIN, radiusMeters: 5000 });

      for (const m of result.original) {
        expect(m.geometry.type).toBe("Point");
        expect(m.geometry.coordinates).toHaveLength(2);
        expect(typeof m.geometry.coordinates[0]).toBe("number"); // longitude
        expect(typeof m.geometry.coordinates[1]).toBe("number"); // latitude
        expect(Number.isFinite(m.geometry.coordinates[0])).toBe(true);
        expect(Number.isFinite(m.geometry.coordinates[1])).toBe(true);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 3: HIDDEN GEM
  // ─────────────────────────────────────────────────────────────────────────────

  describe("HIDDEN GEM", () => {
    it("classifies merchant as Hidden Gem when data_quality_score >= threshold", async () => {
      vi.spyOn(SponsoredPlacementAdapter.prototype, "getEligibleSponsoredPlacements").mockResolvedValue([]);

      const result = await service.discover({ origin: ORIGIN, radiusMeters: 5000 });

      // MERCHANT_A has score = HIDDEN_GEM_MIN_DATA_QUALITY_SCORE + 5 → must be Hidden Gem
      expect(result.hidden_gems.map((m) => m.id)).toContain("p15-merchant-a");
      const gem = result.hidden_gems.find((m) => m.id === "p15-merchant-a");
      expect(gem?.hidden_gem).toBe(true);
      expect(gem?.gem_badge).toBe("HIDDEN_GEM");
    });

    it("Hidden Gem must still satisfy all hard constraints — eligible merchant only", async () => {
      vi.spyOn(SponsoredPlacementAdapter.prototype, "getEligibleSponsoredPlacements").mockResolvedValue([]);

      // Request only KOPI category — MERCHANT_A is KOPI so should remain a Hidden Gem
      const result = await service.discover({
        origin: ORIGIN,
        radiusMeters: 5000,
        category: "KOPI",
      });

      expect(result.hidden_gems.map((m) => m.id)).toContain("p15-merchant-a");
    });

    it("Hidden Gem is excluded when it fails category constraint", async () => {
      vi.spyOn(SponsoredPlacementAdapter.prototype, "getEligibleSponsoredPlacements").mockResolvedValue([]);

      // Request MAKANAN — MERCHANT_A is KOPI, should be excluded
      const result = await service.discover({
        origin: ORIGIN,
        radiusMeters: 5000,
        category: "MAKANAN",
      });

      expect(result.hidden_gems.map((m) => m.id)).not.toContain("p15-merchant-a");
    });

    it("Hidden Gem is excluded when it fails walking constraint", async () => {
      vi.spyOn(SponsoredPlacementAdapter.prototype, "getEligibleSponsoredPlacements").mockResolvedValue([]);

      // MERCHANT_A exceeds walking limit in this scenario
      vi.spyOn(CommuterNetworkRepository.prototype, "walkingCosts").mockResolvedValue({
        status: "READY",
        candidates: [
          {
            candidate_id: "p15-merchant-a",
            status: "ROUTABLE",
            duration_seconds: 20 * 60, // 20 min — fails 5 min limit
            distance_meters: 1600,
            network_distance_meters: 1550,
            access_distance_meters: 50,
            destination_node_id: 201,
          },
        ],
      });

      const result = await service.discover({
        origin: ORIGIN,
        radiusMeters: 5000,
        maxWalkingMinutes: 5,
      });

      expect(result.hidden_gems.map((m) => m.id)).not.toContain("p15-merchant-a");
    });

    it("Hidden Gem merchant cannot appear in Original simultaneously (no dual appearance)", async () => {
      vi.spyOn(SponsoredPlacementAdapter.prototype, "getEligibleSponsoredPlacements").mockResolvedValue([]);

      const result = await service.discover({ origin: ORIGIN, radiusMeters: 5000 });

      const gemIds = new Set(result.hidden_gems.map((m) => m.id));
      const originalIds = result.original.map((m) => m.id);

      // No Hidden Gem ID should appear in Original
      for (const id of originalIds) {
        expect(gemIds.has(id)).toBe(false);
      }
    });

    it("Hidden Gem has valid canonical coordinates for routing", async () => {
      vi.spyOn(SponsoredPlacementAdapter.prototype, "getEligibleSponsoredPlacements").mockResolvedValue([]);

      const result = await service.discover({ origin: ORIGIN, radiusMeters: 5000 });

      for (const gem of result.hidden_gems) {
        expect(gem.geometry.type).toBe("Point");
        expect(gem.geometry.coordinates).toHaveLength(2);
        expect(Number.isFinite(gem.geometry.coordinates[0])).toBe(true);
        expect(Number.isFinite(gem.geometry.coordinates[1])).toBe(true);
        // id must be present for unified routing destination
        expect(typeof gem.id).toBe("string");
        expect(gem.id.length).toBeGreaterThan(0);
      }
    });

    it("Hidden Gem gem_reason is a truthful non-fabricated label (no unsupported claims)", async () => {
      vi.spyOn(SponsoredPlacementAdapter.prototype, "getEligibleSponsoredPlacements").mockResolvedValue([]);

      const result = await service.discover({ origin: ORIGIN, radiusMeters: 5000 });

      for (const gem of result.hidden_gems) {
        // Must have a reason
        expect(typeof gem.gem_reason).toBe("string");
        expect(gem.gem_reason.length).toBeGreaterThan(0);

        // Must NOT contain unsupported superlative AI claims
        const forbidden = ["terbaik", "paling populer", "recommended by users", "top rated"];
        for (const term of forbidden) {
          expect(gem.gem_reason.toLowerCase()).not.toContain(term);
        }
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 4: SPONSORED — ELIGIBILITY BYPASS PREVENTION
  // ─────────────────────────────────────────────────────────────────────────────

  describe("SPONSORED — NO_PAY_TO_BYPASS", () => {
    it("sponsored result is disclosed with label field (transparent disclosure)", async () => {
      vi.spyOn(SponsoredPlacementAdapter.prototype, "getEligibleSponsoredPlacements").mockResolvedValue([
        ELIGIBLE_SPONSORED,
      ]);

      const result = await service.discover({ origin: ORIGIN, radiusMeters: 5000 });

      expect(result.sponsored).toHaveLength(1);
      // Must carry sponsored=true and a disclosure label
      expect(result.sponsored[0].sponsored).toBe(true);
      expect(result.sponsored[0].label).toBeTruthy();
    });

    it("sponsored result is capped at MAX_SPONSORED_RESULTS_PER_DISCOVERY", async () => {
      const manyCandidates = Array.from({ length: 10 }, (_, i) => ({
        ...ELIGIBLE_SPONSORED,
        campaign_id: `campaign-${i}`,
      }));

      vi.spyOn(SponsoredPlacementAdapter.prototype, "getEligibleSponsoredPlacements").mockResolvedValue(
        manyCandidates
      );

      const result = await service.discover({ origin: ORIGIN, radiusMeters: 5000 });

      expect(result.sponsored.length).toBeLessThanOrEqual(MAX_SPONSORED_RESULTS_PER_DISCOVERY);
    });

    it("sponsored result fails category constraint → not surfaced (NO_PAY_TO_BYPASS)", async () => {
      // Use the real SponsoredPlacementAdapter with a stubbed ad-serving source
      const adapterMock = new SponsoredPlacementAdapter(supabase);
      vi.spyOn((adapterMock as any).adServingService, "getSponsoredPinCandidates").mockResolvedValue([
        {
          ...ELIGIBLE_SPONSORED,
          merchant_category: "FASHION", // category mismatch with user query
          merchant_name: "Toko Baju Trendy",
          headline: "Diskon baju 50%", // no kopi mention
          description: "Baju murah dan modis", // no kopi mention
        },
      ]);

      const eligible = await adapterMock.getEligibleSponsoredPlacements(
        {
          origin: ORIGIN,
          category: "KOPI", // User searched for KOPI
        },
        new Date()
      );

      // FASHION sponsored must NOT bypass KOPI category constraint
      expect(eligible).toHaveLength(0);
    });

    it("sponsored result fails walking constraint → not surfaced (NO_PAY_TO_BYPASS)", async () => {
      const adapterMock = new SponsoredPlacementAdapter(supabase);
      vi.spyOn((adapterMock as any).adServingService, "getSponsoredPinCandidates").mockResolvedValue([
        ELIGIBLE_SPONSORED,
      ]);

      // Walking cost exceeds limit
      vi.spyOn(CommuterNetworkRepository.prototype, "walkingCosts").mockResolvedValue({
        status: "READY",
        candidates: [
          {
            candidate_id: ELIGIBLE_SPONSORED.merchant_id,
            status: "ROUTABLE",
            duration_seconds: 25 * 60, // 25 min — exceeds 10 min limit
            distance_meters: 2000,
            network_distance_meters: 1900,
            access_distance_meters: 100,
            destination_node_id: 301,
          },
        ],
      });

      const eligible = await adapterMock.getEligibleSponsoredPlacements(
        {
          origin: ORIGIN,
          maxWalkingMinutes: 10,
        },
        new Date()
      );

      // Sponsored must fail walking constraint — cannot bypass
      expect(eligible).toHaveLength(0);
    });

    it("inactive/non-eligible sponsored merchant is not surfaced when Ad Serving returns nothing", async () => {
      vi.spyOn(SponsoredPlacementAdapter.prototype, "getEligibleSponsoredPlacements").mockResolvedValue([]);

      const result = await service.discover({ origin: ORIGIN, radiusMeters: 5000 });

      expect(result.sponsored).toHaveLength(0);
      expect(result.metadata.sponsored_available).toBe(false);
    });

    it("ad serving failure is isolated — organic discovery remains unaffected", async () => {
      vi.spyOn(SponsoredPlacementAdapter.prototype, "getEligibleSponsoredPlacements").mockRejectedValue(
        new Error("Ad serving connection timeout")
      );

      const result = await service.discover({ origin: ORIGIN, radiusMeters: 5000 });

      // Organic results must not be affected
      expect(result.original.length + result.hidden_gems.length).toBeGreaterThan(0);
      expect(result.sponsored).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 5: CANONICAL DEDUPLICATION
  // ─────────────────────────────────────────────────────────────────────────────

  describe("CANONICAL DEDUPLICATION", () => {
    it("same canonical merchant_id cannot appear in both Sponsored and Original simultaneously", async () => {
      vi.spyOn(SponsoredPlacementAdapter.prototype, "getEligibleSponsoredPlacements").mockResolvedValue([
        DUPLICATE_SPONSORED, // merchant_id = "p15-merchant-b"
      ]);

      const result = await service.discover({ origin: ORIGIN, radiusMeters: 5000 });

      const originalIds = result.original.map((m) => m.id);
      const sponsoredMerchantIds = result.sponsored.map((s) => s.merchant_id);

      // merchant-b appears as sponsored → must be removed from organic original
      for (const sponsoredId of sponsoredMerchantIds) {
        expect(originalIds).not.toContain(sponsoredId);
      }
    });

    it("same canonical merchant_id cannot appear in both Sponsored and Hidden Gem simultaneously", async () => {
      // Use MERCHANT_A's id in sponsored duplicate (MERCHANT_A has high quality score → would be Hidden Gem)
      const duplicateSponsoredGem: SponsoredPinDTO = {
        ...ELIGIBLE_SPONSORED,
        merchant_id: "p15-merchant-a",
        campaign_id: "p15-campaign-gem-dup",
      };

      vi.spyOn(SponsoredPlacementAdapter.prototype, "getEligibleSponsoredPlacements").mockResolvedValue([
        duplicateSponsoredGem,
      ]);

      const result = await service.discover({ origin: ORIGIN, radiusMeters: 5000 });

      const hiddenGemIds = result.hidden_gems.map((m) => m.id);
      const sponsoredMerchantIds = result.sponsored.map((s) => s.merchant_id);

      // merchant-a appears as sponsored → must be removed from hidden gems
      for (const sponsoredId of sponsoredMerchantIds) {
        expect(hiddenGemIds).not.toContain(sponsoredId);
      }
    });

    it("metadata totals correctly reflect deduplicated result counts", async () => {
      vi.spyOn(SponsoredPlacementAdapter.prototype, "getEligibleSponsoredPlacements").mockResolvedValue([
        ELIGIBLE_SPONSORED,
      ]);

      const result = await service.discover({ origin: ORIGIN, radiusMeters: 5000 });

      expect(result.metadata.total_original).toBe(result.original.length);
      expect(result.metadata.total_hidden_gems).toBe(result.hidden_gems.length);
      expect(result.metadata.total_sponsored).toBe(result.sponsored.length);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 6: ROUTING READINESS (Phase 14 integration)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("ROUTING READINESS — Phase 14 Unified Destination", () => {
    it("Original merchant has canonical id + coordinates for route request", async () => {
      vi.spyOn(SponsoredPlacementAdapter.prototype, "getEligibleSponsoredPlacements").mockResolvedValue([]);

      const result = await service.discover({ origin: ORIGIN, radiusMeters: 5000 });

      for (const merchant of result.original) {
        expect(merchant.id).toBeTruthy();
        expect(merchant.geometry.coordinates[0]).toBeGreaterThan(-180);
        expect(merchant.geometry.coordinates[1]).toBeGreaterThan(-90);
      }
    });

    it("Hidden Gem merchant has canonical id + coordinates for route request", async () => {
      vi.spyOn(SponsoredPlacementAdapter.prototype, "getEligibleSponsoredPlacements").mockResolvedValue([]);

      const result = await service.discover({ origin: ORIGIN, radiusMeters: 5000 });

      for (const gem of result.hidden_gems) {
        expect(gem.id).toBeTruthy();
        expect(gem.geometry.type).toBe("Point");
        expect(Number.isFinite(gem.geometry.coordinates[0])).toBe(true);
        expect(Number.isFinite(gem.geometry.coordinates[1])).toBe(true);
      }
    });

    it("Sponsored placement has merchant_id + coordinates for route request", async () => {
      vi.spyOn(SponsoredPlacementAdapter.prototype, "getEligibleSponsoredPlacements").mockResolvedValue([
        ELIGIBLE_SPONSORED,
      ]);

      const result = await service.discover({ origin: ORIGIN, radiusMeters: 5000 });

      for (const sponsored of result.sponsored) {
        expect(sponsored.merchant_id).toBeTruthy();
        expect(sponsored.geometry.type).toBe("Point");
        expect(Number.isFinite(sponsored.geometry.coordinates[0])).toBe(true);
        expect(Number.isFinite(sponsored.geometry.coordinates[1])).toBe(true);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 7: DETERMINISM
  // ─────────────────────────────────────────────────────────────────────────────

  describe("DETERMINISM", () => {
    it("identical query returns identical result ordering for Original results", async () => {
      vi.spyOn(SponsoredPlacementAdapter.prototype, "getEligibleSponsoredPlacements").mockResolvedValue([]);

      const query = { origin: ORIGIN, radiusMeters: 5000 };
      const [r1, r2] = await Promise.all([service.discover(query), service.discover(query)]);

      expect(r1.original.map((m) => m.id)).toEqual(r2.original.map((m) => m.id));
      expect(r1.hidden_gems.map((m) => m.id)).toEqual(r2.hidden_gems.map((m) => m.id));
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 8: METADATA & QUERY CONTEXT
  // ─────────────────────────────────────────────────────────────────────────────

  describe("METADATA", () => {
    it("metadata reflects origin and constraint context truthfully", async () => {
      vi.spyOn(SponsoredPlacementAdapter.prototype, "getEligibleSponsoredPlacements").mockResolvedValue([]);

      const result = await service.discover({
        origin: ORIGIN,
        radiusMeters: 2500,
        category: "KOPI",
      });

      expect(result.metadata.query_context.origin).toEqual(ORIGIN);
      expect(result.metadata.query_context.radius_meters).toBe(2500);
      expect(result.metadata.query_context.category).toBe("KOPI");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 9: SPONSORED PLACEMENT ADAPTER — CONSTRAINT INTEGRITY
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 15 — SponsoredPlacementAdapter Constraint Integrity", () => {
  let supabase: any;

  beforeEach(() => {
    supabase = makeMockSupabase([]);
    vi.restoreAllMocks();
  });

  it("category synonym matching allows kopi → coffee without bypassing category filter", async () => {
    const adapter = new SponsoredPlacementAdapter(supabase);
    vi.spyOn((adapter as any).adServingService, "getSponsoredPinCandidates").mockResolvedValue([
      {
        ...ELIGIBLE_SPONSORED,
        merchant_category: "coffee", // synonym of kopi
      },
    ]);

    const eligible = await adapter.getEligibleSponsoredPlacements(
      { origin: ORIGIN, category: "kopi" },
      new Date()
    );

    // coffee is a synonym of kopi — should match
    expect(eligible).toHaveLength(1);
  });

  it("sponsored merchant with mismatched query term is excluded", async () => {
    const adapter = new SponsoredPlacementAdapter(supabase);
    vi.spyOn((adapter as any).adServingService, "getSponsoredPinCandidates").mockResolvedValue([
      {
        ...ELIGIBLE_SPONSORED,
        merchant_name: "Toko Roti Bakar",
        merchant_category: "BAKERY",
        headline: "Roti bakar enak",
        description: "Berbagai pilihan roti",
      },
    ]);

    const eligible = await adapter.getEligibleSponsoredPlacements(
      { origin: ORIGIN, query: "ayam goreng" },
      new Date()
    );

    // "ayam goreng" does not match "roti bakar" — excluded
    expect(eligible).toHaveLength(0);
  });
});
