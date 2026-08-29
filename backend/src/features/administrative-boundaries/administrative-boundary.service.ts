import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AdministrativeBoundaryCollection,
  AdministrativeBoundaryFeature,
  RegionBounds,
} from "@/src/features/administrative-boundaries/administrative-boundary.types";
import { ApplicationError } from "@/src/lib/errors";

export class AdministrativeBoundaryService {
  constructor(private readonly supabase: SupabaseClient<any>) {}

  async getByIds(ids: string[]): Promise<AdministrativeBoundaryCollection> {
    const { data, error } = await this.supabase
      .from("administrative_regions")
      .select("id,name,region_type,geometry")
      .in("id", ids)
      .range(0, ids.length - 1);
    if (error) throw error;

    const byId = new Map(
      (data ?? []).map((row: any) => [row.id, toBoundaryFeature(row)]),
    );
    const features = ids.map((id) => byId.get(id)).filter(
      (feature): feature is AdministrativeBoundaryFeature => Boolean(feature),
    );
    if (features.length !== ids.length) {
      throw new ApplicationError("VALIDATION_ERROR", "Wilayah tidak ditemukan.");
    }

    return { type: "FeatureCollection", features };
  }
}

export function toBoundaryFeature(row: {
  id: unknown;
  name: unknown;
  region_type: unknown;
  geometry: unknown;
}): AdministrativeBoundaryFeature {
  const geometry = readGeometry(row.geometry);
  if (
    typeof row.id !== "string" ||
    typeof row.name !== "string" ||
    row.region_type !== "CITY" ||
    !geometry
  ) {
    throw new Error("Administrative boundary row is invalid");
  }

  return {
    type: "Feature",
    id: row.id,
    properties: {
      id: row.id,
      name: row.name,
      region_type: "CITY",
      bounds: calculateBounds(geometry.coordinates),
    },
    geometry,
  };
}

function readGeometry(value: unknown): AdministrativeBoundaryFeature["geometry"] | null {
  let candidate = value;
  if (typeof value === "string") {
    try {
      candidate = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (typeof candidate !== "object" || candidate === null) return null;
  const geometry = candidate as { type?: unknown; coordinates?: unknown };
  if (
    (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") ||
    !Array.isArray(geometry.coordinates)
  ) return null;
  return {
    type: geometry.type,
    coordinates: geometry.coordinates,
  };
}

function calculateBounds(coordinates: unknown[]): RegionBounds {
  const bounds: RegionBounds = {
    west: Number.POSITIVE_INFINITY,
    south: Number.POSITIVE_INFINITY,
    east: Number.NEGATIVE_INFINITY,
    north: Number.NEGATIVE_INFINITY,
  };

  const visit = (value: unknown) => {
    if (!Array.isArray(value)) throw new Error("Boundary coordinates are invalid");
    if (
      value.length >= 2 &&
      typeof value[0] === "number" &&
      typeof value[1] === "number"
    ) {
      const [longitude, latitude] = value;
      if (
        !Number.isFinite(longitude) || !Number.isFinite(latitude) ||
        longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90
      ) throw new Error("Boundary coordinate is outside EPSG:4326");
      bounds.west = Math.min(bounds.west, longitude);
      bounds.south = Math.min(bounds.south, latitude);
      bounds.east = Math.max(bounds.east, longitude);
      bounds.north = Math.max(bounds.north, latitude);
      return;
    }
    value.forEach(visit);
  };

  visit(coordinates);
  if (!Number.isFinite(bounds.west)) throw new Error("Boundary geometry is empty");
  return bounds;
}
