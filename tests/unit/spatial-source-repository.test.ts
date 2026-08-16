import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { RepositoryError } from "@/src/repositories/errors";
import { SpatialSourceRepository } from "@/src/repositories/spatial-source.repository";
import type { SpatialSourceDatabaseRow } from "@/src/types/domain";

const SOURCE_COLUMNS =
  "id, source_name, source_type, description, metadata, created_at, updated_at";
const sourceId = "10000000-0000-4000-8000-000000000001";

const sourceRow: SpatialSourceDatabaseRow & {
  internal_fixture_note: string;
} = {
  id: sourceId,
  source_name: "TEST EXTERNAL SOURCE",
  source_type: "external",
  description: "TEST FIXTURE",
  metadata: { fixture: true, environment: "development" },
  created_at: "2026-08-16T00:00:00.000Z",
  updated_at: "2026-08-16T01:00:00.000Z",
  internal_fixture_note: "must not reach the DTO",
};

const expectedSource = {
  id: sourceId,
  source_name: "TEST EXTERNAL SOURCE",
  source_type: "external",
  description: "TEST FIXTURE",
  metadata: { fixture: true, environment: "development" },
  created_at: "2026-08-16T00:00:00.000Z",
  updated_at: "2026-08-16T01:00:00.000Z",
};

function createRepository(builder: object) {
  const from = vi.fn().mockReturnValue(builder);
  const client = { from } as unknown as SupabaseClient;
  return { from, repository: new SpatialSourceRepository(client) };
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

describe("SpatialSourceRepository", () => {
  it("findById selects explicit columns and maps only API-safe fields", async () => {
    const builder = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: sourceRow, error: null }),
    };
    builder.select.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    const { from, repository } = createRepository(builder);

    await expect(repository.findById(sourceId)).resolves.toEqual(expectedSource);
    expect(from).toHaveBeenCalledWith("spatial_sources");
    expect(builder.select).toHaveBeenCalledWith(SOURCE_COLUMNS);
    expect(builder.select).not.toHaveBeenCalledWith("*");
    expect(builder.eq).toHaveBeenCalledWith("id", sourceId);
  });

  it("findMany applies source filter, whitelist sort, and inclusive range", async () => {
    const builder = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      range: vi.fn().mockResolvedValue({
        data: [sourceRow],
        error: null,
        count: 21,
      }),
    };
    builder.select.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    builder.order.mockReturnValue(builder);
    const { repository } = createRepository(builder);

    await expect(
      repository.findMany({
        source_type: "external",
        page: 3,
        limit: 10,
        offset: 20,
        sort: "source_name",
        order: "asc",
      }),
    ).resolves.toEqual({
      items: [expectedSource],
      page: 3,
      limit: 10,
      offset: 20,
      total: 21,
    });
    expect(builder.select).toHaveBeenCalledWith(SOURCE_COLUMNS, {
      count: "exact",
    });
    expect(builder.eq).toHaveBeenCalledWith("source_type", "external");
    expect(builder.order).toHaveBeenCalledWith("source_name", {
      ascending: true,
    });
    expect(builder.range).toHaveBeenCalledWith(20, 29);
  });

  it("exists returns whether an RLS-visible row was counted", async () => {
    const builder = {
      select: vi.fn(),
      eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
    };
    builder.select.mockReturnValue(builder);
    const { repository } = createRepository(builder);

    await expect(repository.exists(sourceId)).resolves.toBe(true);
    expect(builder.select).toHaveBeenCalledWith("id", {
      count: "exact",
      head: true,
    });
    expect(builder.eq).toHaveBeenCalledWith("id", sourceId);
  });

  it("count validates and applies the source_type filter", async () => {
    const builder = {
      select: vi.fn(),
      eq: vi.fn().mockResolvedValue({ count: 4, error: null }),
    };
    builder.select.mockReturnValue(builder);
    const { repository } = createRepository(builder);

    await expect(repository.count({ source_type: "manual" })).resolves.toBe(4);
    expect(builder.eq).toHaveBeenCalledWith("source_type", "manual");
  });

  it("create validates input and maps the selected row", async () => {
    const input = {
      source_name: "TEST EXTERNAL SOURCE",
      source_type: "external" as const,
      description: "TEST FIXTURE",
      metadata: { fixture: true },
    };
    const builder = {
      insert: vi.fn(),
      select: vi.fn(),
      single: vi.fn().mockResolvedValue({ data: sourceRow, error: null }),
    };
    builder.insert.mockReturnValue(builder);
    builder.select.mockReturnValue(builder);
    const { repository } = createRepository(builder);

    await expect(repository.create(input)).resolves.toEqual(expectedSource);
    expect(builder.insert).toHaveBeenCalledWith(input);
    expect(builder.select).toHaveBeenCalledWith(SOURCE_COLUMNS);
  });

  it("update writes only mutable source fields", async () => {
    const input = { description: "UPDATED TEST FIXTURE" };
    const updatedRow = { ...sourceRow, description: input.description };
    const builder = {
      update: vi.fn(),
      eq: vi.fn(),
      select: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: updatedRow, error: null }),
    };
    builder.update.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    builder.select.mockReturnValue(builder);
    const { repository } = createRepository(builder);

    await expect(repository.update(sourceId, input)).resolves.toMatchObject(input);
    expect(builder.update).toHaveBeenCalledWith(input);
    expect(builder.eq).toHaveBeenCalledWith("id", sourceId);
  });

  it("maps database failures without exposing internal details", async () => {
    const internalDetail = "permission denied for private fixture policy";
    const builder = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "42501", message: internalDetail },
      }),
    };
    builder.select.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    const { repository } = createRepository(builder);

    const error = await captureRepositoryError(repository.findById(sourceId));

    expect(error).toMatchObject({
      code: "FORBIDDEN",
      operation: "spatialSources.findById",
    });
    expect(error.message).not.toContain(internalDetail);
  });
});
