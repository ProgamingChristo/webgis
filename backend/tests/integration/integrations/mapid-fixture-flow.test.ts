import { randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import validFixture from "@/tests/fixtures/mapid/valid-response.fixture.json";
import { MapidAdapter } from "@/src/integrations/mapid/mapid.adapter";
import { MapidTestFixtureNormalizer } from "@/src/integrations/mapid/mapid.normalizer";
import { MapidTestFixtureResponseValidator } from "@/src/integrations/mapid/mapid.schema";
import {
  MAPID_PROVIDER,
  type MapidClientPort,
  type MapidRequestContext,
} from "@/src/integrations/mapid/mapid.types";
import type { Logger } from "@/src/lib/logger";
import { ExternalDataService } from "@/src/services/external-data/external-data.service";
import type { TransportNodeDTO } from "@/src/types/domain";
import type { ExternalEntityWrite } from "@/src/types/integrations/external-record";

const sourceId = "22222222-2222-4222-8222-222222222222";
const requestContext: MapidRequestContext = {
  data_version: "TEST-fixture-v1",
  request_id: "phase6-integration-request",
  retrieved_at: "2026-08-16T01:00:00.000Z",
  source_id: sourceId,
};
const processInput = {
  context: requestContext,
  dryRun: true,
  provider: MAPID_PROVIDER,
  query: { path: "/TEST-FIXTURE-NOT-PRODUCTION" },
} as const;

class InMemoryExternalRecordRepository {
  readonly writes: ExternalEntityWrite[] = [];
  private readonly identities = new Set<string>();

  async existsBySourceRecordId(
    kind: "transport_node",
    recordSourceId: string,
    sourceRecordId: string,
  ): Promise<boolean> {
    return this.identities.has(
      this.identity(kind, recordSourceId, sourceRecordId),
    );
  }

  async createNormalizedRecord(
    record: ExternalEntityWrite,
  ): Promise<TransportNodeDTO> {
    const provenance = record.create_input.provenance;
    const recordSourceId = provenance.source_id;
    const sourceRecordId = provenance.source_record_id;

    if (!recordSourceId || !sourceRecordId) {
      throw new Error("TEST repository requires external provenance identity");
    }

    this.identities.add(
      this.identity(record.entity_kind, recordSourceId, sourceRecordId),
    );
    this.writes.push(record);

    const now = "2026-08-16T01:00:01.000Z";
    return {
      corridor_id: record.create_input.corridor_id ?? null,
      created_at: now,
      geometry: record.create_input.geometry,
      id: randomUUID(),
      name: record.create_input.name,
      node_type: record.create_input.node_type,
      provenance: {
        data_version: provenance.data_version ?? "1",
        metadata: provenance.metadata ?? {},
        retrieved_at: provenance.retrieved_at ?? now,
        source_id: recordSourceId,
        source_record_id: sourceRecordId,
        source_type: "external",
        validated_at: provenance.validated_at ?? null,
        validation_status: provenance.validation_status ?? "PENDING",
      },
      transport_mode: record.create_input.transport_mode,
      updated_at: now,
    };
  }

  private identity(
    kind: "transport_node",
    recordSourceId: string,
    sourceRecordId: string,
  ): string {
    return `${kind}:${recordSourceId}:${sourceRecordId}`;
  }
}

function createFixturePipeline(records: InMemoryExternalRecordRepository) {
  const client = {
    request: vi.fn(async () => validFixture as unknown),
  } satisfies MapidClientPort;
  const adapter = new MapidAdapter(
    client,
    new MapidTestFixtureResponseValidator(),
    new MapidTestFixtureNormalizer(),
  );
  const logger = {
    error: vi.fn(),
    info: vi.fn(),
  } satisfies Logger;
  const service = new ExternalDataService(adapter, records, {
    clock: () => new Date("2026-08-16T01:00:01.000Z"),
    logger,
    persistenceEnabled: true,
  });

  return { client, logger, service };
}

describe("MAPID TEST fixture integration flow", () => {
  it("runs client, validator, normalizer, adapter, service, and duplicate lookup with zero dry-run writes", async () => {
    const records = new InMemoryExternalRecordRepository();
    const { client, logger, service } = createFixturePipeline(records);
    const result = await service.processExternalData(processInput);

    expect(client.request).toHaveBeenCalledWith(processInput.query);
    expect(result).toMatchObject({
      dry_run: true,
      duplicate_records: [],
      new_records: 2,
      parsed_records: 2,
      persisted_records: 0,
      provider: MAPID_PROVIDER,
      status: "ok",
    });
    expect(result.normalized_records).toHaveLength(2);
    expect(result.normalized_records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          data_version: requestContext.data_version,
          metadata: {
            contract: "GETRA_MAPID_TEST_FIXTURE_V1",
            fixture: true,
            provider: MAPID_PROVIDER,
          },
          provider: MAPID_PROVIDER,
          retrieved_at: requestContext.retrieved_at,
          source_id: sourceId,
          source_record_id: "TEST-MAPID-NODE-001",
          validation_status: "PENDING",
        }),
      ]),
    );
    expect(records.writes).toHaveLength(0);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("persists TEST fixture records once and detects them as repository duplicates on replay", async () => {
    const records = new InMemoryExternalRecordRepository();
    const { service } = createFixturePipeline(records);
    const persistInput = { ...processInput, dryRun: false } as const;

    const first = await service.processExternalData(persistInput);
    const replay = await service.processExternalData(persistInput);

    expect(first).toMatchObject({
      duplicate_records: [],
      new_records: 2,
      persisted_records: 2,
      status: "ok",
    });
    expect(records.writes).toHaveLength(2);
    expect(records.writes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          create_input: expect.objectContaining({
            provenance: expect.objectContaining({
              source_id: sourceId,
              source_record_id: "TEST-MAPID-NODE-001",
              validation_status: "PENDING",
            }),
          }),
          entity_kind: "transport_node",
        }),
      ]),
    );
    expect(replay).toMatchObject({
      new_records: 0,
      persisted_records: 0,
      status: "ok",
    });
    expect(replay.duplicate_records).toEqual([
      {
        detected_by: "repository",
        entity_kind: "transport_node",
        source_record_id: "TEST-MAPID-NODE-001",
      },
      {
        detected_by: "repository",
        entity_kind: "transport_node",
        source_record_id: "TEST-MAPID-NODE-002",
      },
    ]);
    expect(records.writes).toHaveLength(2);
  });
});
