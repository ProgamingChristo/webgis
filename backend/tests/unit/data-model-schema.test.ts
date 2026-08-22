import { describe, expect, it } from "vitest";

import {
  MAX_METADATA_SERIALIZED_BYTES,
  createProvenanceSchema,
  createUmkmProfileSchema,
  metadataSchema,
  paginationQuerySchema,
  provenanceSchema,
  studyAreaSortSchema,
  transportNodeFilterSchema,
  updateProvenanceSchema,
  updateStudyAreaSchema,
  updateUmkmProfileSchema,
} from "@/src/schemas/data-model.schema";
import {
  boundingBoxSchema,
  nearPointSchema,
  pointGeometrySchema,
} from "@/src/schemas/spatial.schema";

const sourceId = "10000000-0000-4000-8000-000000000001";
const timestamp = "2026-08-16T00:00:00.000Z";

describe("Phase 5 data model schemas", () => {
  it("accepts exactly two-dimensional WGS84 positions", () => {
    expect(
      pointGeometrySchema.parse({
        type: "Point",
        coordinates: [106.8, -6.2],
      }),
    ).toEqual({ type: "Point", coordinates: [106.8, -6.2] });

    expect(
      pointGeometrySchema.safeParse({
        type: "Point",
        coordinates: [106.8, -6.2, 20],
      }).success,
    ).toBe(false);
  });

  it("rejects sensitive metadata keys recursively and oversized metadata", () => {
    expect(
      metadataSchema.safeParse({
        fixture: true,
        nested: { service_role_key: "must-not-be-stored" },
      }).success,
    ).toBe(false);

    expect(
      metadataSchema.safeParse({
        chunks: Array.from({ length: 5 }, () => "x".repeat(4_096)),
      }).success,
    ).toBe(false);

    expect(
      new TextEncoder().encode(
        JSON.stringify({ chunks: Array.from({ length: 5 }, () => "x".repeat(4_096)) }),
      ).byteLength,
    ).toBeGreaterThan(MAX_METADATA_SERIALIZED_BYTES);

    expect(
      metadataSchema.parse({ fixture: true, environment: "development" }),
    ).toEqual({ fixture: true, environment: "development" });
  });

  it("keeps source_type authoritative on the source and enforces status timestamps", () => {
    expect(
      createProvenanceSchema.parse({
        source_id: sourceId,
        source_record_id: "FIXTURE-001",
      }),
    ).toMatchObject({
      source_id: sourceId,
      source_record_id: "FIXTURE-001",
      data_version: "1",
      validation_status: "PENDING",
      metadata: {},
    });

    expect(
      createProvenanceSchema.safeParse({ source_type: "external" }).success,
    ).toBe(false);
    expect(
      createProvenanceSchema.safeParse({ source_record_id: "ORPHAN" }).success,
    ).toBe(false);
    expect(
      createProvenanceSchema.safeParse({
        validation_status: "VALIDATED",
      }).success,
    ).toBe(false);

    expect(
      provenanceSchema.parse({
        source_id: sourceId,
        source_type: "external",
        source_record_id: "FIXTURE-001",
        data_version: "1",
        retrieved_at: timestamp,
        validated_at: timestamp,
        validation_status: "VALIDATED",
        metadata: { fixture: true },
      }).validation_status,
    ).toBe("VALIDATED");
  });

  it("keeps source identity out of provenance and entity updates", () => {
    expect(
      updateProvenanceSchema.safeParse({ source_id: sourceId }).success,
    ).toBe(false);
    expect(
      updateProvenanceSchema.safeParse({ validated_at: timestamp }).success,
    ).toBe(false);
    expect(
      updateProvenanceSchema.safeParse({ validation_status: "PENDING" }).success,
    ).toBe(false);
    expect(
      updateProvenanceSchema.safeParse({
        validation_status: "PENDING",
        validated_at: null,
      }).success,
    ).toBe(true);
    expect(
      updateStudyAreaSchema.safeParse({
        id: "20000000-0000-4000-8000-000000000001",
        name: "TEST UPDATE",
      }).success,
    ).toBe(false);
    expect(
      updateStudyAreaSchema.safeParse({
        provenance: { source_record_id: "CHANGED" },
      }).success,
    ).toBe(false);
    expect(
      updateUmkmProfileSchema.safeParse({
        owner_id: "30000000-0000-4000-8000-000000000001",
        business_name: "TEST UPDATE",
      }).success,
    ).toBe(false);
    expect(
      updateUmkmProfileSchema.safeParse({
        provenance: { validation_status: "VALIDATED", validated_at: timestamp },
      }).success,
    ).toBe(false);
  });

  it("does not accept owner identity from a UMKM create payload", () => {
    const validPayload = {
      business_name: "TEST UMKM",
      category: "TEST CATEGORY",
      geometry: { type: "Point" as const, coordinates: [0, 0] },
    };

    expect(createUmkmProfileSchema.safeParse(validPayload).success).toBe(true);
    expect(
      createUmkmProfileSchema.safeParse({
        ...validPayload,
        owner_id: "30000000-0000-4000-8000-000000000001",
      }).success,
    ).toBe(false);
    expect(
      createUmkmProfileSchema.safeParse({
        ...validPayload,
        provenance: { source_id: sourceId },
      }).success,
    ).toBe(false);
  });

  it("computes or accepts only Phase 3-consistent offsets", () => {
    expect(
      paginationQuerySchema.parse({ page: "3", limit: "10" }),
    ).toEqual({ page: 3, limit: 10, offset: 20 });

    expect(
      paginationQuerySchema.parse({ limit: "10", offset: "20" }),
    ).toEqual({ page: 3, limit: 10, offset: 20 });

    expect(
      paginationQuerySchema.safeParse({ page: "2", limit: "10", offset: "20" })
        .success,
    ).toBe(false);
  });

  it("validates ordered WGS84 bounds and positive near radii", () => {
    expect(
      boundingBoxSchema.parse({
        min_lng: "106.7",
        min_lat: "-6.3",
        max_lng: "106.9",
        max_lat: "-6.1",
      }),
    ).toEqual({
      min_lng: 106.7,
      min_lat: -6.3,
      max_lng: 106.9,
      max_lat: -6.1,
    });
    expect(
      boundingBoxSchema.safeParse({
        min_lng: 10,
        min_lat: 0,
        max_lng: 9,
        max_lat: 1,
      }).success,
    ).toBe(false);
    expect(
      nearPointSchema.parse({
        longitude: "106.8",
        latitude: "-6.2",
        radius_meters: "1000",
      }),
    ).toEqual({ longitude: 106.8, latitude: -6.2, radius_meters: 1_000 });
    expect(
      nearPointSchema.safeParse({
        longitude: 106.8,
        latitude: -6.2,
        radius_meters: 0,
      }).success,
    ).toBe(false);
  });

  it("uses whitelist-only filters and sorting", () => {
    expect(
      transportNodeFilterSchema.parse({
        transport_mode: "TEST MODE",
        validation_status: "PENDING",
      }),
    ).toEqual({
      transport_mode: "TEST MODE",
      validation_status: "PENDING",
    });

    expect(
      transportNodeFilterSchema.safeParse({ raw_sql: "id desc" }).success,
    ).toBe(false);
    expect(
      studyAreaSortSchema.parse({ sort: "name", order: "asc" }),
    ).toEqual({ sort: "name", order: "asc" });
    expect(
      studyAreaSortSchema.safeParse({ sort: "geometry", order: "asc" }).success,
    ).toBe(false);
  });
});
