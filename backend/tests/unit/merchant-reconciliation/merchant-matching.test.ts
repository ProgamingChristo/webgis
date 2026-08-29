import { describe, expect, it } from "vitest";

import {
  areCategoriesCompatible,
  chooseBestMerchantDecision,
  evaluateMerchantCandidate,
  isMobileMerchant,
  merchantNameSimilarity,
  normalizeAddress,
  normalizeMerchantName,
  normalizePhone,
} from "@/src/features/merchant-reconciliation";
import type { MerchantCandidateInput } from "@/src/features/merchant-reconciliation";

function candidate(overrides: Partial<MerchantCandidateInput> = {}): MerchantCandidateInput {
  return {
    distanceMeters: 8,
    menuCategory: "Makanan",
    menuLatitude: -6.175,
    menuLongitude: 106.827,
    menuMobility: "menetap",
    menuName: "Bakso Pak Budi",
    menuObservationId: "menu-observation-1",
    menuObservedAt: "2026-08-27T00:00:00.000Z",
    menuProperties: {},
    menuSourceRecordId: "menu-source-1",
    premiumAddress: "Jl. Merdeka No. 1",
    premiumCategory: "Restaurant",
    premiumLatitude: -6.175,
    premiumLongitude: 106.827,
    premiumMerchantId: "premium-merchant-1",
    premiumMetadata: {},
    premiumName: "Bakso Pak Budi",
    premiumPhone: null,
    premiumSourceRecordId: "premium-source-1",
    ...overrides,
  };
}

describe("merchant reconciliation normalization", () => {
  it("normalizes formatting without removing meaningful branch numbers", () => {
    expect(normalizeMerchantName("  Bakso Pak Budi. ")).toBe("bakso pak budi");
    expect(normalizeMerchantName("Bakso Pak Budi 2")).toBe("bakso pak budi 2");
    expect(merchantNameSimilarity("Bakso Pak Budi", "Bakso Pak Budi 2")).toBeLessThan(1);
  });

  it("normalizes Indonesian phone prefixes", () => {
    expect(normalizePhone("+62 812-3456-7890")).toBe("081234567890");
    expect(normalizePhone("812 3456 7890")).toBe("081234567890");
    expect(normalizePhone(null)).toBeNull();
  });

  it("normalizes common address formatting", () => {
    expect(normalizeAddress("Jalan Merdeka Nomor 1")).toBe("jl merdeka no 1");
  });

  it("recognizes compatible food taxonomies and mobile observations", () => {
    expect(areCategoriesCompatible("Restaurant", "Makanan")).toBe(true);
    expect(areCategoriesCompatible("Apotek", "Makanan")).toBe(false);
    expect(isMobileMerchant("Pedagang keliling / berpindah")).toBe(true);
  });
});

describe("merchant reconciliation decisions", () => {
  it("confirms an exact name and phone match with close geometry", () => {
    const result = evaluateMerchantCandidate(candidate({
      menuProperties: { telepon: "081234567890" },
      premiumPhone: "+62 812-3456-7890",
      distanceMeters: 30,
    }));
    expect(result.status).toBe("MATCH_CONFIRMED");
  });

  it("accepts an exact close name/category match as high confidence", () => {
    expect(evaluateMerchantCandidate(candidate()).status).toBe("MATCH_HIGH_CONFIDENCE");
  });

  it("does not merge the same name far away", () => {
    expect(evaluateMerchantCandidate(candidate({ distanceMeters: 230 })).status).toBe("NO_MATCH");
  });

  it("routes a nearby conflicting phone to review", () => {
    const result = evaluateMerchantCandidate(candidate({
      menuProperties: { telepon: "081111111111" },
      premiumPhone: "082222222222",
      distanceMeters: 20,
    }));
    expect(result.status).toBe("MATCH_REVIEW_REQUIRED");
  });

  it("routes multiple nearby branches with the same name to review", () => {
    const result = chooseBestMerchantDecision([
      candidate({ premiumMerchantId: "branch-1", distanceMeters: 5 }),
      candidate({ premiumMerchantId: "branch-2", distanceMeters: 18 }),
    ]);
    expect(result.status).toBe("MATCH_REVIEW_REQUIRED");
    expect(result.reason).toContain("Multiple nearby Premium merchants");
  });

  it("never auto-merges a mobile Menu Go observation by name and proximity", () => {
    const result = evaluateMerchantCandidate(candidate({ menuMobility: "berpindah" }));
    expect(result.status).toBe("MATCH_REVIEW_REQUIRED");
    expect(result.isMobile).toBe(true);
  });

  it("supports missing phone and address without fabricating evidence", () => {
    const result = evaluateMerchantCandidate(candidate({ premiumAddress: null, premiumPhone: null }));
    expect(result.phoneMatch).toBeNull();
    expect(result.addressMatch).toBeNull();
    expect(result.status).toBe("MATCH_HIGH_CONFIDENCE");
  });

  it("returns review for a plausible but weaker name match", () => {
    const result = evaluateMerchantCandidate(candidate({
      distanceMeters: 40,
    }));
    expect(result.status).toBe("MATCH_REVIEW_REQUIRED");
  });

  it("returns no match when no Premium candidate exists", () => {
    const result = evaluateMerchantCandidate(candidate({
      premiumMerchantId: null,
      premiumName: null,
      distanceMeters: null,
    }));
    expect(result.status).toBe("NO_MATCH");
  });
});
