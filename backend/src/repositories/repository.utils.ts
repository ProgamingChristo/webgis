import { RepositoryError } from "@/src/repositories/errors";
import type { ZodType } from "zod";
import type {
  CreateProvenanceInput,
  UpdateProvenanceInput,
} from "@/src/types/provenance";

export function mapRepositoryRow<TRow, TDTO>(
  row: unknown,
  mapper: (value: TRow) => TDTO,
  operation: string,
): TDTO {
  try {
    return mapper(row as TRow);
  } catch (error) {
    throw new RepositoryError("DATABASE_ERROR", operation, { cause: error });
  }
}

export function mapRepositoryRows<TRow, TDTO>(
  rows: unknown[] | null,
  mapper: (value: TRow) => TDTO,
  operation: string,
): TDTO[] {
  return (rows ?? []).map((row) =>
    mapRepositoryRow(row, mapper, operation),
  );
}

export function normalizeRepositoryRows(
  value: unknown,
  operation: string,
): unknown[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new RepositoryError("DATABASE_ERROR", operation);
  }

  return value;
}

export function parseRepositoryInput<T>(
  schema: ZodType<T>,
  input: unknown,
  operation: string,
): T {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    throw new RepositoryError("VALIDATION_ERROR", operation, {
      cause: parsed.error,
    });
  }

  return parsed.data;
}

export function createProvenanceColumns(
  provenance: CreateProvenanceInput,
): Record<string, unknown> {
  const columns: Record<string, unknown> = {
    data_version: provenance.data_version ?? "1",
    metadata: provenance.metadata ?? {},
    source_id: provenance.source_id ?? null,
    source_record_id: provenance.source_record_id ?? null,
    validated_at: provenance.validated_at ?? null,
    validation_status: provenance.validation_status ?? "PENDING",
  };

  if (provenance.retrieved_at !== undefined) {
    columns.retrieved_at = provenance.retrieved_at;
  }

  return columns;
}

export function updateProvenanceColumns(
  provenance: UpdateProvenanceInput | undefined,
): Record<string, unknown> {
  if (!provenance) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(provenance).filter(([, value]) => value !== undefined),
  );
}
