import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import {
  createContextualObservationHandler,
  type ContextualObservationRouteDependencies,
} from "@/app/api/contextual-observations/route";
import { ApplicationError } from "@/src/lib/errors";

vi.mock("server-only", () => ({}));

const validUrl = "http://localhost/api/contextual-observations?source=PROPERTI_GO&west=106.7&south=-6.3&east=106.9&north=-6.1&limit=100&offset=0";

function result() {
  return {
    bbox: { west: 106.7, south: -6.3, east: 106.9, north: -6.1 },
    feature_collection: {
      type: "FeatureCollection" as const,
      features: [{
        type: "Feature" as const,
        id: "observation-1",
        geometry: { type: "Point" as const, coordinates: [106.8, -6.2] as [number, number] },
        properties: {
          freshness_status: "UNKNOWN",
          observed_at: null,
          provenance: { imported_at: "2026-08-28T00:00:00.000Z", provider: "MAPID" as const, source_type: "PROPERTI_GO" as const },
          semantics: "PROPERTY_OBSERVATION" as const,
          source_id: "provider-1",
          source_type: "PROPERTI_GO" as const,
          verification_status: "SOURCE_OBSERVED",
        },
      }],
    },
    has_more: false,
    limit: 100,
    next_offset: null,
    offset: 0,
    source: "PROPERTI_GO" as const,
    total_available: 1,
    total_features: 1,
  };
}

describe("contextual observation read route", () => {
  it("requires authentication before reading Mission data", async () => {
    const dependencies: ContextualObservationRouteDependencies = {
      authorize: vi.fn().mockRejectedValue(new ApplicationError("UNAUTHORIZED")),
      list: vi.fn(),
    };
    const response = await createContextualObservationHandler(dependencies)(
      new NextRequest(validUrl),
    );
    expect(response.status).toBe(401);
    expect(dependencies.list).not.toHaveBeenCalled();
  });

  it("accepts a strict bounded viewport request and returns a safe contract", async () => {
    const list = vi.fn().mockResolvedValue(result());
    const response = await createContextualObservationHandler({
      authorize: vi.fn().mockResolvedValue("user-id"),
      list,
    })(new NextRequest(validUrl));
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(list).toHaveBeenCalledWith({
      source: "PROPERTI_GO",
      west: 106.7,
      south: -6.3,
      east: 106.9,
      north: -6.1,
      limit: 100,
      offset: 0,
    });
    expect(body.data.total_features).toBe(1);
    for (const forbidden of ["raw_payload", "raw_payload_checksum", "x-api-key", "service_role"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("rejects missing, inverted, oversized, duplicate, unknown, and Menu Go queries", async () => {
    const list = vi.fn();
    const handler = createContextualObservationHandler({
      authorize: vi.fn().mockResolvedValue("user-id"),
      list,
    });
    const urls = [
      "http://localhost/api/contextual-observations?source=PROPERTI_GO",
      "http://localhost/api/contextual-observations?source=PROPERTI_GO&west=107&south=-6.3&east=106&north=-6.1",
      "http://localhost/api/contextual-observations?source=PROPERTI_GO&west=100&south=-6.3&east=120&north=-6.1",
      `${validUrl}&west=106.6`,
      `${validUrl}&url=https://attacker.example`,
      validUrl.replace("PROPERTI_GO", "MENU_GO"),
      validUrl.replace("PROPERTI_GO", "../../secret"),
      validUrl.replace("limit=100", "limit=251"),
    ];
    for (const url of urls) {
      const response = await handler(new NextRequest(url));
      expect(response.status).toBe(400);
    }
    expect(list).not.toHaveBeenCalled();
  });
});
