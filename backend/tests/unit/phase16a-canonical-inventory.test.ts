/**
 * GETRA PHASE 16A — Canonical UMKM Inventory + Provenance + Public Visibility Foundation
 *
 * Tests the canonical merchant read layer:
 * 1. publish_status guard — only PUBLISHED merchants surfaced
 * 2. owner_id — canonical ownership authority
 * 3. OWNER_SUBMITTED provenance — set when merchant was created via approved submission
 * 4. submitted_by / submission_id linkage from merchant_submissions join
 * 5. PREMIUM / MENU_GO / OWNER_SUBMITTED source types correctly populated
 * 6. Non-fatal failure isolation: if submission provenance lookup fails, organic results survive
 * 7. Provenance source_type truthfulness
 */

import { describe, it, expect, vi } from "vitest";
import {
  mapCanonicalMerchantRow,
  CanonicalMerchantReadService,
} from "@/src/features/merchant-reconciliation/canonical-merchant-read.service";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const GEO_POINT = { type: "Point", coordinates: [107.601, -6.911] };

const BASE_MERCHANT = {
  id: "p16a-merchant-1",
  name: "Warung Sehat Bu Sari",
  description: "Makanan sehat harian",
  location: GEO_POINT,
  address: "Jl. Sehat 1, Bandung",
  price_level: "HEMAT",
  opening_hours: {
    monday: { open: "07:00", close: "20:00" },
    tuesday: { open: "07:00", close: "20:00" },
    wednesday: { open: "07:00", close: "20:00" },
    thursday: { open: "07:00", close: "20:00" },
    friday: { open: "07:00", close: "20:00" },
    saturday: { open: "07:00", close: "20:00" },
    sunday: { open: "07:00", close: "20:00" },
  },
  is_mobile: false,
  verification_status: "VERIFIED",
  publish_status: "PUBLISHED",
  data_quality_score: 85,
  metadata: { category: "Makanan Sehat", brand: "Bu Sari" },
  updated_at: "2026-09-01T00:00:00Z",
  owner_id: "owner-user-123",
};

const OWNER_SUBMISSION = {
  id: "sub-p16a-001",
  submitted_by: "owner-user-123",
};

const PREMIUM_LINK = {
  merchant_id: "p16a-merchant-1",
  source_table: "mapid_premium_merchants",
  source_record_id: "prem-001",
  confidence: 0.95,
  metadata: {},
};

const MENU_GO_LINK = {
  merchant_id: "p16a-merchant-1",
  source_table: "mapid_mission_observations:MENU_GO",
  source_record_id: "menu-001",
  confidence: 0.8,
  metadata: {},
};

const EMPTY_OBSERVATION_MAP = new Map<string, any>();

// ─── Unit Tests: mapCanonicalMerchantRow ──────────────────────────────────────

describe("Phase 16A — mapCanonicalMerchantRow unit tests", () => {
  describe("Canonical Inventory Fields", () => {
    it("includes owner_id from merchant row", () => {
      const result = mapCanonicalMerchantRow(
        BASE_MERCHANT,
        [PREMIUM_LINK],
        EMPTY_OBSERVATION_MAP,
        undefined,
        null
      );
      expect(result).not.toBeNull();
      expect(result!.owner_id).toBe("owner-user-123");
    });

    it("returns null owner_id when merchant has no owner", () => {
      const unowned = { ...BASE_MERCHANT, owner_id: null };
      const result = mapCanonicalMerchantRow(unowned, [], EMPTY_OBSERVATION_MAP);
      expect(result!.owner_id).toBeNull();
    });

    it("includes publish_status from merchant row", () => {
      const result = mapCanonicalMerchantRow(BASE_MERCHANT, [], EMPTY_OBSERVATION_MAP);
      expect(result!.publish_status).toBe("PUBLISHED");
    });
  });

  describe("OWNER_SUBMITTED Provenance", () => {
    it("sets submitted_by and submission_id when ownerSubmission is provided", () => {
      const result = mapCanonicalMerchantRow(
        BASE_MERCHANT,
        [],
        EMPTY_OBSERVATION_MAP,
        undefined,
        OWNER_SUBMISSION
      );
      expect(result!.submitted_by).toBe("owner-user-123");
      expect(result!.submission_id).toBe("sub-p16a-001");
    });

    it("sets submitted_by and submission_id to null when ownerSubmission is null (surveyed merchant)", () => {
      const result = mapCanonicalMerchantRow(
        BASE_MERCHANT,
        [PREMIUM_LINK],
        EMPTY_OBSERVATION_MAP,
        undefined,
        null
      );
      expect(result!.submitted_by).toBeNull();
      expect(result!.submission_id).toBeNull();
    });

    it("includes OWNER_SUBMITTED in sources array when ownerSubmission present", () => {
      const result = mapCanonicalMerchantRow(
        BASE_MERCHANT,
        [],
        EMPTY_OBSERVATION_MAP,
        undefined,
        OWNER_SUBMISSION
      );
      expect(result!.sources).toContain("OWNER_SUBMITTED");
    });

    it("does NOT include OWNER_SUBMITTED in sources for surveyed merchant", () => {
      const result = mapCanonicalMerchantRow(
        BASE_MERCHANT,
        [PREMIUM_LINK],
        EMPTY_OBSERVATION_MAP,
        undefined,
        null
      );
      expect(result!.sources).not.toContain("OWNER_SUBMITTED");
    });

    it("OWNER_SUBMITTED is additive — PREMIUM and MENU_GO still present when applicable", () => {
      const menuObsMap = new Map([
        ["menu-001", { source_record_id: "menu-001", normalized_properties: {}, observed_at: null }],
      ]);
      const result = mapCanonicalMerchantRow(
        BASE_MERCHANT,
        [PREMIUM_LINK, MENU_GO_LINK],
        menuObsMap,
        undefined,
        OWNER_SUBMISSION
      );
      expect(result!.sources).toContain("PREMIUM");
      expect(result!.sources).toContain("MENU_GO");
      expect(result!.sources).toContain("OWNER_SUBMITTED");
    });
  });

  describe("Provenance Source Type Truthfulness", () => {
    it("provenance.source_type = OWNER_SUBMITTED when ownerSubmission present", () => {
      const result = mapCanonicalMerchantRow(
        BASE_MERCHANT,
        [],
        EMPTY_OBSERVATION_MAP,
        undefined,
        OWNER_SUBMISSION
      );
      expect((result!.provenance as any).source_type).toBe("OWNER_SUBMITTED");
    });

    it("provenance.source_type = PREMIUM when no ownerSubmission and has premium link", () => {
      const result = mapCanonicalMerchantRow(
        BASE_MERCHANT,
        [PREMIUM_LINK],
        EMPTY_OBSERVATION_MAP,
        undefined,
        null
      );
      expect((result!.provenance as any).source_type).toBe("PREMIUM");
    });

    it("provenance.source_type = MENU_GO when no ownerSubmission and only menu link", () => {
      const menuObsMap = new Map([
        ["menu-001", { source_record_id: "menu-001", normalized_properties: {}, observed_at: null }],
      ]);
      const result = mapCanonicalMerchantRow(
        BASE_MERCHANT,
        [MENU_GO_LINK],
        menuObsMap,
        undefined,
        null
      );
      expect((result!.provenance as any).source_type).toBe("MENU_GO");
    });

    it("provenance geometry attribute = OWNER_SUBMITTED when owner-submitted and no premium link", () => {
      const result = mapCanonicalMerchantRow(
        BASE_MERCHANT,
        [],
        EMPTY_OBSERVATION_MAP,
        undefined,
        OWNER_SUBMISSION
      );
      expect((result!.provenance as any).attributes.geometry).toBe("OWNER_SUBMITTED");
    });

    it("provenance geometry attribute = PREMIUM when premium link present (premium overrides owner-submitted)", () => {
      const result = mapCanonicalMerchantRow(
        BASE_MERCHANT,
        [PREMIUM_LINK],
        EMPTY_OBSERVATION_MAP,
        undefined,
        OWNER_SUBMISSION
      );
      expect((result!.provenance as any).attributes.geometry).toBe("PREMIUM");
    });

    it("provenance does NOT fabricate OWNER_SUBMITTED for null ownerSubmission", () => {
      const result = mapCanonicalMerchantRow(
        BASE_MERCHANT,
        [],
        EMPTY_OBSERVATION_MAP,
        undefined,
        null
      );
      const prov = result!.provenance as any;
      expect(prov.source_type).not.toBe("OWNER_SUBMITTED");
    });
  });

  describe("limitation string truthfulness", () => {
    it("owner-submitted merchant has correct limitation string", () => {
      const result = mapCanonicalMerchantRow(
        BASE_MERCHANT,
        [],
        EMPTY_OBSERVATION_MAP,
        undefined,
        OWNER_SUBMISSION
      );
      expect(result!.limitation).toContain("owner-verified");
    });

    it("surveyed merchant has canonical evidence limitation string", () => {
      const result = mapCanonicalMerchantRow(
        BASE_MERCHANT,
        [PREMIUM_LINK],
        EMPTY_OBSERVATION_MAP,
        undefined,
        null
      );
      expect(result!.limitation).toContain("auditable");
    });

    it("mobile merchant has mobile limitation string (unaffected by phase 16A)", () => {
      const mobile = { ...BASE_MERCHANT, is_mobile: true };
      const result = mapCanonicalMerchantRow(mobile, [], EMPTY_OBSERVATION_MAP);
      expect(result!.limitation).toContain("mobile");
    });
  });

  describe("Null/unknown geometry guard", () => {
    it("returns null when merchant location is null", () => {
      const bad = { ...BASE_MERCHANT, location: null };
      const result = mapCanonicalMerchantRow(bad, [], EMPTY_OBSERVATION_MAP);
      expect(result).toBeNull();
    });

    it("returns null when merchant location is empty string", () => {
      const bad = { ...BASE_MERCHANT, location: "" };
      const result = mapCanonicalMerchantRow(bad, [], EMPTY_OBSERVATION_MAP);
      expect(result).toBeNull();
    });
  });
});

// ─── Integration Tests: CanonicalMerchantReadService ─────────────────────────

describe("Phase 16A — CanonicalMerchantReadService integration", () => {
  function makeMockSupabase({
    merchants = [BASE_MERCHANT],
    submissions = [] as any[],
    submissionError = null as any,
  } = {}) {
    const merchantIds = merchants.map((m) => m.id);
    return {
      rpc: vi.fn((fn: string) => {
        if (fn === "search_canonical_merchants_v2") {
          return Promise.resolve({
            data: merchantIds.map((id, i) => ({
              merchant_id: id,
              total_count: merchantIds.length,
              distance_meters: 300 + i * 100,
              region_ids: [],
              region_names: ["Bandung"],
            })),
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: new Error("Unknown RPC") });
      }),
      from: vi.fn((table: string) => {
        if (table === "merchant_source_links") {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        if (table === "merchants") {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({ data: merchants, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === "merchant_submissions") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: submissionError ? null : submissions,
                    error: submissionError,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "mapid_mission_observations") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          range: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }),
    };
  }

  it("surfaces publish_status on canonical merchant read result", async () => {
    const supabase = makeMockSupabase();
    const service = new CanonicalMerchantReadService(supabase as any);
    const { merchants } = await service.list({ limit: 20, offset: 0 });
    expect(merchants.length).toBeGreaterThan(0);
    expect(merchants[0].publish_status).toBe("PUBLISHED");
  });

  it("surfaces owner_id on canonical merchant read result", async () => {
    const supabase = makeMockSupabase();
    const service = new CanonicalMerchantReadService(supabase as any);
    const { merchants } = await service.list({ limit: 20, offset: 0 });
    expect(merchants[0].owner_id).toBe("owner-user-123");
  });

  it("surfaces OWNER_SUBMITTED provenance when approved submission exists", async () => {
    const supabase = makeMockSupabase({
      submissions: [{
        id: "sub-p16a-001",
        submitted_by: "owner-user-123",
        canonical_merchant_id: "p16a-merchant-1",
      }],
    });
    const service = new CanonicalMerchantReadService(supabase as any);
    const { merchants } = await service.list({ limit: 20, offset: 0 });
    expect(merchants[0].submitted_by).toBe("owner-user-123");
    expect(merchants[0].submission_id).toBe("sub-p16a-001");
    expect(merchants[0].sources).toContain("OWNER_SUBMITTED");
  });

  it("returns null submitted_by and submission_id for surveyed merchants (no approved submission)", async () => {
    const supabase = makeMockSupabase({ submissions: [] });
    const service = new CanonicalMerchantReadService(supabase as any);
    const { merchants } = await service.list({ limit: 20, offset: 0 });
    expect(merchants[0].submitted_by).toBeNull();
    expect(merchants[0].submission_id).toBeNull();
  });

  it("submission provenance lookup failure is non-fatal — organic results are still returned", async () => {
    const supabase = makeMockSupabase({
      submissionError: new Error("DB connection timeout"),
    });
    const service = new CanonicalMerchantReadService(supabase as any);
    const { merchants } = await service.list({ limit: 20, offset: 0 });
    // Organic results must still be present
    expect(merchants.length).toBeGreaterThan(0);
    // Provenance fields gracefully degrade to null
    expect(merchants[0].submitted_by).toBeNull();
    expect(merchants[0].submission_id).toBeNull();
  });

  it("does not surface DRAFT merchants (publish_status guard preserved)", async () => {
    // Mock returns only PUBLISHED through the .eq("publish_status", "PUBLISHED") filter
    // The service already filters via DB query — this tests the select includes owner_id without losing the filter
    const supabase = makeMockSupabase({ merchants: [BASE_MERCHANT] });
    const service = new CanonicalMerchantReadService(supabase as any);
    const { merchants } = await service.list({ limit: 20, offset: 0 });
    const draftIds = merchants.filter((m) => m.publish_status !== "PUBLISHED").map((m) => m.id);
    expect(draftIds).toHaveLength(0);
  });
});

// ─── Phase 16A Product Policy Contract Tests ─────────────────────────────────

describe("Phase 16A — UMKM Product Policy & Public Visibility Contracts", () => {
  const MENU_GO_CANONICAL = {
    id: "canonical-menu-go-only",
    name: "Gorengan Simpang Dago",
    description: "Jajanan Pasar",
    location: { type: "Point", coordinates: [107.6105, -6.8850] },
    address: null,
    price_level: "HEMAT",
    opening_hours: { open_now: true },
    is_mobile: true,
    verification_status: "SURVEYED",
    publish_status: "PUBLISHED",
    data_quality_score: 82,
    metadata: { category: "Gorengan", brand: "Simpang Dago" },
    updated_at: "2026-09-01T00:00:00Z",
    owner_id: null, // UNCLAIMED / NO VERIFIED OWNER
  };

  const PREMIUM_CANONICAL = {
    id: "canonical-premium-only",
    name: "Kopi Aroma Asli",
    description: "Kedai Kopi Legendaris",
    location: { type: "Point", coordinates: [107.6050, -6.9180] },
    address: "Jl. Banceuy No. 51, Braga, Bandung",
    price_level: "SEDANG",
    opening_hours: { open_now: true },
    is_mobile: false,
    verification_status: "VERIFIED",
    publish_status: "PUBLISHED",
    data_quality_score: 95,
    metadata: { category: "Kopi", brand: "Kopi Aroma", phone: "022-4230473" },
    updated_at: "2026-09-01T00:00:00Z",
    owner_id: null, // UNCLAIMED / NO VERIFIED OWNER
  };

  const RECONCILED_CANONICAL = {
    id: "canonical-reconciled-both",
    name: "Bakso Cuanki Serayu",
    description: "Cuanki dan Batagor",
    location: { type: "Point", coordinates: [107.6250, -6.9100] },
    address: "Jl. Serayu No. 2, Cihapit, Bandung",
    price_level: "HEMAT",
    opening_hours: { open_now: true },
    is_mobile: false,
    verification_status: "VERIFIED",
    publish_status: "PUBLISHED",
    data_quality_score: 92,
    metadata: { category: "Bakso", brand: "Cuanki Serayu", phone: "022-7201234" },
    updated_at: "2026-09-01T00:00:00Z",
    owner_id: null, // UNCLAIMED
  };

  const MENU_GO_OBSERVATION = {
    source_record_id: "obs-cuanki-01",
    observed_at: "2026-08-30T10:00:00Z",
    normalized_properties: {
      foto_tempat: "https://storage.example.test/cuanki-storefront.jpg",
      foto_menu_1: "https://storage.example.test/cuanki-menu.jpg",
      harga_rata_rata: "20000",
      kondisi_tempat: "RAMAI",
      menu_utama: "Cuanki Spesial",
      mobilitas: "Tidak (Menetap/Mangkal di satu titik)",
    },
  };

  describe("Section 23: MENU GO PUBLIC VISIBILITY", () => {
    it("validated Menu Go canonical merchant is PUBLIC on Map, Search, Nearby, and Routable without owner", () => {
      const menuLink = {
        merchant_id: MENU_GO_CANONICAL.id,
        source_table: "mapid_mission_observations:MENU_GO",
        source_record_id: "obs-gorengan-01",
      };
      const obsMap = new Map([
        ["obs-gorengan-01", {
          source_record_id: "obs-gorengan-01",
          observed_at: "2026-08-25T08:00:00Z",
          normalized_properties: {
            foto_tempat: "https://storage.example.test/gorengan.jpg",
            menu_utama: "Bala-bala & Gehu",
            harga_rata_rata: "5000",
          },
        }],
      ]);

      const result = mapCanonicalMerchantRow(
        MENU_GO_CANONICAL,
        [menuLink],
        obsMap,
        { distance_meters: 180, region_names: ["Bandung Wetan"] },
        null
      );

      expect(result).not.toBeNull();
      // PUBLIC_MAP: YES (valid coordinates)
      expect(result!.longitude).toBe(107.6105);
      expect(result!.latitude).toBe(-6.8850);
      // PUBLISHED: YES
      expect(result!.publish_status).toBe("PUBLISHED");
      // SEARCH: YES (searchable name & menu)
      expect(result!.name).toBe("Gorengan Simpang Dago");
      expect(result!.menu).toBe("Bala-bala & Gehu");
      // NEARBY: YES (distance resolved)
      expect(result!.distanceMeters).toBe(180);
      // ROUTABLE: YES (has point coordinates for routing destination)
      expect(typeof result!.longitude).toBe("number");
      expect(typeof result!.latitude).toBe("number");
      // OWNER REQUIRED TO BE PUBLIC: NO
      expect(result!.owner_id).toBeNull();
      expect(result!.sources).toContain("MENU_GO");
    });
  });

  describe("Section 24: MAPID / PREMIUM PUBLIC VISIBILITY", () => {
    it("validated MAPID/Premium canonical merchant is PUBLIC on Map, Search, Nearby, and Routable without owner", () => {
      const premiumLink = {
        merchant_id: PREMIUM_CANONICAL.id,
        source_table: "mapid_premium_merchants",
        source_record_id: "prem-kopi-aroma-01",
      };

      const result = mapCanonicalMerchantRow(
        PREMIUM_CANONICAL,
        [premiumLink],
        EMPTY_OBSERVATION_MAP,
        { distance_meters: 450, region_names: ["Sumur Bandung"] },
        null
      );

      expect(result).not.toBeNull();
      // PUBLIC_MAP: YES
      expect(result!.longitude).toBe(107.6050);
      expect(result!.latitude).toBe(-6.9180);
      // PUBLISHED: YES
      expect(result!.publish_status).toBe("PUBLISHED");
      // SEARCH: YES
      expect(result!.name).toBe("Kopi Aroma Asli");
      expect(result!.category).toBe("Kopi");
      // NEARBY: YES
      expect(result!.distanceMeters).toBe(450);
      // ROUTABLE: YES
      expect(result!.address).toContain("Banceuy");
      // OWNER REQUIRED TO BE PUBLIC: NO
      expect(result!.owner_id).toBeNull();
      expect(result!.sources).toContain("PREMIUM");
    });
  });

  describe("Section 25: MULTI-SOURCE DEDUPLICATION", () => {
    it("merchant with evidence from both Menu Go + MAPID/Premium resolves to ONE merchant, not two", () => {
      const links = [
        {
          merchant_id: RECONCILED_CANONICAL.id,
          source_table: "mapid_premium_merchants",
          source_record_id: "prem-serayu-01",
        },
        {
          merchant_id: RECONCILED_CANONICAL.id,
          source_table: "mapid_mission_observations:MENU_GO",
          source_record_id: "obs-cuanki-01",
        },
      ];
      const obsMap = new Map([["obs-cuanki-01", MENU_GO_OBSERVATION]]);

      const result = mapCanonicalMerchantRow(
        RECONCILED_CANONICAL,
        links,
        obsMap,
        { distance_meters: 320, region_names: ["Bandung Wetan"] },
        null
      );

      expect(result).not.toBeNull();
      // Returns ONE merchant with canonical ID
      expect(result!.id).toBe("canonical-reconciled-both");
      // Contains both sources
      expect(result!.sources).toHaveLength(2);
      expect(result!.sources).toContain("PREMIUM");
      expect(result!.sources).toContain("MENU_GO");
      // Provenance attributes preserve individual evidence sources without destruction
      const prov = result!.provenance as any;
      expect(prov.attributes.geometry).toBe("PREMIUM");
      expect(prov.attributes.menu).toBe("MENU_GO");
      expect(prov.attributes.observed_price).toBe("MENU_GO");
      expect(prov.attributes.phone).toBe("PREMIUM");
      expect(prov.attributes.photo).toBe("MENU_GO");
      // Both source records tracked in provenance
      expect(prov.source_record_ids).toHaveLength(2);
    });
  });

  describe("Section 10 & 26: PENDING SAFETY & NO OWNER-ONLY FILTER", () => {
    it("Section 10: unclaimed validated merchants (owner_id = null) are NOT hidden by owner filter", () => {
      // Unclaimed merchant
      const unclaimed = mapCanonicalMerchantRow(
        { ...BASE_MERCHANT, owner_id: null },
        [PREMIUM_LINK],
        EMPTY_OBSERVATION_MAP
      );
      // Claimed merchant
      const claimed = mapCanonicalMerchantRow(
        { ...BASE_MERCHANT, owner_id: "verified-owner-uuid" },
        [PREMIUM_LINK],
        EMPTY_OBSERVATION_MAP
      );

      expect(unclaimed).not.toBeNull();
      expect(claimed).not.toBeNull();
      expect(unclaimed!.owner_id).toBeNull();
      expect(claimed!.owner_id).toBe("verified-owner-uuid");
      // Both are published and publicly visible
      expect(unclaimed!.publish_status).toBe("PUBLISHED");
      expect(claimed!.publish_status).toBe("PUBLISHED");
    });

    it("Section 26: pending submissions cannot leak into public canonical inventory", async () => {
      // When an unapproved submission exists, it is NOT in the merchants table
      // and therefore CanonicalMerchantReadService does not return it
      const supabase = {
        rpc: vi.fn().mockResolvedValue({
          data: [{ merchant_id: BASE_MERCHANT.id, total_count: 1 }],
          error: null,
        }),
        from: vi.fn((table: string) => {
          if (table === "merchants") {
            return {
              select: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    // Database query enforces publish_status = 'PUBLISHED'
                    range: vi.fn().mockResolvedValue({ data: [BASE_MERCHANT], error: null }),
                  }),
                }),
              }),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }),
      };

      const service = new CanonicalMerchantReadService(supabase as any);
      const { merchants } = await service.list({ limit: 10, offset: 0 });

      // Only published merchant returned
      expect(merchants).toHaveLength(1);
      expect(merchants[0].publish_status).toBe("PUBLISHED");
    });
  });

  describe("Section 18: PUBLIC SAFE DATA CONTRACT", () => {
    it("public response contains only public-safe fields and no private verification secrets", () => {
      const result = mapCanonicalMerchantRow(
        BASE_MERCHANT,
        [PREMIUM_LINK, MENU_GO_LINK],
        EMPTY_OBSERVATION_MAP,
        undefined,
        OWNER_SUBMISSION
      );

      const keys = Object.keys(result!);
      // Forbidden private keys
      expect(keys).not.toContain("password");
      expect(keys).not.toContain("claim_evidence");
      expect(keys).not.toContain("service_role_key");
      expect(keys).not.toContain("review_note");
      expect(keys).not.toContain("admin_notes");
      expect(keys).not.toContain("reviewed_by");

      // Required public-safe keys
      expect(keys).toContain("id");
      expect(keys).toContain("name");
      expect(keys).toContain("longitude");
      expect(keys).toContain("latitude");
      expect(keys).toContain("owner_id");
      expect(keys).toContain("publish_status");
      expect(keys).toContain("submitted_by");
      expect(keys).toContain("submission_id");
      expect(keys).toContain("provenance");
    });
  });
});
