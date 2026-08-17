import { describe, expect, it, vi } from "vitest";

import duplicateResponseFixture from "@/tests/fixtures/mapid/duplicate-record.fixture.json";
import emptyResponseFixture from "@/tests/fixtures/mapid/empty-response.fixture.json";
import invalidResponseFixture from "@/tests/fixtures/mapid/invalid-response.fixture.json";
import validResponseFixture from "@/tests/fixtures/mapid/valid-response.fixture.json";

vi.mock("server-only", () => ({}));

import { mapMapidRecordToExternalEntityInput } from "@/src/integrations/mapid/mapid.mapper";
import { MapidTestFixtureNormalizer } from "@/src/integrations/mapid/mapid.normalizer";
import {
  MAPID_TEST_CONTRACT,
  MapidTestFixtureResponseValidator,
} from "@/src/integrations/mapid/mapid.schema";
import type {
  MapidNormalizedBatch,
  MapidRequestContext,
} from "@/src/integrations/mapid/mapid.types";

const requestContext: MapidRequestContext = {
  data_version: "TEST-V1",
  request_id: "phase-06-mapid-contract-test",
  retrieved_at: "2026-08-16T01:00:00.000Z",
  source_id: "92000000-0000-4000-8000-000000000000",
};

function validateAndNormalize(raw: unknown): MapidNormalizedBatch {
  const validator = new MapidTestFixtureResponseValidator();
  const normalizer = new MapidTestFixtureNormalizer();

  return normalizer.normalize({
    context: requestContext,
    validated: validator.validate(raw),
  });
}

describe("MAPID fixture-only response contract", () => {
  const validator = new MapidTestFixtureResponseValidator();

  it("accepts the valid TEST fixture", () => {
    const result = validator.validate(validResponseFixture);

    expect(result).toMatchObject({
      contract: MAPID_TEST_CONTRACT,
      invalid_records: [],
      received_count: 2,
    });
    expect(result.records).toHaveLength(2);
    expect(result.records[0]).toMatchObject({
      entity_kind: "transport_node",
      external_id: "TEST-MAPID-NODE-001",
      geometry: { coordinates: [0, 0], type: "Point" },
    });
  });

  it("reports every invalid record from the invalid TEST fixture", () => {
    const result = validator.validate(invalidResponseFixture);

    expect(result).toEqual({
      contract: MAPID_TEST_CONTRACT,
      invalid_records: [
        { index: 0, reason: "INVALID_TEST_RECORD" },
        { index: 1, reason: "INVALID_TEST_RECORD" },
      ],
      received_count: 2,
      records: [],
    });
  });

  it("accepts the explicitly empty TEST fixture as an empty batch", () => {
    expect(validator.validate(emptyResponseFixture)).toEqual({
      contract: MAPID_TEST_CONTRACT,
      invalid_records: [],
      received_count: 0,
      records: [],
    });
  });

  it.each([null, {}])("rejects a non-contract boundary value: %j", (raw) => {
    expect(() => validator.validate(raw)).toThrowError(
      expect.objectContaining({
        code: "MAPID_INVALID_RESPONSE",
        message: "MAPID response is invalid",
      }),
    );
  });

  it("marks a record with a missing required field as invalid", () => {
    const result = validator.validate({
      ...invalidResponseFixture,
      records: [invalidResponseFixture.records[0]],
    });

    expect(result.records).toEqual([]);
    expect(result.invalid_records).toEqual([
      { index: 0, reason: "INVALID_TEST_RECORD" },
    ]);
  });

  it("marks an unexpected geometry type as invalid", () => {
    const result = validator.validate({
      ...invalidResponseFixture,
      records: [invalidResponseFixture.records[1]],
    });

    expect(result.records).toEqual([]);
    expect(result.invalid_records).toEqual([
      { index: 0, reason: "INVALID_TEST_RECORD" },
    ]);
  });
});

describe("MAPID fixture normalization and mapping", () => {
  it("normalizes provenance as PENDING without claiming provider validation", () => {
    const normalized = validateAndNormalize(validResponseFixture);

    expect(normalized.records).toHaveLength(2);
    expect(normalized.records[0]).toMatchObject({
      data_version: requestContext.data_version,
      entity_kind: "transport_node",
      provider: "MAPID",
      retrieved_at: requestContext.retrieved_at,
      source_id: requestContext.source_id,
      source_record_id: "TEST-MAPID-NODE-001",
      validation_status: "PENDING",
    });
    expect(normalized.records.every((record) =>
      record.validation_status === "PENDING"
    )).toBe(true);
  });

  it("maps normalized records to separate create and immutable-source update contracts", () => {
    const record = validateAndNormalize(validResponseFixture).records[0];
    const mapped = mapMapidRecordToExternalEntityInput(record);

    expect(mapped.entity_kind).toBe("transport_node");
    expect(mapped.create_input).toMatchObject({
      corridor_id: null,
      geometry: { coordinates: [0, 0], type: "Point" },
      name: "TEST MAPID NODE A",
      node_type: "TEST_NODE",
      provenance: {
        data_version: requestContext.data_version,
        retrieved_at: requestContext.retrieved_at,
        source_id: requestContext.source_id,
        source_record_id: "TEST-MAPID-NODE-001",
        validated_at: null,
        validation_status: "PENDING",
      },
      transport_mode: "TEST_MODE",
    });
    expect(mapped.update_input.provenance).toMatchObject({
      data_version: requestContext.data_version,
      retrieved_at: requestContext.retrieved_at,
      validated_at: null,
      validation_status: "PENDING",
    });
    expect(mapped.update_input.provenance).not.toHaveProperty("source_id");
    expect(mapped.update_input.provenance).not.toHaveProperty(
      "source_record_id",
    );
  });

  it("keeps normalized and mapped metadata allowlisted without raw or sensitive fields", () => {
    const normalized = validateAndNormalize(duplicateResponseFixture);
    const record = normalized.records[0];
    const mapped = mapMapidRecordToExternalEntityInput(record);

    expect(record.metadata).toEqual({
      contract: MAPID_TEST_CONTRACT,
      fixture: true,
      provider: "MAPID",
    });
    expect(Object.keys(record.metadata).sort()).toEqual([
      "contract",
      "fixture",
      "provider",
    ]);
    expect(record.metadata).not.toHaveProperty("raw");
    expect(record.metadata).not.toHaveProperty("api_key");
    expect(record.metadata).not.toHaveProperty("authorization");
    expect(record.metadata).not.toHaveProperty("token");
    expect(mapped.create_input.provenance.metadata).toEqual(record.metadata);
    expect(mapped.update_input.provenance?.metadata).toEqual(record.metadata);
  });
});
