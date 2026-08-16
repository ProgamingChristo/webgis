import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  ProvenanceRepository,
  type ProvenanceEntityKind,
} from "@/src/repositories/provenance.repository";
import { RepositoryError } from "@/src/repositories/errors";

const SOURCE_ID = "10000000-0000-4000-8000-000000000001";
const ENTITY_ID = "20000000-0000-4000-8000-000000000001";
const RETRIEVED_AT = "2026-08-16T00:00:00.000Z";
const PROVENANCE_COLUMNS =
  "id, source_id, source_record_id, data_version, validation_status, retrieved_at, validated_at, metadata";

const entityTables: ReadonlyArray<[ProvenanceEntityKind, string]> = [
  ["study_area", "study_areas"],
  ["transport_corridor", "transport_corridors"],
  ["transport_node", "transport_nodes"],
  ["umkm_profile", "umkm_profiles"],
];

function provenanceRow(metadata: unknown = { fixture: true }) {
  return {
    data_version: "1",
    id: ENTITY_ID,
    metadata,
    retrieved_at: RETRIEVED_AT,
    source_id: SOURCE_ID,
    source_record_id: "FIXTURE-001",
    validated_at: null,
    validation_status: "PENDING",
  };
}

function createRepository(builder: object) {
  const from = vi.fn().mockReturnValue(builder);
  const client = { from } as unknown as SupabaseClient;

  return { from, repository: new ProvenanceRepository(client) };
}

async function captureRepositoryError(
  operation: Promise<unknown>,
): Promise<RepositoryError> {
  let thrown: unknown;

  try {
    await operation;
  } catch (error) {
    thrown = error;
  }

  expect(thrown).toBeInstanceOf(RepositoryError);
  return thrown as RepositoryError;
}

describe("ProvenanceRepository", () => {
  it.each(entityTables)(
    "findByExternalRecordId uses the whitelisted %s table",
    async (kind, table) => {
      const builder = {
        eq: vi.fn(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: provenanceRow(),
          error: null,
        }),
        select: vi.fn(),
      };
      builder.select.mockReturnValue(builder);
      builder.eq.mockReturnValue(builder);
      const { from, repository } = createRepository(builder);

      await expect(
        repository.findByExternalRecordId(
          kind,
          SOURCE_ID,
          "  FIXTURE-001  ",
        ),
      ).resolves.toEqual({
        data_version: "1",
        entity_id: ENTITY_ID,
        entity_kind: kind,
        metadata: { fixture: true },
        retrieved_at: RETRIEVED_AT,
        source_id: SOURCE_ID,
        source_record_id: "FIXTURE-001",
        validated_at: null,
        validation_status: "PENDING",
      });
      expect(from).toHaveBeenCalledWith(table);
      expect(builder.select).toHaveBeenCalledWith(PROVENANCE_COLUMNS);
      expect(builder.eq).toHaveBeenNthCalledWith(1, "source_id", SOURCE_ID);
      expect(builder.eq).toHaveBeenNthCalledWith(
        2,
        "source_record_id",
        "FIXTURE-001",
      );
    },
  );

  it.each(entityTables)(
    "existsBySourceRecordId uses the whitelisted %s table",
    async (kind, table) => {
      const result = { count: 1, error: null };
      const builder = {
        eq: vi.fn(),
        select: vi.fn(),
      };
      builder.select.mockReturnValue(builder);
      builder.eq.mockReturnValueOnce(builder).mockResolvedValueOnce(result);
      const { from, repository } = createRepository(builder);

      await expect(
        repository.existsBySourceRecordId(
          kind,
          SOURCE_ID,
          "  FIXTURE-001  ",
        ),
      ).resolves.toBe(true);
      expect(from).toHaveBeenCalledWith(table);
      expect(builder.select).toHaveBeenCalledWith("id", {
        count: "exact",
        head: true,
      });
      expect(builder.eq).toHaveBeenNthCalledWith(1, "source_id", SOURCE_ID);
      expect(builder.eq).toHaveBeenNthCalledWith(
        2,
        "source_record_id",
        "FIXTURE-001",
      );
    },
  );

  it("findByExternalRecordId returns null for a missing RLS-visible record", async () => {
    const builder = {
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      select: vi.fn(),
    };
    builder.select.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    const { repository } = createRepository(builder);

    await expect(
      repository.findByExternalRecordId(
        "study_area",
        SOURCE_ID,
        "FIXTURE-MISSING",
      ),
    ).resolves.toBeNull();
  });

  it.each([0, null])(
    "existsBySourceRecordId maps count %s to false",
    async (count) => {
      const builder = {
        eq: vi.fn(),
        select: vi.fn(),
      };
      builder.select.mockReturnValue(builder);
      builder.eq
        .mockReturnValueOnce(builder)
        .mockResolvedValueOnce({ count, error: null });
      const { repository } = createRepository(builder);

      await expect(
        repository.existsBySourceRecordId(
          "study_area",
          SOURCE_ID,
          "FIXTURE-MISSING",
        ),
      ).resolves.toBe(false);
    },
  );

  it.each([
    "findByExternalRecordId",
    "existsBySourceRecordId",
  ] as const)("rejects a non-whitelisted entity kind in %s", async (method) => {
    const { from, repository } = createRepository({});

    const error = await captureRepositoryError(
      repository[method](
        "raw_private_table" as ProvenanceEntityKind,
        SOURCE_ID,
        "FIXTURE-001",
      ),
    );

    expect(error).toMatchObject({
      code: "VALIDATION_ERROR",
      operation: "provenance.resolveEntityKind",
    });
    expect(from).not.toHaveBeenCalled();
  });

  it.each([
    "findByExternalRecordId",
    "existsBySourceRecordId",
  ] as const)("rejects an invalid source UUID before querying in %s", async (method) => {
    const { from, repository } = createRepository({});

    const error = await captureRepositoryError(
      repository[method]("study_area", "not-a-uuid", "FIXTURE-001"),
    );

    expect(error).toMatchObject({
      code: "VALIDATION_ERROR",
      operation: `provenance.${method}.validateSource`,
    });
    expect(from).not.toHaveBeenCalled();
  });

  it.each([
    ["findByExternalRecordId", "   "],
    ["findByExternalRecordId", "x".repeat(257)],
    ["existsBySourceRecordId", "   "],
    ["existsBySourceRecordId", "x".repeat(257)],
  ] as const)(
    "rejects an invalid external record id in %s",
    async (method, sourceRecordId) => {
      const { from, repository } = createRepository({});

      const error = await captureRepositoryError(
        repository[method]("study_area", SOURCE_ID, sourceRecordId),
      );

      expect(error).toMatchObject({
        code: "VALIDATION_ERROR",
        operation: `provenance.${method}.validateRecord`,
      });
      expect(from).not.toHaveBeenCalled();
    },
  );

  it("fails closed when database metadata contains a sensitive key", async () => {
    const builder = {
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: provenanceRow({ nested: { service_role_key: true } }),
        error: null,
      }),
      select: vi.fn(),
    };
    builder.select.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    const { repository } = createRepository(builder);

    const error = await captureRepositoryError(
      repository.findByExternalRecordId(
        "study_area",
        SOURCE_ID,
        "FIXTURE-001",
      ),
    );

    expect(error).toMatchObject({
      code: "DATABASE_ERROR",
      message: "The repository operation failed",
      operation: "provenance.findByExternalRecordId.map",
    });
    expect(error.message).not.toContain("service_role_key");
  });

  it("maps and sanitizes find database errors", async () => {
    const internalDetail = "private policy and SQL detail";
    const builder = {
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "42501", message: internalDetail },
      }),
      select: vi.fn(),
    };
    builder.select.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    const { repository } = createRepository(builder);

    const error = await captureRepositoryError(
      repository.findByExternalRecordId(
        "study_area",
        SOURCE_ID,
        "FIXTURE-001",
      ),
    );

    expect(error).toMatchObject({
      code: "FORBIDDEN",
      operation: "provenance.findByExternalRecordId",
    });
    expect(error.message).not.toContain(internalDetail);
  });

  it("maps and sanitizes exists database errors", async () => {
    const internalDetail = "internal database implementation detail";
    const builder = {
      eq: vi.fn(),
      select: vi.fn(),
    };
    builder.select.mockReturnValue(builder);
    builder.eq.mockReturnValueOnce(builder).mockResolvedValueOnce({
      count: null,
      error: { code: "XX000", message: internalDetail },
    });
    const { repository } = createRepository(builder);

    const error = await captureRepositoryError(
      repository.existsBySourceRecordId(
        "study_area",
        SOURCE_ID,
        "FIXTURE-001",
      ),
    );

    expect(error).toMatchObject({
      code: "DATABASE_ERROR",
      operation: "provenance.existsBySourceRecordId",
    });
    expect(error.message).not.toContain(internalDetail);
  });
});
