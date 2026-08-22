import { z } from "zod";

export const longitudeSchema = z.number().finite().min(-180).max(180);
export const latitudeSchema = z.number().finite().min(-90).max(90);

export const positionSchema = z
  .tuple([longitudeSchema, latitudeSchema]);

const lineCoordinatesSchema = z.array(positionSchema).min(2);

const linearRingSchema = z
  .array(positionSchema)
  .min(4)
  .superRefine((ring, context) => {
    const first = ring[0];
    const last = ring[ring.length - 1];

    if (first[0] !== last[0] || first[1] !== last[1]) {
      context.addIssue({
        code: "custom",
        message: "A polygon ring must be closed",
      });
    }
  });

const polygonCoordinatesSchema = z.array(linearRingSchema).min(1);

export const pointGeometrySchema = z
  .object({
    coordinates: positionSchema,
    type: z.literal("Point"),
  })
  .strict();

export const lineStringGeometrySchema = z
  .object({
    coordinates: lineCoordinatesSchema,
    type: z.literal("LineString"),
  })
  .strict();

export const multiLineStringGeometrySchema = z
  .object({
    coordinates: z.array(lineCoordinatesSchema).min(1),
    type: z.literal("MultiLineString"),
  })
  .strict();

export const polygonGeometrySchema = z
  .object({
    coordinates: polygonCoordinatesSchema,
    type: z.literal("Polygon"),
  })
  .strict();

export const multiPolygonGeometrySchema = z
  .object({
    coordinates: z.array(polygonCoordinatesSchema).min(1),
    type: z.literal("MultiPolygon"),
  })
  .strict();

export const corridorGeometrySchema = z.union([
  lineStringGeometrySchema,
  multiLineStringGeometrySchema,
]);

export const geoJsonGeometrySchema = z.union([
  pointGeometrySchema,
  lineStringGeometrySchema,
  multiLineStringGeometrySchema,
  polygonGeometrySchema,
  multiPolygonGeometrySchema,
]);

export const boundingBoxSchema = z
  .object({
    min_lng: z.coerce.number().finite().min(-180).max(180),
    min_lat: z.coerce.number().finite().min(-90).max(90),
    max_lng: z.coerce.number().finite().min(-180).max(180),
    max_lat: z.coerce.number().finite().min(-90).max(90),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.min_lng >= value.max_lng) {
      context.addIssue({
        code: "custom",
        message: "min_lng must be less than max_lng",
        path: ["min_lng"],
      });
    }

    if (value.min_lat >= value.max_lat) {
      context.addIssue({
        code: "custom",
        message: "min_lat must be less than max_lat",
        path: ["min_lat"],
      });
    }
  });

export const nearPointSchema = z
  .object({
    longitude: z.coerce.number().finite().min(-180).max(180),
    latitude: z.coerce.number().finite().min(-90).max(90),
    radius_meters: z.coerce.number().finite().positive(),
  })
  .strict();

export type PointGeometryInput = z.infer<typeof pointGeometrySchema>;
export type CorridorGeometryInput = z.infer<typeof corridorGeometrySchema>;
export type PolygonGeometryInput = z.infer<typeof polygonGeometrySchema>;
export type MultiPolygonGeometryInput = z.infer<typeof multiPolygonGeometrySchema>;
export type GeoJsonGeometryInput = z.infer<typeof geoJsonGeometrySchema>;
export type BoundingBoxInput = z.infer<typeof boundingBoxSchema>;
export type NearPointInput = z.infer<typeof nearPointSchema>;
