import "server-only";

import { z } from "zod";

import {
  DEFAULT_SPATIAL_MAX_BBOX_LATITUDE_DEGREES,
  DEFAULT_SPATIAL_MAX_BBOX_LONGITUDE_DEGREES,
  DEFAULT_SPATIAL_MAX_RADIUS_METERS,
  DEFAULT_WALKING_SPEED_METERS_PER_SECOND,
  MAX_CONFIGURABLE_RADIUS_METERS,
} from "@/src/modules/spatial/spatial.constants";
import { SpatialError } from "@/src/modules/spatial/spatial.errors";

export interface SpatialConfig {
  maxBboxLatitudeDegrees: number;
  maxBboxLongitudeDegrees: number;
  maxRadiusMeters: number;
  walkingSpeedMetersPerSecond: number;
}

export interface SpatialEnvironmentInput {
  DEFAULT_WALKING_SPEED_MPS?: string;
  SPATIAL_MAX_BBOX_LATITUDE_DEGREES?: string;
  SPATIAL_MAX_BBOX_LONGITUDE_DEGREES?: string;
  SPATIAL_MAX_RADIUS_METERS?: string;
}

const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const spatialEnvironmentSchema = z
  .object({
    DEFAULT_WALKING_SPEED_MPS: z.preprocess(
      blankToUndefined,
      z.coerce
        .number()
        .finite()
        .min(0.1)
        .max(3)
        .default(DEFAULT_WALKING_SPEED_METERS_PER_SECOND),
    ),
    SPATIAL_MAX_BBOX_LATITUDE_DEGREES: z.preprocess(
      blankToUndefined,
      z.coerce
        .number()
        .finite()
        .positive()
        .max(180)
        .default(DEFAULT_SPATIAL_MAX_BBOX_LATITUDE_DEGREES),
    ),
    SPATIAL_MAX_BBOX_LONGITUDE_DEGREES: z.preprocess(
      blankToUndefined,
      z.coerce
        .number()
        .finite()
        .positive()
        .max(360)
        .default(DEFAULT_SPATIAL_MAX_BBOX_LONGITUDE_DEGREES),
    ),
    SPATIAL_MAX_RADIUS_METERS: z.preprocess(
      blankToUndefined,
      z.coerce
        .number()
        .int()
        .positive()
        .max(MAX_CONFIGURABLE_RADIUS_METERS)
        .default(DEFAULT_SPATIAL_MAX_RADIUS_METERS),
    ),
  })
  .strict();

export function parseSpatialConfig(input: SpatialEnvironmentInput): SpatialConfig {
  const parsed = spatialEnvironmentSchema.safeParse(input);
  if (!parsed.success) {
    throw new SpatialError("SPATIAL_INVALID_CONFIGURATION");
  }

  return {
    maxBboxLatitudeDegrees:
      parsed.data.SPATIAL_MAX_BBOX_LATITUDE_DEGREES,
    maxBboxLongitudeDegrees:
      parsed.data.SPATIAL_MAX_BBOX_LONGITUDE_DEGREES,
    maxRadiusMeters: parsed.data.SPATIAL_MAX_RADIUS_METERS,
    walkingSpeedMetersPerSecond: parsed.data.DEFAULT_WALKING_SPEED_MPS,
  };
}

/** Lazy server-only loading keeps optional Phase 7 config out of browser code. */
export function loadSpatialConfig(): SpatialConfig {
  return parseSpatialConfig({
    DEFAULT_WALKING_SPEED_MPS: process.env.DEFAULT_WALKING_SPEED_MPS,
    SPATIAL_MAX_BBOX_LATITUDE_DEGREES:
      process.env.SPATIAL_MAX_BBOX_LATITUDE_DEGREES,
    SPATIAL_MAX_BBOX_LONGITUDE_DEGREES:
      process.env.SPATIAL_MAX_BBOX_LONGITUDE_DEGREES,
    SPATIAL_MAX_RADIUS_METERS: process.env.SPATIAL_MAX_RADIUS_METERS,
  });
}
