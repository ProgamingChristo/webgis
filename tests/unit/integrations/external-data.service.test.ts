import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { ExternalDataProvider } from "@/src/integrations/core";
import { MapidError } from "@/src/integrations/mapid/mapid.errors";
import {
  MAPID_PROVIDER,
  type MapidNormalizedBatch,
  type MapidNormalizedRecord,
  type MapidRequest,
  type MapidRequestContext,
  type MapidValidatedBatch,
} from "@/src/integrations/mapid/mapid.types";
import type { Logger } from "@/src/lib/logger";
import type { ExternalRecordRepositoryContract } from "@/src/repositories/external-record.repository";
import { RepositoryError } from "@/src/repositories/errors";
import { ExternalDataService } from "@/src/services/external-data/external-data.service";
import type { TransportNodeDTO } from "@/src/types/domain";
import type { ExternalEntityWrite } from "@/src/types/integrations/external-record";

type Adapter = ExternalDataProvider<
  MapidRequest,
  MapidRequestContext,
  MapidValidatedBatch,
  MapidNormalizedBatch
>;

type RecordPort = Pick<
  ExternalRecordRepositoryContract,
  "createNormalizedRecord" | "existsBySourceRecordId"
>;

const context: MapidRequestContext = {
  data_version: "TEST-v1",
  request_id: "phase6-unit-request",
  retrieved_at: "2026-08-16T00:00:00.000Z",
  source_id: "11111111-1111-4111-8111-111111111111",
};

const processInput = {
  context,
  dryRun: true,
  provider: MAPID_PROVIDER,
  query: { path: "/TEST-FIXTURE-NOT-PRODUCTION" },
} as const;

function normalizedRecord(
  sourceRecordId = "TEST-MAPID-NODE-001",
): MapidNormalizedRecord {
  return {
    data_version: context.data_version,
    entity_kind: "transport_node",
    geometry: { coordinates: [0, 0], type: "Point" },
    metadata: {
      contract: "GETRA_MAPID_TEST_FIXTURE_V1",
      fixture: true,
      provider: MAPID_PROVIDER,
    },
    properties: {
      corridor_id: null,
      name: "TEST MAPID NODE",
      node_type: "TEST_NODE",
      transport_mode: "TEST_MODE",
    },
    provider: MAPID_PROVIDER,
    retrieved_at: context.retrieved_at,
    source_id: context.source_id,
    source_record_id: sourceRecordId,
    validation_status: "PENDING",
  };
}

function normalizedBatch(
  records: MapidNormalizedRecord[],
): MapidNormalizedBatch {
  return {
    contract: "GETRA_MAPID_TEST_FIXTURE_V1",
    invalid_records: [],
    received_count: records.length,
    records,
  };
}

function createAdapter(batch: MapidNormalizedBatch) {
  const validated: MapidValidatedBatch = {
    contract: "GETRA_MAPID_TEST_FIXTURE_V1",
    invalid_records: batch.invalid_records,
    received_count: batch.received_count,
    records: [],
  };
  const raw = { fixture: "TEST ONLY" };
  const adapter = {
    fetch: vi.fn(async () => raw),
    normalize: vi.fn(() => batch),
    validate: vi.fn(() => validated),
  } satisfies Adapter;

  return { adapter, raw, validated };
}

function createRecordPort(exists = false) {
  return {
    createNormalizedRecord: vi.fn(
      async () => ({ id: "unused-test-result" }) as TransportNodeDTO,
    ),
    existsBySourceRecordId: vi.fn(async () => exists),
  } satisfies RecordPort;
}

function createLogger() {
  return {
    error: vi.fn(),
    info: vi.fn(),
  } satisfies Logger;
}

function createService(
  adapter: Adapter,
  records: RecordPort,
  options: {
    logger?: Logger;
    mapper?: (record: MapidNormalizedRecord) => ExternalEntityWrite;
    persistenceEnabled?: boolean;
  } = {},
) {
  return new ExternalDataService(adapter, records, {
    clock: () => new Date("2026-08-16T00:00:01.000Z"),
    ...options,
  });
}

describe("ExternalDataService", () => {
  it("reports a new record while guaranteeing zero writes in dry-run mode", async () => {
    const record = normalizedRecord();
    const { adapter, raw, validated } = createAdapter(
      normalizedBatch([record]),
    );
    const records = createRecordPort(false);
    const logger = createLogger();
    const result = await createService(adapter, records, { logger })
      .processExternalData(processInput);

    expect(result).toMatchObject({
      dry_run: true,
      duplicate_records: [],
      new_records: 1,
      parsed_records: 1,
      persisted_records: 0,
      provider: MAPID_PROVIDER,
      status: "ok",
    });
    expect(adapter.fetch).toHaveBeenCalledWith(
      processInput.query,
      processInput.context,
    );
    expect(adapter.validate).toHaveBeenCalledWith(raw);
    expect(adapter.normalize).toHaveBeenCalledWith(validated, context);
    expect(records.existsBySourceRecordId).toHaveBeenCalledWith(
      "transport_node",
      context.source_id,
      record.source_record_id,
    );
    expect(records.createNormalizedRecord).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      "External integration completed",
      expect.objectContaining({
        duplicate_count: 0,
        invalid_count: 0,
        operation: "dry_run",
        provider: MAPID_PROVIDER,
        record_count: 1,
        request_id: context.request_id,
        status: "ok",
      }),
    );
  });

  it("detects a duplicate inside one provider dataset before a second repository lookup", async () => {
    const record = normalizedRecord("TEST-MAPID-DATASET-DUPLICATE");
    const { adapter } = createAdapter(normalizedBatch([record, record]));
    const records = createRecordPort(false);
    const result = await createService(adapter, records, {
      logger: createLogger(),
    }).processExternalData(processInput);

    expect(result.new_records).toBe(1);
    expect(result.duplicate_records).toEqual([
      {
        detected_by: "batch",
        entity_kind: "transport_node",
        source_record_id: record.source_record_id,
      },
    ]);
    expect(records.existsBySourceRecordId).toHaveBeenCalledTimes(1);
    expect(records.createNormalizedRecord).not.toHaveBeenCalled();
  });

  it("reports a duplicate already present in the repository", async () => {
    const record = normalizedRecord("TEST-MAPID-REPOSITORY-DUPLICATE");
    const { adapter } = createAdapter(normalizedBatch([record]));
    const records = createRecordPort(true);
    const result = await createService(adapter, records, {
      logger: createLogger(),
    }).processExternalData(processInput);

    expect(result.new_records).toBe(0);
    expect(result.persisted_records).toBe(0);
    expect(result.duplicate_records).toEqual([
      {
        detected_by: "repository",
        entity_kind: "transport_node",
        source_record_id: record.source_record_id,
      },
    ]);
    expect(records.createNormalizedRecord).not.toHaveBeenCalled();
  });

  it("rejects persistence before fetching when the persistence gate is disabled", async () => {
    const { adapter } = createAdapter(normalizedBatch([normalizedRecord()]));
    const records = createRecordPort(false);
    const logger = createLogger();
    const service = createService(adapter, records, { logger });

    await expect(
      service.processExternalData({ ...processInput, dryRun: false }),
    ).rejects.toMatchObject({ code: "MAPID_CONFIGURATION_ERROR" });
    expect(adapter.fetch).not.toHaveBeenCalled();
    expect(records.existsBySourceRecordId).not.toHaveBeenCalled();
    expect(records.createNormalizedRecord).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      "External integration failed",
      expect.objectContaining({
        error_code: "MAPID_CONFIGURATION_ERROR",
        operation: "persist",
        request_id: context.request_id,
        status: "error",
      }),
    );
  });

  it("persists a new record through an explicitly enabled fake persistence port", async () => {
    const record = normalizedRecord("TEST-MAPID-PERSIST-001");
    const { adapter } = createAdapter(normalizedBatch([record]));
    const records = createRecordPort(false);
    const mapped = {
      create_input: {
        corridor_id: null,
        geometry: record.geometry,
        name: record.properties.name,
        node_type: record.properties.node_type,
        provenance: {
          source_id: record.source_id,
          source_record_id: record.source_record_id,
        },
        transport_mode: record.properties.transport_mode,
      },
      entity_kind: "transport_node",
      update_input: { name: record.properties.name },
    } satisfies ExternalEntityWrite;
    const mapper = vi.fn(() => mapped);
    const result = await createService(adapter, records, {
      logger: createLogger(),
      mapper,
      persistenceEnabled: true,
    }).processExternalData({ ...processInput, dryRun: false });

    expect(result).toMatchObject({
      new_records: 1,
      persisted_records: 1,
      status: "ok",
    });
    expect(mapper).toHaveBeenCalledWith(record);
    expect(records.createNormalizedRecord).toHaveBeenCalledWith(mapped);
  });

  it("maps a persistence uniqueness conflict to a constraint duplicate", async () => {
    const record = normalizedRecord("TEST-MAPID-CONSTRAINT-DUPLICATE");
    const { adapter } = createAdapter(normalizedBatch([record]));
    const records = createRecordPort(false);
    records.createNormalizedRecord.mockRejectedValueOnce(
      new RepositoryError("CONFLICT", "test.createNormalizedRecord"),
    );
    const result = await createService(adapter, records, {
      logger: createLogger(),
      persistenceEnabled: true,
    }).processExternalData({ ...processInput, dryRun: false });

    expect(result.new_records).toBe(0);
    expect(result.persisted_records).toBe(0);
    expect(result.duplicate_records).toEqual([
      {
        detected_by: "constraint",
        entity_kind: "transport_node",
        source_record_id: record.source_record_id,
      },
    ]);
  });

  it("maps unexpected failures without leaking their raw secret-bearing message to logs", async () => {
    const { adapter } = createAdapter(normalizedBatch([normalizedRecord()]));
    adapter.fetch.mockRejectedValueOnce(
      new Error("MAPID_API_KEY=TEST-SHOULD-NEVER-APPEAR"),
    );
    const logger = createLogger();
    const service = createService(adapter, createRecordPort(false), { logger });

    await expect(service.processExternalData(processInput)).rejects.toEqual(
      expect.objectContaining<Partial<MapidError>>({
        code: "MAPID_UPSTREAM_ERROR",
        message: "MAPID upstream request failed",
      }),
    );

    const serializedLogs = JSON.stringify([
      ...logger.info.mock.calls,
      ...logger.error.mock.calls,
    ]);
    expect(serializedLogs).not.toContain("TEST-SHOULD-NEVER-APPEAR");
    expect(serializedLogs).not.toContain("MAPID_API_KEY");
    expect(logger.error).toHaveBeenCalledWith(
      "External integration failed",
      expect.objectContaining({ error_code: "MAPID_UPSTREAM_ERROR" }),
    );
  });

  it("rejects an unsafe request context before provider access or logging", async () => {
    const { adapter } = createAdapter(normalizedBatch([normalizedRecord()]));
    const records = createRecordPort(false);
    const logger = createLogger();
    const unsafeRequestId = "safe-line\nMAPID_API_KEY=TEST-SHOULD-NOT-LOG";
    const service = createService(adapter, records, { logger });

    await expect(
      service.processExternalData({
        ...processInput,
        context: { ...context, request_id: unsafeRequestId },
      }),
    ).rejects.toMatchObject({ code: "MAPID_CONFIGURATION_ERROR" });

    expect(adapter.fetch).not.toHaveBeenCalled();
    expect(records.existsBySourceRecordId).not.toHaveBeenCalled();
    const serializedLogs = JSON.stringify(logger.error.mock.calls);
    expect(serializedLogs).not.toContain(unsafeRequestId);
    expect(serializedLogs).not.toContain("TEST-SHOULD-NOT-LOG");
    expect(logger.error).toHaveBeenCalledWith(
      "External integration failed",
      expect.objectContaining({ request_id: "unavailable" }),
    );
  });
});
