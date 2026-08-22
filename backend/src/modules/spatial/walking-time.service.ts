import "server-only";

import { SPATIAL_ENGINE_SOURCE } from "@/src/modules/spatial/spatial.constants";
import { SpatialError } from "@/src/modules/spatial/spatial.errors";
import { walkingDistanceSchema } from "@/src/modules/spatial/spatial.schema";
import type { WalkingTimeResult } from "@/src/modules/spatial/spatial.types";

export class WalkingTimeService {
  constructor(private readonly walkingSpeedMetersPerSecond: number) {
    if (
      !Number.isFinite(walkingSpeedMetersPerSecond) ||
      walkingSpeedMetersPerSecond < 0.1 ||
      walkingSpeedMetersPerSecond > 3
    ) {
      throw new SpatialError("SPATIAL_INVALID_CONFIGURATION");
    }
  }

  estimate(distanceMeters: unknown): WalkingTimeResult {
    const parsed = walkingDistanceSchema.safeParse(distanceMeters);
    if (!parsed.success) {
      throw new SpatialError("SPATIAL_INVALID_DISTANCE");
    }

    return {
      analysis_method: "estimated_from_distance",
      distance_meters: parsed.data,
      estimated_seconds: Math.ceil(
        parsed.data / this.walkingSpeedMetersPerSecond,
      ),
      limitation_flags: ["ESTIMATED_WALKING_TIME"],
      source: SPATIAL_ENGINE_SOURCE,
      walking_speed_mps: this.walkingSpeedMetersPerSecond,
    };
  }
}
