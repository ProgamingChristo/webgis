import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import nearbyFixture from "@/tests/fixtures/spatial/nearby.fixture.json";
import validBBoxFixture from "@/tests/fixtures/spatial/valid-bbox.fixture.json";
import validPointFixture from "@/tests/fixtures/spatial/valid-point.fixture.json";
import { BBoxService } from "@/src/modules/spatial/bbox.service";
import { DistanceService } from "@/src/modules/spatial/distance.service";
import { ProximityService } from "@/src/modules/spatial/proximity.service";
import { UnavailableRoutingEngine } from "@/src/modules/spatial/routing.contract";
import { ServiceAreaService } from "@/src/modules/spatial/service-area.service";
import type {
  SpatialRepositoryContract,
} from "@/src/modules/spatial/spatial.repository";
import type { SpatialRepositoryRecord } from "@/src/modules/spatial/spatial.dto";
import { WalkingTimeService } from "@/src/modules/spatial/walking-time.service";
import { RepositoryError } from "@/src/repositories/errors";

type DistancePort = Pick<SpatialRepositoryContract, "calculateDistance">;
type ProximityPort = Pick<SpatialRepositoryContract, "findWithinRadius">;
type BBoxPort = Pick<SpatialRepositoryContract, "findWithinBBox">;

const repositoryRecord = nearbyFixture
  .repository_records[0] as unknown as SpatialRepositoryRecord;

async function captureRejected(operation: Promise<unknown>): Promise<unknown> {
  try {
    await operation;
  } catch (error) {
    return error;
  }
  throw new Error("TEST expected operation to reject");
}

function captureError(operation: () => unknown): unknown {
  try {
    operation();
  } catch (error) {
    return error;
  }
  throw new Error("TEST expected operation to throw");
}

describe("Phase 7 spatial services", () => {
  it("returns the actual repository result for identical points", async () => {
    const repository = {
      calculateDistance: vi.fn(async () => 0),
    } satisfies DistancePort;
    const service = new DistanceService(repository);

    await expect(
      service.calculate({
        destination: validPointFixture.coordinate,
        origin: validPointFixture.coordinate,
      }),
    ).resolves.toEqual({
      analysis_method: "postgis_geography_distance",
      distance_meters: 0,
      limitation_flags: [],
      source: "GETRA_SPATIAL_ENGINE",
      srid: 4326,
    });
    expect(repository.calculateDistance).toHaveBeenCalledWith(
      validPointFixture.coordinate,
      validPointFixture.coordinate,
    );
  });

  it("maps a distinct-point repository distance without calculating degrees in JavaScript", async () => {
    const repository = {
      calculateDistance: vi.fn(async () => 1_572.53),
    } satisfies DistancePort;
    const service = new DistanceService(repository);
    const origin = { latitude: 0, longitude: 0 };

    await expect(
      service.calculate({
        destination: validPointFixture.coordinate,
        origin,
      }),
    ).resolves.toMatchObject({
      analysis_method: "postgis_geography_distance",
      distance_meters: 1_572.53,
    });
    expect(repository.calculateDistance).toHaveBeenCalledWith(
      origin,
      validPointFixture.coordinate,
    );
  });

  it("rejects invalid distance input before repository access", async () => {
    const repository = {
      calculateDistance: vi.fn(async () => 0),
    } satisfies DistancePort;
    const service = new DistanceService(repository);
    const error = await captureRejected(
      service.calculate({
        destination: validPointFixture.coordinate,
        origin: { latitude: 91, longitude: 0 },
      }),
    );

    expect(error).toMatchObject({ code: "SPATIAL_INVALID_COORDINATE" });
    expect(repository.calculateDistance).not.toHaveBeenCalled();
  });

  it("sanitizes database distance failures", async () => {
    const privateDetail = "TEST PRIVATE SQL DETAIL MUST NOT LEAK";
    const repository = {
      calculateDistance: vi.fn(async () => {
        throw new RepositoryError("DATABASE_ERROR", "spatial.distance", {
          cause: new Error(privateDetail),
        });
      }),
    } satisfies DistancePort;
    const service = new DistanceService(repository);
    const error = await captureRejected(
      service.calculate({
        destination: validPointFixture.coordinate,
        origin: { latitude: 0, longitude: 0 },
      }),
    );

    expect(error).toMatchObject({
      code: "SPATIAL_QUERY_FAILED",
      message: "Spatial query failed",
      retryable: true,
    });
    expect(String(error)).not.toContain(privateDetail);
  });

  it("returns nearby fixture records through the PostGIS proximity contract", async () => {
    const repository = {
      findWithinRadius: vi.fn(async () => [repositoryRecord]),
    } satisfies ProximityPort;
    const service = new ProximityService(repository, 50_000, [
      "FIXTURE_DATA",
      "NO_PRODUCTION_DATA",
    ]);

    const result = await service.findNearby(nearbyFixture.domain_query);

    expect(repository.findWithinRadius).toHaveBeenCalledWith(
      nearbyFixture.domain_query,
    );
    expect(result).toMatchObject({
      analysis_method: "postgis_dwithin",
      limitation_flags: ["FIXTURE_DATA", "NO_PRODUCTION_DATA"],
      returned_count: 1,
      source: "GETRA_SPATIAL_ENGINE",
      srid: 4326,
    });
    expect(result.records[0]).not.toHaveProperty("internal_test_marker");
  });

  it("rejects an excessive proximity radius before any query", async () => {
    const repository = {
      findWithinRadius: vi.fn(async () => []),
    } satisfies ProximityPort;
    const service = new ProximityService(repository, 1_000);
    const error = await captureRejected(
      service.findNearby({
        ...nearbyFixture.domain_query,
        radius_meters: 1_001,
      }),
    );

    expect(error).toMatchObject({ code: "SPATIAL_INVALID_RADIUS" });
    expect(repository.findWithinRadius).not.toHaveBeenCalled();
  });

  it("returns bbox fixture records and rejects invalid ordering before querying", async () => {
    const repository = {
      findWithinBBox: vi.fn(async () => [repositoryRecord]),
    } satisfies BBoxPort;
    const service = new BBoxService(repository, [
      "FIXTURE_DATA",
      "NO_PRODUCTION_DATA",
    ]);

    await expect(
      service.findWithinBBox(validBBoxFixture.domain_query),
    ).resolves.toMatchObject({
      analysis_method: "postgis_bbox_intersection",
      bbox: validBBoxFixture.domain_query.bbox,
      limitation_flags: ["FIXTURE_DATA", "NO_PRODUCTION_DATA"],
      returned_count: 1,
    });

    const error = await captureRejected(
      service.findWithinBBox({
        ...validBBoxFixture.domain_query,
        bbox: { ...validBBoxFixture.domain_query.bbox, west: 1 },
      }),
    );
    expect(error).toMatchObject({ code: "SPATIAL_INVALID_BBOX" });
    expect(repository.findWithinBBox).toHaveBeenCalledTimes(1);
  });

  it("estimates walking time transparently and handles zero distance", () => {
    const service = new WalkingTimeService(1.25);

    expect(service.estimate(100)).toEqual({
      analysis_method: "estimated_from_distance",
      distance_meters: 100,
      estimated_seconds: 80,
      limitation_flags: ["ESTIMATED_WALKING_TIME"],
      source: "GETRA_SPATIAL_ENGINE",
      walking_speed_mps: 1.25,
    });
    expect(service.estimate(0).estimated_seconds).toBe(0);
    expect(captureError(() => service.estimate(-1))).toMatchObject({
      code: "SPATIAL_INVALID_DISTANCE",
    });
    expect(captureError(() => new WalkingTimeService(0))).toMatchObject({
      code: "SPATIAL_INVALID_CONFIGURATION",
    });
  });

  it("returns controlled errors instead of fake service-area or route geometry", async () => {
    const serviceArea = new ServiceAreaService();
    const routing = new UnavailableRoutingEngine();

    await expect(
      serviceArea.calculate({
        max_walking_minutes: 15,
        mode: "walking",
        origin: validPointFixture.coordinate,
      }),
    ).rejects.toMatchObject({ code: "SPATIAL_NETWORK_NOT_READY" });
    await expect(
      routing.calculate({
        destination: validPointFixture.coordinate,
        mode: "walking",
        origin: { latitude: 0, longitude: 0 },
      }),
    ).rejects.toMatchObject({ code: "ROUTING_GRAPH_NOT_AVAILABLE" });
  });

  it("validates coordinates before reporting network availability", async () => {
    const serviceArea = new ServiceAreaService();
    const routing = new UnavailableRoutingEngine();

    await expect(
      serviceArea.calculate({
        max_walking_minutes: 15,
        mode: "walking",
        origin: { latitude: 91, longitude: 0 },
      }),
    ).rejects.toMatchObject({ code: "SPATIAL_INVALID_COORDINATE" });
    await expect(
      routing.calculate({
        destination: validPointFixture.coordinate,
        mode: "walking",
        origin: { latitude: 0, longitude: 181 },
      }),
    ).rejects.toMatchObject({ code: "SPATIAL_INVALID_COORDINATE" });
  });
});
