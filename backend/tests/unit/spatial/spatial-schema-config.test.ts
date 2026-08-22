import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import invalidBBoxFixture from "@/tests/fixtures/spatial/invalid-bbox.fixture.json";
import invalidPointFixture from "@/tests/fixtures/spatial/invalid-point.fixture.json";
import nearbyFixture from "@/tests/fixtures/spatial/nearby.fixture.json";
import validBBoxFixture from "@/tests/fixtures/spatial/valid-bbox.fixture.json";
import validPointFixture from "@/tests/fixtures/spatial/valid-point.fixture.json";
import {
  DEFAULT_SPATIAL_MAX_BBOX_LATITUDE_DEGREES,
  DEFAULT_SPATIAL_MAX_BBOX_LONGITUDE_DEGREES,
  DEFAULT_SPATIAL_MAX_RADIUS_METERS,
  DEFAULT_WALKING_SPEED_METERS_PER_SECOND,
  MAX_CONFIGURABLE_RADIUS_METERS,
} from "@/src/modules/spatial/spatial.constants";
import { parseSpatialConfig } from "@/src/modules/spatial/spatial.config";
import {
  coordinateSchema,
  parseBBoxQuery,
  parseDistanceRequest,
  parseNearbyQuery,
} from "@/src/modules/spatial/spatial.schema";

function captureError(operation: () => unknown): unknown {
  try {
    operation();
  } catch (error) {
    return error;
  }
  throw new Error("TEST expected operation to throw");
}

describe("Phase 7 spatial schemas and configuration", () => {
  it("keeps fixture data explicitly labeled as non-production", () => {
    for (const fixture of [
      validPointFixture,
      invalidPointFixture,
      validBBoxFixture,
      invalidBBoxFixture,
      nearbyFixture,
    ]) {
      expect(fixture.fixture_notice).toBe(
        "TEST FIXTURE - NOT PRODUCTION DATA",
      );
    }
  });

  it("accepts WGS84 boundaries and the longitude/latitude object convention", () => {
    expect(coordinateSchema.parse(validPointFixture.coordinate)).toEqual({
      latitude: -0.5,
      longitude: 0.25,
    });
    expect(
      coordinateSchema.parse({ latitude: -90, longitude: -180 }),
    ).toEqual({ latitude: -90, longitude: -180 });
    expect(
      coordinateSchema.parse({ latitude: 90, longitude: 180 }),
    ).toEqual({ latitude: 90, longitude: 180 });
  });

  it("rejects invalid, reversed, and non-finite coordinate values", () => {
    for (const fixtureCase of invalidPointFixture.cases) {
      expect(
        coordinateSchema.safeParse(fixtureCase.coordinate).success,
        fixtureCase.label,
      ).toBe(false);
    }

    for (const coordinate of [
      { latitude: Number.NaN, longitude: 0 },
      { latitude: 0, longitude: Number.POSITIVE_INFINITY },
      { latitude: "0", longitude: 0 },
    ]) {
      expect(coordinateSchema.safeParse(coordinate).success).toBe(false);
    }

    expect(
      captureError(() =>
        parseDistanceRequest({
          destination: validPointFixture.coordinate,
          origin: invalidPointFixture.cases[0].coordinate,
        }),
      ),
    ).toMatchObject({ code: "SPATIAL_INVALID_COORDINATE" });
  });

  it("normalizes safe raw nearby query values and enforces the configured radius", () => {
    expect(
      parseNearbyQuery(
        nearbyFixture.api_query,
        DEFAULT_SPATIAL_MAX_RADIUS_METERS,
      ),
    ).toEqual(nearbyFixture.domain_query);

    const excessiveRadius = {
      ...nearbyFixture.api_query,
      radius: String(DEFAULT_SPATIAL_MAX_RADIUS_METERS + 1),
    };
    expect(
      captureError(() =>
        parseNearbyQuery(excessiveRadius, DEFAULT_SPATIAL_MAX_RADIUS_METERS),
      ),
    ).toMatchObject({ code: "SPATIAL_INVALID_RADIUS" });
  });

  it("maps west/south/east/north into the canonical bbox domain object", () => {
    expect(parseBBoxQuery(validBBoxFixture.api_query)).toEqual(
      validBBoxFixture.domain_query,
    );

    for (const fixtureCase of invalidBBoxFixture.cases) {
      expect(
        captureError(() => parseBBoxQuery(fixtureCase.api_query)),
        fixtureCase.label,
      ).toMatchObject({ code: "SPATIAL_INVALID_BBOX" });
    }
  });

  it("uses documented safe defaults when optional spatial env values are absent", () => {
    expect(parseSpatialConfig({})).toEqual({
      maxBboxLatitudeDegrees: 10,
      maxBboxLongitudeDegrees: 10,
      maxRadiusMeters: DEFAULT_SPATIAL_MAX_RADIUS_METERS,
      walkingSpeedMetersPerSecond:
        DEFAULT_WALKING_SPEED_METERS_PER_SECOND,
    });
    expect(
      parseSpatialConfig({
        DEFAULT_WALKING_SPEED_MPS: " ",
        SPATIAL_MAX_RADIUS_METERS: "",
      }),
    ).toEqual({
      maxBboxLatitudeDegrees: DEFAULT_SPATIAL_MAX_BBOX_LATITUDE_DEGREES,
      maxBboxLongitudeDegrees: DEFAULT_SPATIAL_MAX_BBOX_LONGITUDE_DEGREES,
      maxRadiusMeters: DEFAULT_SPATIAL_MAX_RADIUS_METERS,
      walkingSpeedMetersPerSecond:
        DEFAULT_WALKING_SPEED_METERS_PER_SECOND,
    });
  });

  it("rejects a bbox that exceeds the configured operational extent", () => {
    expect(
      captureError(() =>
        parseBBoxQuery(
          {
            east: "1.01",
            limit: "10",
            north: "1",
            south: "0",
            type: "study_area",
            west: "0",
          },
          1,
          1,
        ),
      ),
    ).toMatchObject({ code: "SPATIAL_INVALID_BBOX" });
  });

  it.each([
    { DEFAULT_WALKING_SPEED_MPS: "0" },
    { DEFAULT_WALKING_SPEED_MPS: "3.01" },
    { DEFAULT_WALKING_SPEED_MPS: "not-a-number" },
    { SPATIAL_MAX_RADIUS_METERS: "0" },
    { SPATIAL_MAX_BBOX_LATITUDE_DEGREES: "0" },
    { SPATIAL_MAX_BBOX_LONGITUDE_DEGREES: "361" },
    { SPATIAL_MAX_RADIUS_METERS: "1.5" },
    { SPATIAL_MAX_RADIUS_METERS: String(MAX_CONFIGURABLE_RADIUS_METERS + 1) },
  ])("rejects invalid server-only spatial configuration %#", (input) => {
    expect(captureError(() => parseSpatialConfig(input))).toMatchObject({
      code: "SPATIAL_INVALID_CONFIGURATION",
    });
  });
});
