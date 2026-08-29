import { describe, expect, it } from "vitest";
import {
  evidenceConfidence,
  relativeLogScore,
  retailGap,
  weightedDemand,
} from "@/src/features/demand-intelligence";

describe("Phase 09 deterministic analytics model", () => {
  it("uses documented behavioral weights and excludes paid campaign exposure", () => {
    expect(weightedDemand({
      search_events: 2,
      route_requests: 1,
      commuter_requests: 2,
      transaction_observations: 3,
    })).toBe(13);
  });

  it("normalizes with a bounded relative log score", () => {
    expect(relativeLogScore(0, 100)).toBe(0);
    expect(relativeLogScore(100, 100)).toBe(100);
    expect(relativeLogScore(10, 100)).toBeGreaterThan(0);
    expect(relativeLogScore(10, 100)).toBeLessThan(100);
  });

  it("subtracts comparable scores, never raw counts", () => {
    expect(retailGap(80, 35, 10)).toBe(45);
    expect(retailGap(20, 70, 10)).toBe(-50);
    expect(retailGap(50, 50, 10)).toBe(0);
  });

  it("withholds Retail Gap and confidence for tiny samples", () => {
    expect(retailGap(100, 10, 2)).toBeNull();
    expect(evidenceConfidence(2, 1)).toBe("INSUFFICIENT_DATA");
    expect(evidenceConfidence(8, 2)).toBe("LIMITED_EVIDENCE");
    expect(evidenceConfidence(20, 2)).toBe("MODERATE_EVIDENCE");
    expect(evidenceConfidence(35, 3)).toBe("STRONGER_EVIDENCE");
  });
});
