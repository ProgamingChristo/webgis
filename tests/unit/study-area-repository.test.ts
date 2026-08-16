import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { RepositoryError } from "@/src/repositories/errors";
import { StudyAreaRepository } from "@/src/repositories/study-area.repository";
import type { StudyAreaDatabaseRow } from "@/src/types/domain";

const STUDY_AREA_COLUMNS =
  "id, source_id, source_record_id, data_version, validation_status, retrieved_at, validated_at, metadata, name, description, geometry, created_at, updated_at, source:spatial_sources(source_type)";
const sourceId = "10000000-0000-4000-8000-000000000001";
const studyAreaId = "20000000-0000-4000-8000-000000000001";
const timestamp = "2026-08-16T00:00:00.000Z";

const geometry = {
  type: "MultiPolygon" as const,
  coordinates: [
    [
      [
        [0, 0] as [number, number],
        [0, 1] as [number, number],
        [1, 1] as [number, number],
        [1, 0] as [number, number],
        [0, 0] as [number, number],
      ],
    ],
  ],
};

const studyAreaRow: StudyAreaDatabaseRow & {
  internal_fixture_note: string;
} = {
  id: studyAreaId,
  source_id: sourceId,
  source_record_id: "TEST-STUDY-001",
  data_version: "1",
  validation_status: "PENDING",
  retrieved_at: timestamp,
  validated_at: null,
  metadata: { fixture: true },
  source: { source_type: "external" },
  name: "TEST STUDY AREA",
  description: "TEST FIXTURE",
  geometry: JSON.stringify(geometry),
  created_at: timestamp,
  updated_at: timestamp,
  internal_fixture_note: "must not reach the DTO",
};

const expectedStudyArea = {
  id: studyAreaId,
  name: "TEST STUDY AREA",
  description: "TEST FIXTURE",
  geometry,
  provenance: {
    source_id: sourceId,
    source_type: "external",
    source_record_id: "TEST-STUDY-001",
    data_version: "1",
    validation_status: "PENDING",
    retrieved_at: timestamp,
    validated_at: null,
    metadata: { fixture: true },
  },
  created_at: timestamp,
  updated_at: timestamp,
};

function createRepository(tableBuilder: object, rpcBuilder: object = {}) {
  const from = vi.fn().mockReturnValue(tableBuilder);
  const rpc = vi.fn().mockReturnValue(rpcBuilder);
  const client = { from, rpc } as unknown as SupabaseClient;
  return { from, rpc, repository: new StudyAreaRepository(client) };
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

const listOptions = {
  source_id: sourceId,
  validation_status: "PENDING" as const,
  page: 2,
  limit: 10,
  offset: 10,
  sort: "name" as const,
  order: "asc" as const,
};

describe("StudyAreaRepository", () => {
  it("findById maps raw database geometry and provenance to a safe DTO", async () => {
    const builder = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: studyAreaRow,
        error: null,
      }),
    };
    builder.select.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    const { from, repository } = createRepository(builder);

    await expect(repository.findById(studyAreaId)).resolves.toEqual(
      expectedStudyArea,
    );
    expect(from).toHaveBeenCalledWith("study_areas");
    expect(builder.select).toHaveBeenCalledWith(STUDY_AREA_COLUMNS);
    expect(builder.select).not.toHaveBeenCalledWith("*");
  });

  it("findMany applies pagination, filters, and whitelist sorting", async () => {
    const builder = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      range: vi.fn().mockResolvedValue({
        data: [studyAreaRow],
        error: null,
        count: 12,
      }),
    };
    builder.select.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    builder.order.mockReturnValue(builder);
    const { repository } = createRepository(builder);

    await expect(repository.findMany(listOptions)).resolves.toEqual({
      items: [expectedStudyArea],
      page: 2,
      limit: 10,
      offset: 10,
      total: 12,
    });
    expect(builder.eq).toHaveBeenCalledWith("source_id", sourceId);
    expect(builder.eq).toHaveBeenCalledWith("validation_status", "PENDING");
    expect(builder.order).toHaveBeenCalledWith("name", { ascending: true });
    expect(builder.range).toHaveBeenCalledWith(10, 19);
  });

  it("findWithinBBox calls the fixed RPC and preserves list controls", async () => {
    const bbox = { min_lng: 106.7, min_lat: -6.3, max_lng: 106.9, max_lat: -6.1 };
    const rpcBuilder = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      range: vi.fn().mockResolvedValue({
        data: [studyAreaRow],
        error: null,
        count: 1,
      }),
    };
    rpcBuilder.select.mockReturnValue(rpcBuilder);
    rpcBuilder.eq.mockReturnValue(rpcBuilder);
    rpcBuilder.order.mockReturnValue(rpcBuilder);
    const { rpc, repository } = createRepository({}, rpcBuilder);

    await expect(repository.findWithinBBox(bbox, listOptions)).resolves.toMatchObject({
      items: [expectedStudyArea],
      total: 1,
    });
    expect(rpc).toHaveBeenCalledWith(
      "find_study_areas_within_bbox",
      bbox,
      { count: "exact" },
    );
    expect(rpcBuilder.select).toHaveBeenCalledWith(STUDY_AREA_COLUMNS);
    expect(rpcBuilder.range).toHaveBeenCalledWith(10, 19);
  });

  it("findWithinBBox rejects invalid bounds before invoking RPC", async () => {
    const { rpc, repository } = createRepository({});

    const error = await captureRepositoryError(
      repository.findWithinBBox(
        { min_lng: 10, min_lat: 0, max_lng: 9, max_lat: 1 },
        listOptions,
      ),
    );

    expect(error).toMatchObject({
      code: "VALIDATION_ERROR",
      operation: "studyAreas.findWithinBBox.validateBBox",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("exists maps an exact count to a boolean", async () => {
    const builder = {
      select: vi.fn(),
      eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
    };
    builder.select.mockReturnValue(builder);
    const { repository } = createRepository(builder);

    await expect(repository.exists(studyAreaId)).resolves.toBe(true);
    expect(builder.eq).toHaveBeenCalledWith("id", studyAreaId);
  });

  it("count validates and applies a whitelisted status filter", async () => {
    const builder = {
      select: vi.fn(),
      eq: vi.fn().mockResolvedValue({ count: 3, error: null }),
    };
    builder.select.mockReturnValue(builder);
    const { repository } = createRepository(builder);

    await expect(
      repository.count({ validation_status: "VALIDATED" }),
    ).resolves.toBe(3);
    expect(builder.eq).toHaveBeenCalledWith(
      "validation_status",
      "VALIDATED",
    );
  });

  it("create flattens trusted provenance and maps the returned DTO", async () => {
    const input = {
      name: "TEST STUDY AREA",
      description: "TEST FIXTURE",
      geometry,
      provenance: {
        source_id: sourceId,
        source_record_id: "TEST-STUDY-001",
        data_version: "1",
        retrieved_at: timestamp,
        validated_at: null,
        validation_status: "PENDING" as const,
        metadata: { fixture: true },
      },
    };
    const builder = {
      insert: vi.fn(),
      select: vi.fn(),
      single: vi.fn().mockResolvedValue({ data: studyAreaRow, error: null }),
    };
    builder.insert.mockReturnValue(builder);
    builder.select.mockReturnValue(builder);
    const { repository } = createRepository(builder);

    await expect(repository.create(input)).resolves.toEqual(expectedStudyArea);
    expect(builder.insert).toHaveBeenCalledWith({
      name: input.name,
      description: input.description,
      geometry,
      source_id: sourceId,
      source_record_id: "TEST-STUDY-001",
      data_version: "1",
      retrieved_at: timestamp,
      validated_at: null,
      validation_status: "PENDING",
      metadata: { fixture: true },
    });
  });

  it("update flattens mutable provenance fields", async () => {
    const input = {
      name: "UPDATED TEST STUDY AREA",
      provenance: { data_version: "2" },
    };
    const builder = {
      update: vi.fn(),
      eq: vi.fn(),
      select: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: studyAreaRow, error: null }),
    };
    builder.update.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    builder.select.mockReturnValue(builder);
    const { repository } = createRepository(builder);

    await expect(repository.update(studyAreaId, input)).resolves.toEqual(
      expectedStudyArea,
    );
    expect(builder.update).toHaveBeenCalledWith({
      name: input.name,
      data_version: "2",
    });
  });

  it("maps database errors to sanitized repository errors", async () => {
    const internalDetail = "invalid private fixture constraint detail";
    const builder = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "23514", message: internalDetail },
      }),
    };
    builder.select.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    const { repository } = createRepository(builder);

    const error = await captureRepositoryError(repository.findById(studyAreaId));

    expect(error).toMatchObject({
      code: "VALIDATION_ERROR",
      operation: "studyAreas.findById",
    });
    expect(error.message).not.toContain(internalDetail);
  });
});
