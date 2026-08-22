import { describe, expect, it } from "vitest";

import {
  mapSpatialSourceRowToDTO,
  mapStudyAreaRowToDTO,
  mapUmkmProfileRowToDTO,
} from "@/src/mappers/domain.mapper";
import {
  GeometryMappingError,
  canonicalizeCorridorGeometry,
  mapDatabaseGeometryToGeoJson,
} from "@/src/mappers/geometry.mapper";
import type {
  SpatialSourceDatabaseRow,
  StudyAreaDatabaseRow,
  UmkmProfileDatabaseRow,
} from "@/src/types/domain";

const sourceId = "10000000-0000-4000-8000-000000000001";
const timestamp = "2026-08-16T00:00:00.000Z";

const provenanceColumns = {
  source_id: sourceId,
  source_record_id: "FIXTURE-001",
  data_version: "1",
  retrieved_at: timestamp,
  validated_at: null,
  validation_status: "PENDING" as const,
  metadata: { fixture: true },
  source: { source_type: "external" as const },
};

describe("Phase 5 pure data mappers", () => {
  it("serializes database GeoJSON without exposing raw PostGIS forms", () => {
    expect(
      mapDatabaseGeometryToGeoJson(
        JSON.stringify({ type: "Point", coordinates: [106.8, -6.2] }),
      ),
    ).toEqual({ type: "Point", coordinates: [106.8, -6.2] });

    expect(() =>
      mapDatabaseGeometryToGeoJson(
        "0101000020E61000009A99999999995A4052B81E85EB514EC0",
      ),
    ).toThrow(GeometryMappingError);
  });

  it("canonicalizes accepted LineString input for the database typemod", () => {
    expect(
      canonicalizeCorridorGeometry({
        type: "LineString",
        coordinates: [
          [0, 0],
          [0.01, 0.01],
        ],
      }),
    ).toEqual({
      type: "MultiLineString",
      coordinates: [
        [
          [0, 0],
          [0.01, 0.01],
        ],
      ],
    });
  });

  it("maps a database row to a composed public spatial DTO", () => {
    const row: StudyAreaDatabaseRow = {
      id: "20000000-0000-4000-8000-000000000001",
      name: "TEST STUDY AREA",
      description: "FIXTURE",
      geometry: JSON.stringify({
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [0, 0],
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0],
            ],
          ],
        ],
      }),
      created_at: timestamp,
      updated_at: timestamp,
      ...provenanceColumns,
    };

    const dto = mapStudyAreaRowToDTO(row);

    expect(dto.geometry.type).toBe("MultiPolygon");
    expect(dto.provenance).toEqual({
      source_id: sourceId,
      source_type: "external",
      source_record_id: "FIXTURE-001",
      data_version: "1",
      retrieved_at: timestamp,
      validated_at: null,
      validation_status: "PENDING",
      metadata: { fixture: true },
    });
    expect(dto).not.toHaveProperty("source");
    expect(dto).not.toHaveProperty("source_record_id");
  });

  it("validates source metadata before exposing it", () => {
    const safeRow: SpatialSourceDatabaseRow = {
      id: sourceId,
      source_name: "TEST SOURCE",
      source_type: "external",
      description: null,
      metadata: { fixture: true, environment: "development" },
      created_at: timestamp,
      updated_at: timestamp,
    };

    expect(mapSpatialSourceRowToDTO(safeRow).metadata).toEqual({
      fixture: true,
      environment: "development",
    });

    expect(() =>
      mapSpatialSourceRowToDTO({
        ...safeRow,
        metadata: { nested: { access_token: "must-not-be-exposed" } },
      }),
    ).toThrow();
  });

  it("keeps owner identity internal when mapping UMKM DTOs", () => {
    const row: UmkmProfileDatabaseRow = {
      id: "40000000-0000-4000-8000-000000000001",
      owner_id: "30000000-0000-4000-8000-000000000001",
      business_name: "TEST UMKM",
      category: "TEST CATEGORY",
      description: null,
      address: "TEST ADDRESS",
      geometry: { type: "Point", coordinates: [0, 0] },
      created_at: timestamp,
      updated_at: timestamp,
      ...provenanceColumns,
    };

    const dto = mapUmkmProfileRowToDTO(row);

    expect(dto.business_name).toBe("TEST UMKM");
    expect(dto).not.toHaveProperty("owner_id");
    expect(dto.provenance.source_type).toBe("external");
  });
});
