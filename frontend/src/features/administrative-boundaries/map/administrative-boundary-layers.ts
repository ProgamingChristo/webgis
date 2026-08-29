import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";

import type { AdministrativeBoundaryCollection } from "@/src/features/administrative-boundaries/types/administrative-boundary.types";

export const ADMIN_REGION_SOURCE_ID = "getra-administrative-regions";
export const ADMIN_REGION_FILL_LAYER_ID = "getra-administrative-regions-fill";
export const ADMIN_REGION_LINE_LAYER_ID = "getra-administrative-regions-line";
export const ADMIN_REGION_LABEL_LAYER_ID = "getra-administrative-regions-label";

export function syncAdministrativeBoundaryLayers(
  map: MapLibreMap,
  collection: AdministrativeBoundaryCollection,
) {
  if (!map.isStyleLoaded()) return;
  const existing = map.getSource(ADMIN_REGION_SOURCE_ID) as GeoJSONSource | undefined;
  if (existing) {
    existing.setData(collection);
  } else {
    map.addSource(ADMIN_REGION_SOURCE_ID, { type: "geojson", data: collection });
  }

  if (!map.getLayer(ADMIN_REGION_FILL_LAYER_ID)) {
    map.addLayer({
      id: ADMIN_REGION_FILL_LAYER_ID,
      type: "fill",
      source: ADMIN_REGION_SOURCE_ID,
      paint: {
        "fill-color": "#06b6d4",
        "fill-opacity": 0.11,
      },
    });
  }
  if (!map.getLayer(ADMIN_REGION_LINE_LAYER_ID)) {
    map.addLayer({
      id: ADMIN_REGION_LINE_LAYER_ID,
      type: "line",
      source: ADMIN_REGION_SOURCE_ID,
      paint: {
        "line-color": "#22d3ee",
        "line-width": ["interpolate", ["linear"], ["zoom"], 9, 2, 14, 3.5],
        "line-opacity": 0.95,
      },
    });
  }
  if (!map.getLayer(ADMIN_REGION_LABEL_LAYER_ID)) {
    map.addLayer({
      id: ADMIN_REGION_LABEL_LAYER_ID,
      type: "symbol",
      source: ADMIN_REGION_SOURCE_ID,
      minzoom: 9,
      maxzoom: 15.5,
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 9, 11, 14, 14],
        "text-transform": "uppercase",
        "text-letter-spacing": 0,
        "text-allow-overlap": false,
        "text-ignore-placement": false,
        "symbol-placement": "point",
      },
      paint: {
        "text-color": "#ecfeff",
        "text-halo-color": "#042f3e",
        "text-halo-width": 2,
      },
    });
  }
}
