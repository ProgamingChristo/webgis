import { apiClient } from "@/src/lib/api-client";
import type { Merchant } from "@/types/getra";
import type * as GeoJSON from "geojson";

export type AdminMapImportSourceType =
  | "PUBLIC_API_URL"
  | "JSON_PAYLOAD";

export interface AdminImportRegion {
  id: string;
  name: string;
  count: number;
  bounds: {
    west: number;
    south: number;
    east: number;
    north: number;
  };
  geometry: GeoJSON.MultiPolygon;
}

export interface AdminImportedLayer {
  layer_id: string;
  layer_name: string;
  source_type: AdminMapImportSourceType;
  total_features: number;
  merchants: Merchant[];
  limitation: string;
  persisted?: boolean;
  imported_at?: string;
  regions?: AdminImportRegion[];
  boundaries?: GeoJSON.FeatureCollection<GeoJSON.MultiPolygon>;
}

export type AdminMapImportPreviewRequest =
  | {
      source_type: "PUBLIC_API_URL";
      url: string;
      layer_name?: string;
    }
  | {
      source_type: "JSON_PAYLOAD";
      payload: unknown;
      layer_name?: string;
    };

export interface AdminMapImportListResponse {
  layers: AdminImportedLayer[];
  total_layers: number;
  total_features: number;
}

export const adminMapImportService = {
  preview(
    request: AdminMapImportPreviewRequest,
  ): Promise<AdminImportedLayer> {
    return apiClient.post<AdminImportedLayer>(
      "/api/admin/map-import/preview",
      request,
    );
  },

  commit(
    layer: AdminImportedLayer,
  ): Promise<AdminImportedLayer> {
    return apiClient.post<AdminImportedLayer>(
      "/api/admin/map-import/commit",
      {
        layer_name: layer.layer_name,
        source_type: layer.source_type,
        merchants: layer.merchants,
      },
    );
  },

  list(): Promise<AdminMapImportListResponse> {
    return apiClient.get<AdminMapImportListResponse>(
      "/api/map-import/layers",
    );
  },

  deleteLayer(
    layerId: string,
  ): Promise<{
    layer_id: string;
    deleted_merchants: number;
    deleted_study_areas: number;
  }> {
    return apiClient.delete<{
      layer_id: string;
      deleted_merchants: number;
      deleted_study_areas: number;
    }>(
      `/api/admin/map-import/layers/${layerId}`,
    );
  },

  updateLayer(
    layerId: string,
    layerName: string,
  ): Promise<{
    layer_id: string;
    layer_name: string;
    updated_merchants: number;
    updated_study_areas: number;
  }> {
    return apiClient.patch<{
      layer_id: string;
      layer_name: string;
      updated_merchants: number;
      updated_study_areas: number;
    }>(
      `/api/admin/map-import/layers/${layerId}`,
      {
        layer_name: layerName,
      },
    );
  },
};
