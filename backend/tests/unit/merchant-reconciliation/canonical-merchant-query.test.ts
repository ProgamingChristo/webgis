import { describe, expect, it } from "vitest";

import {
  parseCanonicalMerchantQuery,
} from "@/src/features/merchant-reconciliation/canonical-merchant-query.schema";

describe("canonical merchant viewport query", () => {
  it("coerces a valid bbox and applies pagination defaults", () => {
    expect(parseCanonicalMerchantQuery({
      west: "106.7",
      south: "-6.3",
      east: "106.9",
      north: "-6.1",
    })).toEqual({
      west: 106.7,
      south: -6.3,
      east: 106.9,
      north: -6.1,
      limit: 100,
      offset: 0,
    });
  });

  it.each([
    { west: 107, south: -6.3, east: 106, north: -6.1 },
    { west: 106, south: -6.1, east: 107, north: -6.3 },
    { west: 0, south: -6.3, east: 11, north: -6.1 },
    { west: 106, south: -6.3, east: 107, north: -6.1, limit: 251 },
    { west: 106, south: -6.3, east: 107, north: -6.1, provider_path: "/secret" },
  ])("rejects an unsafe viewport query", (query) => {
    expect(() => parseCanonicalMerchantQuery(query)).toThrow();
  });
});
