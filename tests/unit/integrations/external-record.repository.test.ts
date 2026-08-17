import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { ExternalRecordRepository } from "@/src/repositories/external-record.repository";
import type { ExternalEntityWrite } from "@/src/types/integrations/external-record";

const sourceId = "10000000-0000-4000-8000-000000000001";

const mappedRecord: ExternalEntityWrite = {
  create_input: {
    corridor_id: null,
    geometry: { coordinates: [0, 0], type: "Point" },
    name: "TEST NODE",
    node_type: "TEST_NODE",
    provenance: {
      data_version: "fixture-v1",
      metadata: { fixture: true },
      retrieved_at: "2026-08-16T00:00:00.000Z",
      source_id: sourceId,
      source_record_id: "TEST-001",
      validated_at: null,
      validation_status: "PENDING",
    },
    transport_mode: "TEST_MODE",
  },
  entity_kind: "transport_node",
  update_input: {
    name: "TEST NODE",
    provenance: {
      validation_status: "PENDING",
      validated_at: null,
    },
  },
};

function createRepository() {
  const provenance = {
    existsBySourceRecordId: vi.fn().mockResolvedValue(false),
    findByExternalRecordId: vi.fn().mockResolvedValue(null),
  };
  const transportNodes = {
    create: vi.fn().mockResolvedValue({ id: "TEST-ENTITY" }),
    update: vi.fn().mockResolvedValue({ id: "TEST-ENTITY" }),
  };
  const repository = new ExternalRecordRepository(
    provenance as never,
    transportNodes as never,
  );

  return { provenance, repository, transportNodes };
}

describe("ExternalRecordRepository", () => {
  it("delegates source-record lookup to the Phase 5 provenance repository", async () => {
    const { provenance, repository } = createRepository();

    await repository.findBySourceRecordId(
      "transport_node",
      sourceId,
      "TEST-001",
    );

    expect(provenance.findByExternalRecordId).toHaveBeenCalledWith(
      "transport_node",
      sourceId,
      "TEST-001",
    );
  });

  it("delegates duplicate detection to the Phase 5 provenance repository", async () => {
    const { provenance, repository } = createRepository();

    await expect(
      repository.existsBySourceRecordId(
        "transport_node",
        sourceId,
        "TEST-001",
      ),
    ).resolves.toBe(false);
    expect(provenance.existsBySourceRecordId).toHaveBeenCalledWith(
      "transport_node",
      sourceId,
      "TEST-001",
    );
  });

  it("creates only through the whitelisted transport-node repository", async () => {
    const { repository, transportNodes } = createRepository();

    await repository.createNormalizedRecord(mappedRecord);

    expect(transportNodes.create).toHaveBeenCalledWith(mappedRecord.create_input);
  });

  it("updates only through the whitelisted transport-node repository", async () => {
    const { repository, transportNodes } = createRepository();

    await repository.updateNormalizedRecord("TEST-ENTITY", mappedRecord);

    expect(transportNodes.update).toHaveBeenCalledWith(
      "TEST-ENTITY",
      mappedRecord.update_input,
    );
  });
});
