import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { mapDatabaseError, RepositoryError } from "@/src/repositories/errors";
import {
  mapRepositoryRow,
  parseRepositoryInput,
} from "@/src/repositories/repository.utils";
import { metadataSchema } from "@/src/schemas/data-model.schema";
import type {
  JsonObject,
  ValidationStatus,
} from "@/src/types/provenance";

export const provenanceEntityKinds = [
  "study_area",
  "transport_corridor",
  "transport_node",
  "umkm_profile",
] as const;

export type ProvenanceEntityKind = (typeof provenanceEntityKinds)[number];

const provenanceTables: Record<ProvenanceEntityKind, string> = {
  study_area: "study_areas",
  transport_corridor: "transport_corridors",
  transport_node: "transport_nodes",
  umkm_profile: "umkm_profiles",
};

export type ProvenanceRecord = {
  entity_kind: ProvenanceEntityKind;
  entity_id: string;
  source_id: string;
  source_record_id: string;
  data_version: string;
  validation_status: ValidationStatus;
  retrieved_at: string;
  validated_at: string | null;
  metadata: JsonObject;
};

type ProvenanceDatabaseRow = Omit<
  ProvenanceRecord,
  "entity_kind" | "entity_id" | "metadata"
> & {
  id: string;
  metadata: unknown;
};

const PROVENANCE_COLUMNS =
  "id, source_id, source_record_id, data_version, validation_status, retrieved_at, validated_at, metadata";

function resolveProvenanceTable(kind: ProvenanceEntityKind): string {
  const table = provenanceTables[kind];

  if (!table) {
    throw new RepositoryError(
      "VALIDATION_ERROR",
      "provenance.resolveEntityKind",
    );
  }

  return table;
}

function mapProvenanceRecord(
  kind: ProvenanceEntityKind,
  row: ProvenanceDatabaseRow,
): ProvenanceRecord {
  return {
    data_version: row.data_version,
    entity_id: row.id,
    entity_kind: kind,
    metadata: metadataSchema.parse(row.metadata),
    retrieved_at: row.retrieved_at,
    source_id: row.source_id,
    source_record_id: row.source_record_id,
    validated_at: row.validated_at,
    validation_status: row.validation_status,
  };
}

export class ProvenanceRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findByExternalRecordId(
    kind: ProvenanceEntityKind,
    sourceId: string,
    sourceRecordId: string,
  ): Promise<ProvenanceRecord | null> {
    const table = resolveProvenanceTable(kind);
    const parsedSourceId = parseRepositoryInput(
      z.string().uuid(),
      sourceId,
      "provenance.findByExternalRecordId.validateSource",
    );
    const parsedSourceRecordId = parseRepositoryInput(
      z.string().trim().min(1).max(256),
      sourceRecordId,
      "provenance.findByExternalRecordId.validateRecord",
    );
    const { data, error } = await this.supabase
      .from(table)
      .select(PROVENANCE_COLUMNS)
      .eq("source_id", parsedSourceId)
      .eq("source_record_id", parsedSourceRecordId)
      .maybeSingle();

    if (error) {
      throw mapDatabaseError(error, "provenance.findByExternalRecordId");
    }

    return data
      ? mapRepositoryRow<ProvenanceDatabaseRow, ProvenanceRecord>(
          data,
          (row) => mapProvenanceRecord(kind, row),
          "provenance.findByExternalRecordId.map",
        )
      : null;
  }

  async existsBySourceRecordId(
    kind: ProvenanceEntityKind,
    sourceId: string,
    sourceRecordId: string,
  ): Promise<boolean> {
    const table = resolveProvenanceTable(kind);
    const parsedSourceId = parseRepositoryInput(
      z.string().uuid(),
      sourceId,
      "provenance.existsBySourceRecordId.validateSource",
    );
    const parsedSourceRecordId = parseRepositoryInput(
      z.string().trim().min(1).max(256),
      sourceRecordId,
      "provenance.existsBySourceRecordId.validateRecord",
    );
    const { count, error } = await this.supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("source_id", parsedSourceId)
      .eq("source_record_id", parsedSourceRecordId);

    if (error) {
      throw mapDatabaseError(error, "provenance.existsBySourceRecordId");
    }

    return (count ?? 0) > 0;
  }
}
