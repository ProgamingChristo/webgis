import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { AnalyticsMapCollection, AnalyticsMode } from "../types/demand-intelligence.types";

export const ANALYTICS_SOURCE_ID = "getra-demand-intelligence";
export const ANALYTICS_FILL_LAYER_ID = "getra-demand-intelligence-fill";
export const ANALYTICS_LINE_LAYER_ID = "getra-demand-intelligence-line";
export const ANALYTICS_LABEL_LAYER_ID = "getra-demand-intelligence-label";

export function syncDemandIntelligenceLayers(
  map: MapLibreMap,
  collection: AnalyticsMapCollection | null,
  mode: AnalyticsMode,
) {
  if (!map.isStyleLoaded()) return;
  if (!collection || collection.features.length === 0) {
    removeDemandIntelligenceLayers(map);
    return;
  }
  const existing = map.getSource(ANALYTICS_SOURCE_ID) as GeoJSONSource | undefined;
  if (existing) existing.setData(collection);
  else map.addSource(ANALYTICS_SOURCE_ID, { type: "geojson", data: collection });

  if (!map.getLayer(ANALYTICS_FILL_LAYER_ID)) {
    map.addLayer({
      id: ANALYTICS_FILL_LAYER_ID,
      type: "fill",
      source: ANALYTICS_SOURCE_ID,
      paint: { "fill-opacity": ["case", ["==", ["get", "selected"], true], 0.66, 0.42] },
    });
  }
  map.setPaintProperty(ANALYTICS_FILL_LAYER_ID, "fill-color", mode === "DEMAND"
    ? ["interpolate", ["linear"], ["get", "demand_score"], 0, "#164e63", 35, "#0891b2", 70, "#84cc16", 100, "#fde047"]
    : ["case", ["==", ["get", "retail_gap"], null], "#64748b", ["interpolate", ["linear"], ["get", "retail_gap"], -100, "#e11d48", 0, "#cbd5e1", 100, "#65a30d"]]);
  if (!map.getLayer(ANALYTICS_LINE_LAYER_ID)) map.addLayer({
    id: ANALYTICS_LINE_LAYER_ID,
    type: "line",
    source: ANALYTICS_SOURCE_ID,
    paint: { "line-color": ["case", ["==", ["get", "selected"], true], "#ffffff", "#d5edf2"], "line-width": ["case", ["==", ["get", "selected"], true], 3, 1.2] },
  });
  if (!map.getLayer(ANALYTICS_LABEL_LAYER_ID)) map.addLayer({
    id: ANALYTICS_LABEL_LAYER_ID,
    type: "symbol",
    source: ANALYTICS_SOURCE_ID,
    layout: {
      "text-field": mode === "DEMAND" ? ["concat", ["get", "region_name"], "\nD ", ["to-string", ["get", "demand_score"]]] : ["concat", ["get", "region_name"], "\nGap ", ["to-string", ["coalesce", ["get", "retail_gap"], "-"]]],
      "text-font": ["Noto Sans Bold"], "text-size": 11, "text-allow-overlap": false,
    },
    paint: { "text-color": "#061018", "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
  });
}

export function removeDemandIntelligenceLayers(map: MapLibreMap) {
  for (const id of [ANALYTICS_LABEL_LAYER_ID, ANALYTICS_LINE_LAYER_ID, ANALYTICS_FILL_LAYER_ID]) if (map.getLayer(id)) map.removeLayer(id);
  if (map.getSource(ANALYTICS_SOURCE_ID)) map.removeSource(ANALYTICS_SOURCE_ID);
}
