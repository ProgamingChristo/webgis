import { describe, expect, it } from "vitest";
import { parseAnalyticsSearchParams } from "@/src/features/demand-intelligence";

describe("Phase 09 analytics query validation", () => {
  const now = new Date("2026-08-28T12:00:00.000Z");

  it("accepts bounded multi-region and 30-day queries", () => {
    const query = parseAnalyticsSearchParams(new URLSearchParams({
      category: "bakso",
      days: "30",
      region_ids: "jakarta-barat,jakarta-timur,jakarta-selatan",
    }), now);
    expect(query.region_ids).toEqual(["jakarta-barat", "jakarta-timur", "jakarta-selatan"]);
    expect(query.start_at).toBe("2026-07-29T12:00:00.000Z");
  });

  it("accepts a bounded bbox scope", () => {
    expect(parseAnalyticsSearchParams(new URLSearchParams({
      category: "coffee", days: "7", west: "106.7", south: "-6.3", east: "106.9", north: "-6.1",
    }), now).bbox).toEqual({ west: 106.7, south: -6.3, east: 106.9, north: -6.1 });
  });

  it.each<Record<string, string>>([
    { category: "../../secret", days: "30", region_ids: "jakarta-selatan" },
    { category: "bakso", days: "365", region_ids: "jakarta-selatan" },
    { category: "bakso", days: "30", region_ids: "unknown-region" },
    { category: "bakso", days: "30", west: "0", south: "0", east: "90", north: "80" },
  ])("rejects unsafe query %#", (input) => {
    expect(() => parseAnalyticsSearchParams(new URLSearchParams(input), now)).toThrow();
  });
});
