import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { BBoxService } from "@/src/modules/spatial/bbox.service";
import { DistanceService } from "@/src/modules/spatial/distance.service";
import type { SpatialConfig } from "@/src/modules/spatial/spatial.config";
import { SpatialError, mapSpatialRepositoryError } from "@/src/modules/spatial/spatial.errors";
import { ProximityService } from "@/src/modules/spatial/proximity.service";
import {
  type RoutingEngine,
  UnavailableRoutingEngine,
} from "@/src/modules/spatial/routing.contract";
import {
  type ServiceAreaEngine,
  ServiceAreaService,
} from "@/src/modules/spatial/service-area.service";
import {
  SpatialRepository,
  type SpatialRepositoryContract,
} from "@/src/modules/spatial/spatial.repository";
import type {
  BBoxResult,
  DistanceResult,
  GeoJsonGeometry,
  NearbyResult,
  RoutingRequest,
  RoutingResult,
  ServiceAreaRequest,
  ServiceAreaResult,
  WalkingTimeResult,
} from "@/src/modules/spatial/spatial.types";
import { WalkingTimeService } from "@/src/modules/spatial/walking-time.service";
import { RepositoryError } from "@/src/repositories/errors";

export interface SpatialServiceDependencies {
  bbox: BBoxService;
  distance: DistanceService;
  proximity: ProximityService;
  repository: Pick<
    SpatialRepositoryContract,
    "getGeometrySRID" | "validateGeometry"
  >;
  routing: RoutingEngine;
  serviceArea: ServiceAreaEngine;
  walkingTime: WalkingTimeService;
}

export class SpatialService {
  constructor(private readonly dependencies: SpatialServiceDependencies) {}

  calculateDistance(input: unknown): Promise<DistanceResult> {
    return this.dependencies.distance.calculate(input);
  }

  findNearby(input: unknown): Promise<NearbyResult> {
    return this.dependencies.proximity.findNearby(input);
  }

  findWithinBBox(input: unknown): Promise<BBoxResult> {
    return this.dependencies.bbox.findWithinBBox(input);
  }

  estimateWalkingTime(distanceMeters: unknown): WalkingTimeResult {
    return this.dependencies.walkingTime.estimate(distanceMeters);
  }

  async validateGeometry(geometry: GeoJsonGeometry): Promise<number> {
    try {
      return await this.dependencies.repository.getGeometrySRID(geometry);
    } catch (error) {
      if (error instanceof SpatialError) throw error;
      if (error instanceof RepositoryError && error.code === "VALIDATION_ERROR") {
        throw new SpatialError("SPATIAL_INVALID_GEOMETRY");
      }
      throw mapSpatialRepositoryError(error);
    }
  }

  calculateServiceArea(input: ServiceAreaRequest): Promise<ServiceAreaResult> {
    return this.dependencies.serviceArea.calculate(input);
  }

  calculateRoute(input: RoutingRequest): Promise<RoutingResult> {
    return this.dependencies.routing.calculate(input);
  }
}

export function createSpatialService(
  supabase: SupabaseClient,
  config: SpatialConfig,
): SpatialService {
  const repository = new SpatialRepository(
    supabase,
    config.maxRadiusMeters,
  );
  return new SpatialService({
    bbox: new BBoxService(
      repository,
      undefined,
      config.maxBboxLongitudeDegrees,
      config.maxBboxLatitudeDegrees,
    ),
    distance: new DistanceService(repository),
    proximity: new ProximityService(repository, config.maxRadiusMeters),
    repository,
    routing: new UnavailableRoutingEngine(),
    serviceArea: new ServiceAreaService(),
    walkingTime: new WalkingTimeService(config.walkingSpeedMetersPerSecond),
  });
}
