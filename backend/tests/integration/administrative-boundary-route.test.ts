import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import {
  createAdministrativeBoundaryHandler,
  type AdministrativeBoundaryRouteDependencies,
} from "@/app/api/regions/route";
import { ApplicationError } from "@/src/lib/errors";

vi.mock("server-only", () => ({}));

const collection = {
  type: "FeatureCollection" as const,
  features: [{
    type: "Feature" as const,
    id: "jakarta-selatan",
    properties: {
      id: "jakarta-selatan",
      name: "Jakarta Selatan",
      region_type: "CITY" as const,
      bounds: { west: 106.7, south: -6.4, east: 106.9, north: -6.2 },
    },
    geometry: { type: "MultiPolygon" as const, coordinates: [[[[106.7, -6.4]]]] },
  }],
};

describe("administrative boundary route", () => {
  it("requires authentication before reading geometry", async () => {
    const dependencies: AdministrativeBoundaryRouteDependencies = {
      authorize: vi.fn().mockRejectedValue(new ApplicationError("UNAUTHORIZED")),
      getBoundaries: vi.fn(),
    };
    const response = await createAdministrativeBoundaryHandler(dependencies)(
      new NextRequest("http://localhost/api/regions?ids=jakarta-selatan"),
    );
    expect(response.status).toBe(401);
    expect(dependencies.getBoundaries).not.toHaveBeenCalled();
  });

  it("returns safe selected GeoJSON and preserves canonical IDs", async () => {
    const getBoundaries = vi.fn().mockResolvedValue(collection);
    const response = await createAdministrativeBoundaryHandler({
      authorize: vi.fn().mockResolvedValue("user-id"),
      getBoundaries,
    })(new NextRequest("http://localhost/api/regions?ids=jakarta-selatan"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(getBoundaries).toHaveBeenCalledWith(["jakarta-selatan"]);
    expect(body.data.feature_collection).toEqual(collection);
    expect(body.data.feature_count).toBe(1);
    expect(JSON.stringify(body)).not.toMatch(/x-api-key|service_role|geometry_source/i);
  });

  it.each([
    "ids=unknown-region",
    "ids=jakarta-selatan,jakarta-selatan",
    "ids=jakarta-selatan&ids=jakarta-barat",
    "ids=jakarta-selatan&geometry=ST_Buffer(geometry,1)",
  ])("rejects invalid or ambiguous region requests", async (query) => {
    const getBoundaries = vi.fn();
    const response = await createAdministrativeBoundaryHandler({
      authorize: vi.fn().mockResolvedValue("user-id"),
      getBoundaries,
    })(new NextRequest(`http://localhost/api/regions?${query}`));
    expect(response.status).toBe(400);
    expect(getBoundaries).not.toHaveBeenCalled();
  });
});
