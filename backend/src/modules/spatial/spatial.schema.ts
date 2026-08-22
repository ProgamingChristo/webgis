import { z } from "zod";

import { ApplicationError } from "@/src/lib/errors";
import {
  BBOX_ENTITY_TYPES,
  DEFAULT_SPATIAL_MAX_BBOX_LATITUDE_DEGREES,
  DEFAULT_SPATIAL_MAX_BBOX_LONGITUDE_DEGREES,
  DEFAULT_SPATIAL_RESULT_LIMIT,
  MAX_SPATIAL_RESULT_LIMIT,
  NEARBY_ENTITY_TYPES,
} from "@/src/modules/spatial/spatial.constants";
import { SpatialError } from "@/src/modules/spatial/spatial.errors";
import type {
  BBoxQuery,
  DistanceRequest,
  NearbyQuery,
  RoutingRequest,
  ServiceAreaRequest,
} from "@/src/modules/spatial/spatial.types";
import {
  latitudeSchema,
  longitudeSchema,
} from "@/src/schemas/spatial.schema";

const queryNumber = (schema: z.ZodNumber) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.coerce.number().pipe(schema),
  );

export const coordinateSchema = z
  .object({
    latitude: latitudeSchema,
    longitude: longitudeSchema,
  })
  .strict();

export const distanceRequestSchema = z
  .object({
    destination: coordinateSchema,
    origin: coordinateSchema,
  })
  .strict();

export const boundingBoxApiSchema = z
  .object({
    east: queryNumber(longitudeSchema),
    north: queryNumber(latitudeSchema),
    south: queryNumber(latitudeSchema),
    west: queryNumber(longitudeSchema),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.west >= value.east) {
      context.addIssue({
        code: "custom",
        message: "west must be less than east",
        path: ["west"],
      });
    }

    if (value.south >= value.north) {
      context.addIssue({
        code: "custom",
        message: "south must be less than north",
        path: ["south"],
      });
    }
  });

const strictLimitSchema = queryNumber(
  z.number().int().positive().max(MAX_SPATIAL_RESULT_LIMIT),
).default(DEFAULT_SPATIAL_RESULT_LIMIT);

export function createNearbyQuerySchema(maxRadiusMeters: number) {
  return z
    .object({
      lat: queryNumber(latitudeSchema),
      limit: strictLimitSchema,
      lng: queryNumber(longitudeSchema),
      radius: queryNumber(
        z.number().finite().positive().max(maxRadiusMeters),
      ),
      type: z.enum(NEARBY_ENTITY_TYPES),
    })
    .strict()
    .transform<NearbyQuery>((value) => ({
      entity_type: value.type,
      limit: value.limit,
      origin: { latitude: value.lat, longitude: value.lng },
      radius_meters: value.radius,
    }));
}

export function createNearbyDomainQuerySchema(maxRadiusMeters: number) {
  return z
    .object({
      entity_type: z.enum(NEARBY_ENTITY_TYPES),
      limit: z.number().int().positive().max(MAX_SPATIAL_RESULT_LIMIT),
      origin: coordinateSchema,
      radius_meters: z.number().finite().positive().max(maxRadiusMeters),
    })
    .strict();
}

export const bboxQuerySchema = z
  .object({
    east: queryNumber(longitudeSchema),
    limit: strictLimitSchema,
    north: queryNumber(latitudeSchema),
    south: queryNumber(latitudeSchema),
    type: z.enum(BBOX_ENTITY_TYPES),
    west: queryNumber(longitudeSchema),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.west >= value.east) {
      context.addIssue({ code: "custom", message: "invalid west/east", path: ["west"] });
    }
    if (value.south >= value.north) {
      context.addIssue({ code: "custom", message: "invalid south/north", path: ["south"] });
    }
  })
  .transform<BBoxQuery>((value) => ({
    bbox: {
      east: value.east,
      north: value.north,
      south: value.south,
      west: value.west,
    },
    entity_type: value.type,
    limit: value.limit,
  }));

export const bboxDomainQuerySchema = z
  .object({
    bbox: boundingBoxApiSchema,
    entity_type: z.enum(BBOX_ENTITY_TYPES),
    limit: z.number().int().positive().max(MAX_SPATIAL_RESULT_LIMIT),
  })
  .strict();

function assertBBoxWithinOperationalLimits(
  bbox: BBoxQuery["bbox"],
  maximumLongitudeDegrees: number,
  maximumLatitudeDegrees: number,
): void {
  if (
    bbox.east - bbox.west > maximumLongitudeDegrees ||
    bbox.north - bbox.south > maximumLatitudeDegrees
  ) {
    throw new SpatialError("SPATIAL_INVALID_BBOX");
  }
}

export const walkingDistanceSchema = z.number().finite().nonnegative();

export const serviceAreaRequestSchema = z
  .object({
    max_walking_minutes: z.number().finite().positive().max(240),
    mode: z.literal("walking"),
    origin: coordinateSchema,
  })
  .strict();

export const routingRequestSchema = z
  .object({
    constraints: z
      .object({ avoid: z.array(z.string().trim().min(1).max(64)).max(10).optional() })
      .strict()
      .optional(),
    destination: coordinateSchema,
    mode: z.literal("walking"),
    origin: coordinateSchema,
  })
  .strict();

function issueTouches(error: z.ZodError, keys: ReadonlySet<PropertyKey>): boolean {
  return error.issues.some((issue) => issue.path.some((part) => keys.has(part)));
}

export function parseDistanceRequest(input: unknown): DistanceRequest {
  const parsed = distanceRequestSchema.safeParse(input);
  if (!parsed.success) {
    throw new SpatialError("SPATIAL_INVALID_COORDINATE");
  }
  return parsed.data;
}

export function parseNearbyQuery(
  input: unknown,
  maxRadiusMeters: number,
): NearbyQuery {
  const parsed = createNearbyQuerySchema(maxRadiusMeters).safeParse(input);
  if (parsed.success) return parsed.data;

  if (issueTouches(parsed.error, new Set(["lat", "lng"]))) {
    throw new SpatialError("SPATIAL_INVALID_COORDINATE");
  }
  if (issueTouches(parsed.error, new Set(["radius"]))) {
    throw new SpatialError("SPATIAL_INVALID_RADIUS");
  }
  throw new ApplicationError("VALIDATION_ERROR");
}

export function parseNearbyDomainQuery(
  input: unknown,
  maxRadiusMeters: number,
): NearbyQuery {
  const parsed = createNearbyDomainQuerySchema(maxRadiusMeters).safeParse(input);
  if (parsed.success) return parsed.data;

  if (
    issueTouches(
      parsed.error,
      new Set(["origin", "latitude", "longitude"]),
    )
  ) {
    throw new SpatialError("SPATIAL_INVALID_COORDINATE");
  }
  if (issueTouches(parsed.error, new Set(["radius_meters"]))) {
    throw new SpatialError("SPATIAL_INVALID_RADIUS");
  }
  throw new ApplicationError("VALIDATION_ERROR");
}

export function parseBBoxQuery(
  input: unknown,
  maximumLongitudeDegrees = DEFAULT_SPATIAL_MAX_BBOX_LONGITUDE_DEGREES,
  maximumLatitudeDegrees = DEFAULT_SPATIAL_MAX_BBOX_LATITUDE_DEGREES,
): BBoxQuery {
  const parsed = bboxQuerySchema.safeParse(input);
  if (parsed.success) {
    assertBBoxWithinOperationalLimits(
      parsed.data.bbox,
      maximumLongitudeDegrees,
      maximumLatitudeDegrees,
    );
    return parsed.data;
  }

  if (issueTouches(parsed.error, new Set(["west", "south", "east", "north"]))) {
    throw new SpatialError("SPATIAL_INVALID_BBOX");
  }
  throw new ApplicationError("VALIDATION_ERROR");
}

export function parseBBoxDomainQuery(
  input: unknown,
  maximumLongitudeDegrees = DEFAULT_SPATIAL_MAX_BBOX_LONGITUDE_DEGREES,
  maximumLatitudeDegrees = DEFAULT_SPATIAL_MAX_BBOX_LATITUDE_DEGREES,
): BBoxQuery {
  const parsed = bboxDomainQuerySchema.safeParse(input);
  if (parsed.success) {
    assertBBoxWithinOperationalLimits(
      parsed.data.bbox,
      maximumLongitudeDegrees,
      maximumLatitudeDegrees,
    );
    return parsed.data;
  }

  if (
    issueTouches(
      parsed.error,
      new Set(["bbox", "west", "south", "east", "north"]),
    )
  ) {
    throw new SpatialError("SPATIAL_INVALID_BBOX");
  }
  throw new ApplicationError("VALIDATION_ERROR");
}

export function parseServiceAreaRequest(input: unknown): ServiceAreaRequest {
  const parsed = serviceAreaRequestSchema.safeParse(input);
  if (!parsed.success) {
    if (issueTouches(parsed.error, new Set(["origin", "latitude", "longitude"]))) {
      throw new SpatialError("SPATIAL_INVALID_COORDINATE");
    }
    throw new ApplicationError("VALIDATION_ERROR");
  }
  return parsed.data;
}

export function parseRoutingRequest(input: unknown): RoutingRequest {
  const parsed = routingRequestSchema.safeParse(input);
  if (!parsed.success) {
    if (
      issueTouches(
        parsed.error,
        new Set(["origin", "destination", "latitude", "longitude"]),
      )
    ) {
      throw new SpatialError("SPATIAL_INVALID_COORDINATE");
    }
    throw new ApplicationError("VALIDATION_ERROR");
  }
  return parsed.data;
}
