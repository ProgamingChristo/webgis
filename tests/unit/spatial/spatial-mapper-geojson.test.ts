import { describe, expect, it } from "vitest";

import nearbyFixture from "@/tests/fixtures/spatial/nearby.fixture.json";
import validPointFixture from "@/tests/fixtures/spatial/valid-point.fixture.json";
import {
  coordinateToEwktPoint,
  coordinateToPointGeometry,
  coordinateToPosition,
  positionToCoordinate,
} from "@/src/lib/spatial/coordinates";
import {
  GeoJsonPreparationError,
  countGeoJsonPositions,
  geoJsonGeometryToEwkt,
} from "@/src/lib/spatial/geojson";
import { prepareWgs84Geometry } from "@/src/lib/spatial/geometry";
import { MAX_GEOJSON_POSITIONS } from "@/src/modules/spatial/spatial.constants";
import type { SpatialRepositoryRecord } from "@/src/modules/spatial/spatial.dto";
import type { PointGeometry } from "@/src/modules/spatial/spatial.types";
import {
  mapPostgisDistanceToDTO,
  mapSpatialRecordToDTO,
} from "@/src/modules/spatial/spatial.mapper";

const validPointGeometry = validPointFixture.geojson as PointGeometry;

function captureError(operation: () => unknown): unknown {
  try {
    operation();
  } catch (error) {
    return error;
  }
  throw new Error("TEST expected operation to throw");
}

describe("Phase 7 GeoJSON helpers and API-safe spatial mappers", () => {
  it("converts coordinate objects to longitude-first GeoJSON and EWKT", () => {
    const coordinate = validPointFixture.coordinate;

    expect(coordinateToPosition(coordinate)).toEqual([0.25, -0.5]);
    expect(coordinateToPointGeometry(coordinate)).toEqual(
      validPointFixture.geojson,
    );
    expect(coordinateToEwktPoint(coordinate)).toBe(
      validPointFixture.expected_ewkt,
    );
    expect(positionToCoordinate([0.25, -0.5])).toEqual(coordinate);
  });

  it("prepares validated GeoJSON with an explicit WGS84 SRID and type", () => {
    expect(geoJsonGeometryToEwkt(validPointFixture.geojson)).toBe(
      validPointFixture.expected_ewkt,
    );
    expect(prepareWgs84Geometry(validPointFixture.geojson)).toEqual({
      allowed_types: ["POINT"],
      ewkt: validPointFixture.expected_ewkt,
      geometry: validPointFixture.geojson,
    });
    expect(countGeoJsonPositions(validPointGeometry)).toBe(1);
  });

  it("rejects invalid coordinate order and geometry above the complexity cap", () => {
    expect(() =>
      geoJsonGeometryToEwkt({ type: "Point", coordinates: [0, 91] }),
    ).toThrow(GeoJsonPreparationError);

    const oversizedLine = {
      type: "LineString",
      coordinates: Array.from(
        { length: MAX_GEOJSON_POSITIONS + 1 },
        () => [0, 0] as [number, number],
      ),
    } as const;

    expect(countGeoJsonPositions(oversizedLine)).toBe(
      MAX_GEOJSON_POSITIONS + 1,
    );
    expect(() => geoJsonGeometryToEwkt(oversizedLine)).toThrow(
      GeoJsonPreparationError,
    );
  });

  it("maps repository records to an explicit DTO without internal fields", () => {
    const repositoryRecord = nearbyFixture
      .repository_records[0] as unknown as SpatialRepositoryRecord;
    const dto = mapSpatialRecordToDTO(repositoryRecord);

    expect(dto).toEqual({
      entity_type: "transport_node",
      geometry: { type: "Point", coordinates: [0.005, 0.005] },
      id: "70000000-0000-4000-8000-000000000001",
      label: "TEST SPATIAL NODE",
      provenance: {
        data_version: "TEST-FIXTURE-v1",
        retrieved_at: "2026-08-16T00:00:00.000Z",
        source_id: null,
        source_record_id: null,
        source_type: null,
      },
    });

    const serialized = JSON.stringify(dto);
    expect(serialized).not.toContain("MUST_NOT_REACH_API_DTO");
    expect(serialized).not.toContain("internal_test_marker");
    expect(serialized).not.toContain("validation_status");
    expect(serialized).not.toContain("metadata");
  });

  it("maps only finite non-negative PostGIS distances", () => {
    expect(mapPostgisDistanceToDTO(123.45)).toEqual({
      analysis_method: "postgis_geography_distance",
      distance_meters: 123.45,
      limitation_flags: [],
      source: "GETRA_SPATIAL_ENGINE",
      srid: 4326,
    });

    for (const invalidDistance of [-1, Number.NaN, Infinity, "123.45", null]) {
      expect(
        captureError(() => mapPostgisDistanceToDTO(invalidDistance)),
      ).toMatchObject({ code: "SPATIAL_QUERY_FAILED" });
    }
  });
});
