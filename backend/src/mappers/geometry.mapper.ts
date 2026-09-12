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
  let decoded: unknown = geometry;

  if (typeof geometry === "string") {
    const serialized = geometry.trim();

    if (!serialized.startsWith("{")) {
      throw new GeometryMappingError();
    }

    try {
      decoded = JSON.parse(serialized) as unknown;
    } catch {
      throw new GeometryMappingError();
    }
  }

  if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) return decoded;

  const record = decoded as Record<string, unknown>;
  if (!("crs" in record)) return decoded;

  const geoJson = { ...record };
  delete geoJson.crs;
  return geoJson;
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
