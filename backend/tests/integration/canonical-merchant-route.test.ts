import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import {
  createCanonicalMerchantHandler,
  type CanonicalMerchantRouteDependencies,
} from "@/app/api/merchants/canonical/route";
import { ApplicationError } from "@/src/lib/errors";

vi.mock("server-only", () => ({}));

function request() {
  return new NextRequest(
    "http://localhost/api/merchants/canonical?west=106.7&south=-6.3&east=106.9&north=-6.1&limit=50&offset=0",
  );
}

describe("canonical merchant read route", () => {
  const searchResult = (merchants: unknown[], total = merchants.length) => ({
    intent: {
      domain: "MERCHANT" as const,
      original_query: "",
      keyword: null,
      location_text: null,
      category: null,
      scope: {
        type: "CURRENT_VIEWPORT" as const,
        region_ids: [],
        bounds: { west: 106.7, south: -6.3, east: 106.9, north: -6.1 },
      },
    },
    regions: [],
    available_regions: [],
    merchants,
    total,
    limit: 50,
    offset: 0,
  });

  it("requires authentication", async () => {
    const dependencies: CanonicalMerchantRouteDependencies = {
      authorize: vi.fn().mockRejectedValue(new ApplicationError("UNAUTHORIZED")),
      search: vi.fn(),
    };
    const response = await createCanonicalMerchantHandler(dependencies)(request());
    expect(response.status).toBe(401);
    expect(dependencies.search).not.toHaveBeenCalled();
  });

  it("returns one canonical merchant with both source identities", async () => {
    const merchant = {
      id: "canonical-id",
      name: "Bakso Pak Budi",
      sources: ["PREMIUM", "MENU_GO"],
      provenance: {
        source_record_ids: [
          { source: "PREMIUM", source_record_id: "premium-1" },
          { source: "MENU_GO", source_record_id: "menu-1" },
        ],
      },
    };
    const response = await createCanonicalMerchantHandler({
      authorize: vi.fn().mockResolvedValue("user-id"),
      search: vi.fn().mockResolvedValue(searchResult([merchant], 3)),
    })(request());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.total_features).toBe(1);
    expect(body.data.total_available).toBe(3);
    expect(body.data.has_more).toBe(true);
    expect(body.data.next_offset).toBe(1);
    expect(body.data.merchants).toEqual([merchant]);
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("x-api-key");
    expect(serialized).not.toContain("service_role");
    expect(serialized).not.toContain("raw_payload");
  });

  it("records an authenticated search through the aggregate analytics service", async () => {
    const result = searchResult([], 0);
    const recordSearch = vi.fn().mockResolvedValue(undefined);
    const response = await createCanonicalMerchantHandler({
      authorize: vi.fn().mockResolvedValue("private-actor-id"),
      search: vi.fn().mockResolvedValue(result),
      recordSearch,
    })(request());

    expect(response.status).toBe(200);
    expect(recordSearch).toHaveBeenCalledWith("private-actor-id", result);
    expect(JSON.stringify(await response.json())).not.toContain("private-actor-id");
  });

  it("rejects missing, inverted, duplicate, and unknown viewport parameters", async () => {
    const search = vi.fn();
    const handler = createCanonicalMerchantHandler({
      authorize: vi.fn().mockResolvedValue("user-id"),
      search,
    });
    const urls = [
      "http://localhost/api/merchants/canonical",
      "http://localhost/api/merchants/canonical?west=107&south=-6.3&east=106&north=-6.1",
      "http://localhost/api/merchants/canonical?west=106&west=106.1&south=-6.3&east=107&north=-6.1",
      "http://localhost/api/merchants/canonical?west=106&south=-6.3&east=107&north=-6.1&url=https://example.com",
    ];

    for (const url of urls) {
      const response = await handler(new NextRequest(url));
      expect(response.status).toBe(400);
    }
    expect(search).not.toHaveBeenCalled();
  });
});
