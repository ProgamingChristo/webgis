import {
  geoJsonGeometrySchema,
  multiLineStringGeometrySchema,
  multiPolygonGeometrySchema,
  pointGeometrySchema,
} from "@/src/schemas/spatial.schema";
import type {
  CorridorGeometry,
  DatabaseGeometry,
  GeoJsonGeometry,
  MultiLineStringGeometry,
  MultiPolygonGeometry,
  PointGeometry,
} from "@/src/types/spatial";

export class GeometryMappingError extends Error {
  constructor(message = "Database geometry is not valid GeoJSON") {
    super(message);
    this.name = "GeometryMappingError";
  }
}

function decodeDatabaseGeometry(geometry: DatabaseGeometry): unknown {
  if (typeof geometry !== "string") {
    return geometry;
  }

  const serialized = geometry.trim();

  if (!serialized.startsWith("{")) {
    throw new GeometryMappingError();
  }

  try {
    return JSON.parse(serialized) as unknown;
  } catch {
    throw new GeometryMappingError();
  }
}

export function mapDatabaseGeometryToGeoJson(
  geometry: DatabaseGeometry,
): GeoJsonGeometry {
  const parsed = geoJsonGeometrySchema.safeParse(
    decodeDatabaseGeometry(geometry),
  );

  if (!parsed.success) {
    throw new GeometryMappingError();
  }

  return parsed.data;
}

export function mapDatabasePointGeometry(
  geometry: DatabaseGeometry,
): PointGeometry {
  const parsed = pointGeometrySchema.safeParse(decodeDatabaseGeometry(geometry));

  if (!parsed.success) {
    throw new GeometryMappingError("Database geometry is not a valid Point");
  }

  return parsed.data;
}

export function mapDatabaseMultiLineStringGeometry(
  geometry: DatabaseGeometry,
): MultiLineStringGeometry {
  const parsed = multiLineStringGeometrySchema.safeParse(
    decodeDatabaseGeometry(geometry),
  );

  if (!parsed.success) {
    throw new GeometryMappingError(
      "Database geometry is not a valid MultiLineString",
    );
  }

  return parsed.data;
}

export function mapDatabaseMultiPolygonGeometry(
  geometry: DatabaseGeometry,
): MultiPolygonGeometry {
  const parsed = multiPolygonGeometrySchema.safeParse(
    decodeDatabaseGeometry(geometry),
  );

  if (!parsed.success) {
    throw new GeometryMappingError(
      "Database geometry is not a valid MultiPolygon",
    );
  }

  return parsed.data;
}

/** Normalize accepted create/update input to the Phase 4 database typemod. */
export function canonicalizeCorridorGeometry(
  geometry: CorridorGeometry,
): MultiLineStringGeometry {
  if (geometry.type === "MultiLineString") {
    return mapDatabaseMultiLineStringGeometry(geometry);
  }

  return mapDatabaseMultiLineStringGeometry({
    type: "MultiLineString",
    coordinates: [geometry.coordinates],
  });
}
