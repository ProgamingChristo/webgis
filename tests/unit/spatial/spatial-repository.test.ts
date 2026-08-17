import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { SpatialRepository } from "@/src/modules/spatial/spatial.repository";
import { STUDY_AREA_COLUMNS } from "@/src/repositories/study-area.repository";
import { TRANSPORT_CORRIDOR_COLUMNS } from "@/src/repositories/transport-corridor.repository";
import { TRANSPORT_NODE_COLUMNS } from "@/src/repositories/transport-node.repository";
import { UMKM_PROFILE_COLUMNS } from "@/src/repositories/umkm-profile.repository";
import { RepositoryError } from "@/src/repositories/errors";
import type { TransportNodeDatabaseRow } from "@/src/types/domain";

interface RpcResult {
  data: unknown;
  error: unknown;
}

interface MockRpcBuilder extends PromiseLike<RpcResult> {
  limit: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
}

const timestamp = "2026-08-16T00:00:00.000Z";

const transportNodeRow: TransportNodeDatabaseRow & {
  internal_fixture_note: string;
} = {
  corridor_id: null,
  created_at: timestamp,
  data_version: "TEST-1",
  geometry: JSON.stringify({ coordinates: [106.8, -6.2], type: "Point" }),
  id: "70000000-0000-4000-8000-000000000001",
  internal_fixture_note: "must not reach the DTO",
  metadata: { fixture: true },
  name: "TEST TRANSPORT NODE",
  node_type: "TEST",
  retrieved_at: timestamp,
  source: { source_type: "manual" },
  source_id: "70000000-0000-4000-8000-000000000002",
  source_record_id: "TEST-SPATIAL-NODE-001",
  transport_mode: "TEST",
  updated_at: timestamp,
  validated_at: null,
  validation_status: "PENDING",
};

function createRpcBuilder(result: RpcResult): MockRpcBuilder {
  const promise = Promise.resolve(result);
  const builder = {
    limit: vi.fn(),
    order: vi.fn(),
    select: vi.fn(),
    then: promise.then.bind(promise),
  } as unknown as MockRpcBuilder;

  builder.limit.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  builder.select.mockReturnValue(builder);
  return builder;
}

function createRepository(result: RpcResult, maxRadiusMeters = 5_000) {
  const builder = createRpcBuilder(result);
  const rpc = vi.fn().mockReturnValue(builder);
  const client = { rpc } as unknown as SupabaseClient;

  return {
    builder,
    repository: new SpatialRepository(client, maxRadiusMeters),
    rpc,
  };
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

describe("SpatialRepository", () => {
  it("calls the fixed geography-distance RPC with parameter values", async () => {
    const { repository, rpc } = createRepository({ data: 1_572.5, error: null });

    await expect(
      repository.calculateDistance(
        { latitude: -6.2, longitude: 106.8 },
        { latitude: -6.21, longitude: 106.81 },
      ),
    ).resolves.toBe(1_572.5);

    expect(rpc).toHaveBeenCalledWith("wgs84_distance_meters", {
      destination: "SRID=4326;POINT(106.81 -6.21)",
      origin: "SRID=4326;POINT(106.8 -6.2)",
    });
  });

  it.each([
    {
      columns: TRANSPORT_NODE_COLUMNS,
      entityType: "transport_node" as const,
      rpcName: "find_transport_nodes_near",
    },
    {
      columns: UMKM_PROFILE_COLUMNS,
      entityType: "umkm_profile" as const,
      rpcName: "find_umkm_profiles_near",
    },
  ])(
    "uses the whitelisted $rpcName RPC and explicit projection",
    async ({ columns, entityType, rpcName }) => {
      const { builder, repository, rpc } = createRepository({
        data: [],
        error: null,
      });

      await expect(
        repository.findWithinRadius({
          entity_type: entityType,
          limit: 7,
          origin: { latitude: -6.2, longitude: 106.8 },
          radius_meters: 1_000,
        }),
      ).resolves.toEqual([]);

      expect(rpc).toHaveBeenCalledWith(rpcName, {
        origin: "SRID=4326;POINT(106.8 -6.2)",
        radius_meters: 1_000,
      });
      expect(builder.select).toHaveBeenCalledWith(columns);
      expect(builder.select).not.toHaveBeenCalledWith("*");
      expect(builder.limit).toHaveBeenCalledWith(7);
    },
  );

  it.each([
    {
      columns: STUDY_AREA_COLUMNS,
      entityType: "study_area" as const,
      rpcName: "find_study_areas_within_bbox",
    },
    {
      columns: TRANSPORT_CORRIDOR_COLUMNS,
      entityType: "transport_corridor" as const,
      rpcName: "find_transport_corridors_within_bbox",
    },
    {
      columns: TRANSPORT_NODE_COLUMNS,
      entityType: "transport_node" as const,
      rpcName: "find_transport_nodes_within_bbox",
    },
    {
      columns: UMKM_PROFILE_COLUMNS,
      entityType: "umkm_profile" as const,
      rpcName: "find_umkm_profiles_within_bbox",
    },
  ])(
    "maps API bbox names to fixed $rpcName parameters",
    async ({ columns, entityType, rpcName }) => {
      const { builder, repository, rpc } = createRepository({
        data: [],
        error: null,
      });

      await expect(
        repository.findWithinBBox({
          bbox: { east: 106.9, north: -6.1, south: -6.3, west: 106.7 },
          entity_type: entityType,
          limit: 11,
        }),
      ).resolves.toEqual([]);

      expect(rpc).toHaveBeenCalledWith(rpcName, {
        max_lat: -6.1,
        max_lng: 106.9,
        min_lat: -6.3,
        min_lng: 106.7,
      });
      expect(builder.select).toHaveBeenCalledWith(columns);
      expect(builder.select).not.toHaveBeenCalledWith("*");
      expect(builder.order).toHaveBeenCalledWith("created_at", {
        ascending: false,
      });
      expect(builder.limit).toHaveBeenCalledWith(11);
    },
  );

  it("maps nearby database rows to a safe entity-tagged DTO", async () => {
    const { repository } = createRepository({ data: [transportNodeRow], error: null });

    const result = await repository.findWithinRadius({
      entity_type: "transport_node",
      limit: 5,
      origin: { latitude: -6.2, longitude: 106.8 },
      radius_meters: 500,
    });

    expect(result).toEqual([
      {
        entity_type: "transport_node",
        record: {
          corridor_id: null,
          created_at: timestamp,
          geometry: { coordinates: [106.8, -6.2], type: "Point" },
          id: transportNodeRow.id,
          name: "TEST TRANSPORT NODE",
          node_type: "TEST",
          provenance: {
            data_version: "TEST-1",
            metadata: { fixture: true },
            retrieved_at: timestamp,
            source_id: transportNodeRow.source_id,
            source_record_id: "TEST-SPATIAL-NODE-001",
            source_type: "manual",
            validated_at: null,
            validation_status: "PENDING",
          },
          transport_mode: "TEST",
          updated_at: timestamp,
        },
      },
    ]);
    expect(JSON.stringify(result)).not.toContain("internal_fixture_note");
  });

  it("validates geometry through the fixed PostGIS helper and derives SRID", async () => {
    const point = { coordinates: [106.8, -6.2] as [number, number], type: "Point" as const };
    const { repository, rpc } = createRepository({ data: true, error: null });

    await expect(repository.validateGeometry(point)).resolves.toBe(true);
    await expect(repository.getGeometrySRID(point)).resolves.toBe(4326);

    expect(rpc).toHaveBeenNthCalledWith(1, "is_valid_wgs84_geometry", {
      allowed_types: ["POINT"],
      input_geometry: "SRID=4326;POINT(106.8 -6.2)",
    });
    expect(rpc).toHaveBeenNthCalledWith(2, "is_valid_wgs84_geometry", {
      allowed_types: ["POINT"],
      input_geometry: "SRID=4326;POINT(106.8 -6.2)",
    });
  });

  it("rejects invalid coordinates, radius, bbox, and geometry before RPC", async () => {
    const { repository, rpc } = createRepository({ data: null, error: null }, 2_000);

    const invalidDistance = await captureRepositoryError(
      repository.calculateDistance(
        { latitude: 0, longitude: 181 },
        { latitude: 0, longitude: 0 },
      ),
    );
    const invalidRadius = await captureRepositoryError(
      repository.findWithinRadius({
        entity_type: "transport_node",
        limit: 10,
        origin: { latitude: 0, longitude: 0 },
        radius_meters: 2_001,
      }),
    );
    const invalidBBox = await captureRepositoryError(
      repository.findWithinBBox({
        bbox: { east: 10, north: 1, south: 0, west: 10 },
        entity_type: "study_area",
        limit: 10,
      }),
    );
    const invalidGeometry = await captureRepositoryError(
      repository.validateGeometry({ coordinates: [181, 0], type: "Point" }),
    );

    expect(invalidDistance.code).toBe("VALIDATION_ERROR");
    expect(invalidRadius.code).toBe("VALIDATION_ERROR");
    expect(invalidBBox.code).toBe("VALIDATION_ERROR");
    expect(invalidGeometry.code).toBe("VALIDATION_ERROR");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("maps database failures to a sanitized repository error", async () => {
    const sensitiveDetail = "postgres://private-user:private-password@private-host";
    const { repository } = createRepository({
      data: null,
      error: { code: "XX000", message: sensitiveDetail },
    });

    const error = await captureRepositoryError(
      repository.calculateDistance(
        { latitude: -6.2, longitude: 106.8 },
        { latitude: -6.21, longitude: 106.81 },
      ),
    );

    expect(error).toMatchObject({
      code: "DATABASE_ERROR",
      operation: "spatial.calculateDistance",
    });
    expect(error.message).toBe("The repository operation failed");
    expect(error.message).not.toContain(sensitiveDetail);
  });

  it("rejects malformed RPC result values instead of exposing them", async () => {
    const { repository } = createRepository({
      data: "not-a-distance",
      error: null,
    });

    const error = await captureRepositoryError(
      repository.calculateDistance(
        { latitude: -6.2, longitude: 106.8 },
        { latitude: -6.21, longitude: 106.81 },
      ),
    );

    expect(error).toMatchObject({
      code: "DATABASE_ERROR",
      operation: "spatial.calculateDistance.map",
    });
  });
});
