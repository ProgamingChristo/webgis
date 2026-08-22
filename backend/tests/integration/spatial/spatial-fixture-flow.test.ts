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
import type { SpatialRepositoryRecord } from "@/src/modules/spatial/spatial.dto";
import type { SpatialRepositoryContract } from "@/src/modules/spatial/spatial.repository";
import { SpatialService } from "@/src/modules/spatial/spatial.service";
import type {
  BBoxQuery,
  Coordinate,
  GeoJsonGeometry,
  NearbyQuery,
} from "@/src/modules/spatial/spatial.types";
import { WalkingTimeService } from "@/src/modules/spatial/walking-time.service";

const repositoryRecord = nearbyFixture
  .repository_records[0] as unknown as SpatialRepositoryRecord;

class FixtureSpatialRepository implements SpatialRepositoryContract {
  readonly operations: string[] = [];
  readonly writes: unknown[] = [];

  async calculateDistance(
    origin: Coordinate,
    destination: Coordinate,
  ): Promise<number> {
    this.operations.push("calculateDistance");
    if (
      origin.longitude !== destination.longitude ||
      origin.latitude !== destination.latitude
    ) {
      throw new Error("TEST fixture port only supports its identical-point case");
    }
    return 0;
  }

  async findWithinBBox(query: BBoxQuery): Promise<SpatialRepositoryRecord[]> {
    this.operations.push(`findWithinBBox:${query.entity_type}`);
    return [repositoryRecord];
  }

  async findWithinRadius(
    query: NearbyQuery,
  ): Promise<SpatialRepositoryRecord[]> {
    this.operations.push(`findWithinRadius:${query.entity_type}`);
    return [repositoryRecord];
  }

  async getGeometrySRID(geometry: GeoJsonGeometry): Promise<number> {
    this.operations.push("getGeometrySRID");
    if (!(await this.validateGeometry(geometry))) {
      throw new Error("TEST invalid geometry");
    }
    return 4326;
  }

  async validateGeometry(geometry: GeoJsonGeometry): Promise<boolean> {
    this.operations.push("validateGeometry");
    return geometry.type === "Point";
  }
}

describe("Phase 7 synthetic fixture-only spatial flow", () => {
  it("composes services and DTO mapping with no production data or mutation", async () => {
    const repository = new FixtureSpatialRepository();
    const service = new SpatialService({
      bbox: new BBoxService(repository, [
        "FIXTURE_DATA",
        "NO_PRODUCTION_DATA",
      ]),
      distance: new DistanceService(repository),
      proximity: new ProximityService(repository, 50_000, [
        "FIXTURE_DATA",
        "NO_PRODUCTION_DATA",
      ]),
      repository,
      routing: new UnavailableRoutingEngine(),
      serviceArea: new ServiceAreaService(),
      walkingTime: new WalkingTimeService(1.25),
    });

    const distance = await service.calculateDistance({
      destination: validPointFixture.coordinate,
      origin: validPointFixture.coordinate,
    });
    const nearby = await service.findNearby(nearbyFixture.domain_query);
    const bbox = await service.findWithinBBox(validBBoxFixture.domain_query);
    const srid = await service.validateGeometry(
      validPointFixture.geojson as GeoJsonGeometry,
    );
    const walking = service.estimateWalkingTime(100);

    expect(distance).toMatchObject({
      analysis_method: "postgis_geography_distance",
      distance_meters: 0,
      srid: 4326,
    });
    expect(nearby).toMatchObject({
      analysis_method: "postgis_dwithin",
      limitation_flags: ["FIXTURE_DATA", "NO_PRODUCTION_DATA"],
      returned_count: 1,
    });
    expect(bbox).toMatchObject({
      analysis_method: "postgis_bbox_intersection",
      limitation_flags: ["FIXTURE_DATA", "NO_PRODUCTION_DATA"],
      returned_count: 1,
    });
    expect(nearby.records[0]).toEqual(bbox.records[0]);
    expect(nearby.records[0]?.label).toBe("TEST SPATIAL NODE");
    expect(JSON.stringify(nearby.records[0])).not.toContain(
      "MUST_NOT_REACH_API_DTO",
    );
    expect(srid).toBe(4326);
    expect(walking).toMatchObject({
      analysis_method: "estimated_from_distance",
      estimated_seconds: 80,
    });
    expect(repository.operations).toEqual([
      "calculateDistance",
      "findWithinRadius:transport_node",
      "findWithinBBox:transport_node",
      "getGeometrySRID",
      "validateGeometry",
    ]);
    expect(repository.writes).toHaveLength(0);
  });
});
