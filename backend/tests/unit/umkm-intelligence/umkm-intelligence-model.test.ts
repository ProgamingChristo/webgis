import { describe, expect, it } from "vitest";
import {
  buildRecommendations,
  calculateDataReadiness,
  calculateLocationReadiness,
  calculateVisibilityReadiness,
} from "@/src/features/umkm-intelligence";
import type { MerchantEvidenceInput } from "@/src/features/umkm-intelligence";

const complete: MerchantEvidenceInput = {
  name: true,
  category: true,
  location: true,
  address: true,
  openingHours: true,
  price: true,
  photo: true,
  menu: true,
  phone: true,
  verified: true,
  published: true,
  isMobile: false,
  regionKnown: true,
  networkStatus: "ROUTABLE",
  transitRoutable: true,
};

describe("Phase 10 deterministic UMKM readiness models", () => {
  it("bounds complete and missing data readiness at 100 and 0", () => {
    expect(calculateDataReadiness(complete)).toMatchObject({
      score: 100,
      status: "READY",
      model_version: "GETRA_DATA_READINESS_V1",
    });
    expect(calculateDataReadiness({
      ...complete,
      name: false,
      category: false,
      location: false,
      address: false,
      openingHours: false,
      price: false,
      photo: false,
      menu: false,
      phone: false,
      verified: false,
    })).toMatchObject({ score: 0, status: "INCOMPLETE" });
  });

  it("keeps visibility distinct from popularity and exposes missing search eligibility", () => {
    const result = calculateVisibilityReadiness({
      ...complete,
      openingHours: false,
      price: false,
      networkStatus: "UNROUTABLE",
    });
    expect(result).toMatchObject({
      score: 55,
      status: "DEVELOPING",
      model_version: "GETRA_VISIBILITY_READINESS_V1",
    });
    expect(result.components.filter((item) => item.status === "MISSING").map((item) => item.id))
      .toEqual(["OPENING_HOURS", "PRICE", "NETWORK_REACHABILITY"]);
  });

  it("uses limited geometry semantics for mobile merchants", () => {
    const result = calculateLocationReadiness({ ...complete, isMobile: true });
    expect(result).toMatchObject({ score: 85, status: "READY", model_version: "GETRA_LOCATION_READINESS_V1" });
    expect(result.components[0]).toMatchObject({ status: "LIMITED", points: 15, max_points: 30 });
    expect(result.components[0]?.evidence).toMatch(/mobile/i);
  });

  it("generates, prioritizes, deduplicates, and resolves recommendations", () => {
    const incomplete = { ...complete, openingHours: false, price: false, networkStatus: "UNROUTABLE" as const };
    const recommendations = buildRecommendations(incomplete, 55, {
      retail_gap: 24,
      evidence: { confidence: "MODERATE_EVIDENCE" },
    });
    expect(recommendations.map((item) => item.id)).toEqual([
      "ADD_OPENING_HOURS",
      "ADD_PRICE_DATA",
      "REVIEW_PEDESTRIAN_ACCESS",
      "STRENGTHEN_DISCOVERY_READINESS",
    ]);
    expect(buildRecommendations(complete, 100, null)).toEqual([]);
  });

  it("suppresses opportunity wording when evidence is insufficient", () => {
    const recommendations = buildRecommendations({ ...complete, openingHours: false }, 75, {
      retail_gap: 40,
      evidence: { confidence: "INSUFFICIENT_DATA" },
    });
    expect(recommendations.map((item) => item.id)).not.toContain("STRENGTHEN_DISCOVERY_READINESS");
  });
});
