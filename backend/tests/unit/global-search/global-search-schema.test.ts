import { describe, expect, it } from "vitest";

import { globalSearchQuerySchema } from "@/src/features/global-search/global-search.schema";

describe("global search query schema", () => {
  it("accepts strict bbox pagination and normalizes region arrays", () => {
    const parsed = globalSearchQuerySchema.parse({
      q: "bakso",
      scope: "MULTI_REGION",
      region_ids: "jakarta-barat,jakarta-timur",
      west: "106.7",
      south: "-6.3",
      east: "106.9",
      north: "-6.1",
      limit: "50",
      offset: "0",
    });
    expect(parsed.region_ids).toEqual(["jakarta-barat", "jakarta-timur"]);
    expect(parsed.limit).toBe(50);
  });

  it.each([
    { q: "x".repeat(121), west: 106, south: -6, east: 107, north: -5 },
    { q: "bakso", west: 107, south: -6, east: 106, north: -5 },
    { q: "bakso", scope: "MULTI_REGION", region_ids: "jakarta-barat" },
    { q: "bakso", scope: "MULTI_REGION", region_ids: "jakarta-barat,jakarta-barat" },
    { q: "bakso", scope: "REGION", region_ids: "jakarta-barat,jakarta-timur" },
    { q: "bakso", west: 106, south: -6, east: 107, north: -5, limit: 101 },
    { q: "bakso", west: 106, south: -6, east: 107, north: -5, sql: "drop table" },
  ])("rejects unsafe or ambiguous contracts", (input) => {
    expect(globalSearchQuerySchema.safeParse(input).success).toBe(false);
  });
});
