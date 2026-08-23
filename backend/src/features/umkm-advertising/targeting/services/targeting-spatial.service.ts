import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/src/types/database.types";
import { GeoJSONFeature } from "../types/targeting.types";

export class TargetingSpatialService {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /**
   * Generates a GeoJSON Polygon Feature representing a circular radius in meters
   * computed using PostGIS geography buffer.
   */
  async generateRadiusBufferGeoJSON(
    longitude: number,
    latitude: number,
    radiusMeters: number
  ): Promise<GeoJSONFeature> {
    try {
      const { data, error } = await (this.supabase.rpc as any)(
        "generate_radius_buffer_geojson",
        {
          lng: longitude,
          lat: latitude,
          radius_m: radiusMeters,
        }
      );

      if (!error && data) {
        return {
          type: "Feature",
          geometry: data,
          properties: {
            target_type: "RADIUS",
            radius_meters: radiusMeters,
            center: [longitude, latitude],
          },
        };
      }
    } catch (err) {
      console.warn("RPC generate_radius_buffer_geojson fallback:", err);
    }

    // Fallback: Client/Standard 64-vertex polygon approximation if RPC is unavailable
    return this.approximateCircleGeoJSON(longitude, latitude, radiusMeters);
  }

  /**
   * Helper to format a study area geometry into a GeoJSON Feature
   */
  formatStudyAreaGeoJSON(
    studyAreaId: string,
    geometry: any,
    properties?: Record<string, any>
  ): GeoJSONFeature {
    return {
      type: "Feature",
      geometry: typeof geometry === "string" ? JSON.parse(geometry) : geometry,
      properties: {
        target_type: "STUDY_AREA",
        study_area_id: studyAreaId,
        ...(properties || {}),
      },
    };
  }

  /**
   * Fallback circular polygon generator (WGS84 geodesic approximation)
   */
  private approximateCircleGeoJSON(
    lng: number,
    lat: number,
    radiusMeters: number,
    points = 64
  ): GeoJSONFeature {
    const coordinates: [number, number][] = [];
    const distanceKm = radiusMeters / 1000;
    const earthRadiusKm = 6371;

    const latRad = (lat * Math.PI) / 180;
    const lngRad = (lng * Math.PI) / 180;
    const dRad = distanceKm / earthRadiusKm;

    for (let i = 0; i <= points; i++) {
      const bearing = (i * 2 * Math.PI) / points;
      const pointLatRad = Math.asin(
        Math.sin(latRad) * Math.cos(dRad) +
          Math.cos(latRad) * Math.sin(dRad) * Math.cos(bearing)
      );
      const pointLngRad =
        lngRad +
        Math.atan2(
          Math.sin(bearing) * Math.sin(dRad) * Math.cos(latRad),
          Math.cos(dRad) - Math.sin(latRad) * Math.sin(pointLatRad)
        );

      const pointLng = ((pointLngRad * 180) / Math.PI + 540) % 360 - 180;
      const pointLat = (pointLatRad * 180) / Math.PI;
      coordinates.push([pointLng, pointLat]);
    }

    return {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [coordinates],
      },
      properties: {
        target_type: "RADIUS",
        radius_meters: radiusMeters,
        center: [lng, lat],
      },
    };
  }
}
