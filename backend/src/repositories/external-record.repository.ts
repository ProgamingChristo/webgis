import "server-only";

import type {
  ProvenanceEntityKind,
  ProvenanceRecord,
  ProvenanceRepository,
} from "@/src/repositories/provenance.repository";
import type { TransportNodeRepository } from "@/src/repositories/transport-node.repository";
import type { TransportNodeDTO } from "@/src/types/domain";
import type { ExternalEntityWrite } from "@/src/types/integrations/external-record";

type ProvenanceLookup = Pick<
  ProvenanceRepository,
  "existsBySourceRecordId" | "findByExternalRecordId"
>;

type TransportNodeWriter = Pick<TransportNodeRepository, "create" | "update">;

export interface ExternalRecordRepositoryContract {
  createNormalizedRecord(
    record: ExternalEntityWrite,
  ): Promise<TransportNodeDTO>;
  existsBySourceRecordId(
    kind: ProvenanceEntityKind,
    sourceId: string,
    sourceRecordId: string,
  ): Promise<boolean>;
  findBySourceRecordId(
    kind: ProvenanceEntityKind,
    sourceId: string,
    sourceRecordId: string,
  ): Promise<ProvenanceRecord | null>;
  updateNormalizedRecord(
    entityId: string,
    record: ExternalEntityWrite,
  ): Promise<TransportNodeDTO>;
}

/**
 * Composition facade over Phase 5 repositories. It does not store raw payloads
 * and never accepts a table name from provider input.
 */
export class ExternalRecordRepository
  implements ExternalRecordRepositoryContract
{
  constructor(
    private readonly provenance: ProvenanceLookup,
    private readonly transportNodes: TransportNodeWriter,
  ) {}

  findBySourceRecordId(
    kind: ProvenanceEntityKind,
    sourceId: string,
    sourceRecordId: string,
  ): Promise<ProvenanceRecord | null> {
    return this.provenance.findByExternalRecordId(
      kind,
      sourceId,
      sourceRecordId,
    );
  }

  existsBySourceRecordId(
    kind: ProvenanceEntityKind,
    sourceId: string,
    sourceRecordId: string,
  ): Promise<boolean> {
    return this.provenance.existsBySourceRecordId(
      kind,
      sourceId,
      sourceRecordId,
    );
  }

  createNormalizedRecord(
    record: ExternalEntityWrite,
  ): Promise<TransportNodeDTO> {
    return this.transportNodes.create(record.create_input);
  }

  updateNormalizedRecord(
    entityId: string,
    record: ExternalEntityWrite,
  ): Promise<TransportNodeDTO> {
    return this.transportNodes.update(entityId, record.update_input);
  }
}
