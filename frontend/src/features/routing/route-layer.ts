import type { Map as MapLibreMap } from "maplibre-gl";
import { isRouteGeometry } from "./route-geometry";
import type { RoutingCandidate } from "@/src/services/routing.service";

export const ROUTE_LAYER_IDS = {
  selectedSource: "walking-route",
  selectedCasing: "walking-route-casing",
  selectedLine: "walking-route-line",
  alternativeSource: "route-alternatives",
  alternativeCasing: "route-alternatives-casing",
  alternativeLine: "route-alternatives-line",
  alternativeHit: "route-alternatives-hit",
} as const;

export const ROUTE_STYLE_TOKENS = {
  selected: {
    color: "#0891b2",
    width: 6,
    opacity: 0.98,
    casingColor: "#083344",
    casingWidth: 10,
    casingOpacity: 0.78,
  },
  alternative: {
    colors: ["#475569", "#4f46e5"] as const,
    umkmColor: "#4d7c0f",
    width: 4,
    opacity: 0.38,
    casingColor: "#f8fafc",
    casingWidth: 7,
    casingOpacity: 0.44,
    hitWidth: 22,
  },
} as const;

function orderRouteLayers(map: MapLibreMap) {
  const before = map.getLayer(ROUTE_LAYER_IDS.selectedCasing)
    ? ROUTE_LAYER_IDS.selectedCasing
    : undefined;
  for (const layer of [
    ROUTE_LAYER_IDS.alternativeCasing,
    ROUTE_LAYER_IDS.alternativeLine,
    ROUTE_LAYER_IDS.alternativeHit,
  ]) {
    if (map.getLayer(layer)) map.moveLayer(layer, before);
  }
}

export function syncRouteAlternatives(map: MapLibreMap, candidates: RoutingCandidate[], selectedRouteId: string | null) {
  const data: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: candidates
    .filter((candidate) => candidate.route_id !== selectedRouteId && isRouteGeometry(candidate.geometry))
    .map((candidate, index) => ({
      type: "Feature",
      properties: {
        routeId: candidate.route_id,
        routeCategory: candidate.route_category,
        lineColor: candidate.route_category === "UMKM_AREA"
          ? ROUTE_STYLE_TOKENS.alternative.umkmColor
          : ROUTE_STYLE_TOKENS.alternative.colors[index % ROUTE_STYLE_TOKENS.alternative.colors.length],
      },
      geometry: candidate.geometry,
    })) };
  const source = map.getSource(ROUTE_LAYER_IDS.alternativeSource) as import("maplibre-gl").GeoJSONSource | undefined;
  if (source) source.setData(data);
  if (!map.isStyleLoaded()) return;
  if (!source) map.addSource(ROUTE_LAYER_IDS.alternativeSource, { type: "geojson", data });
  if (!map.getLayer(ROUTE_LAYER_IDS.alternativeCasing)) {
    map.addLayer({ id: ROUTE_LAYER_IDS.alternativeCasing, type: "line", source: ROUTE_LAYER_IDS.alternativeSource,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": ROUTE_STYLE_TOKENS.alternative.casingColor,
        "line-width": ROUTE_STYLE_TOKENS.alternative.casingWidth,
        "line-opacity": ROUTE_STYLE_TOKENS.alternative.casingOpacity,
      } });
  }
  if (!map.getLayer(ROUTE_LAYER_IDS.alternativeLine)) {
    map.addLayer({ id: ROUTE_LAYER_IDS.alternativeLine, type: "line", source: ROUTE_LAYER_IDS.alternativeSource,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": ["get", "lineColor"],
        "line-width": ROUTE_STYLE_TOKENS.alternative.width,
        "line-opacity": ROUTE_STYLE_TOKENS.alternative.opacity,
      } });
  }
  if (!map.getLayer(ROUTE_LAYER_IDS.alternativeHit)) {
    map.addLayer({ id: ROUTE_LAYER_IDS.alternativeHit, type: "line", source: ROUTE_LAYER_IDS.alternativeSource,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#000000", "line-width": ROUTE_STYLE_TOKENS.alternative.hitWidth, "line-opacity": 0.01 } });
  }
  orderRouteLayers(map);
}

export function bindRouteAlternativeSelection(map: MapLibreMap, select: (routeId: string) => void) {
  const click = (event: import("maplibre-gl").MapLayerMouseEvent) => {
    const routeId = event.features?.[0]?.properties?.routeId;
    if (typeof routeId === "string") select(routeId);
  };
  const enter = () => { map.getCanvas().style.cursor = "pointer"; };
  const leave = () => { map.getCanvas().style.cursor = ""; };
  let bound = false;
  const attach = () => {
    if (!bound && map.getLayer(ROUTE_LAYER_IDS.alternativeHit)) {
      map.on("click", ROUTE_LAYER_IDS.alternativeHit, click);
      map.on("mouseenter", ROUTE_LAYER_IDS.alternativeHit, enter);
      map.on("mouseleave", ROUTE_LAYER_IDS.alternativeHit, leave);
      bound = true;
    }
  };
  attach();
  map.on("idle", attach);
  return () => {
    map.off("idle", attach);
    if (bound) {
      map.off("click", ROUTE_LAYER_IDS.alternativeHit, click);
      map.off("mouseenter", ROUTE_LAYER_IDS.alternativeHit, enter);
      map.off("mouseleave", ROUTE_LAYER_IDS.alternativeHit, leave);
      leave();
    }
  };
}

export function toRouteFeatureCollection(
  routeGeometry?: GeoJSON.LineString | null,
) {
  return {
    type: "FeatureCollection",
    features: isRouteGeometry(routeGeometry)
      ? [
          {
            type: "Feature",
            properties: {},
            geometry:
              routeGeometry,
          },
        ]
      : [],
  } satisfies GeoJSON.FeatureCollection;
}

export function syncWalkingRoute(
  map: MapLibreMap,
  routeGeometry?: GeoJSON.LineString | null,
) {
  if (!map.isStyleLoaded()) {
    const existing = map.getSource(ROUTE_LAYER_IDS.selectedSource) as import("maplibre-gl").GeoJSONSource | undefined;
    existing?.setData(toRouteFeatureCollection(routeGeometry));
    return;
  }

  const routeData =
    toRouteFeatureCollection(
      routeGeometry,
    );

  const source =
    map.getSource(
      ROUTE_LAYER_IDS.selectedSource,
    );

  if (
    map.getLayer(
      ROUTE_LAYER_IDS.selectedLine,
    )
  ) {
    map.moveLayer(
      ROUTE_LAYER_IDS.selectedLine,
    );
  }

  if (
    map.getLayer(
      ROUTE_LAYER_IDS.selectedCasing,
    )
  ) {
    map.moveLayer(
      ROUTE_LAYER_IDS.selectedCasing,
      ROUTE_LAYER_IDS.selectedLine,
    );
  }

  if (source) {
    (
      source as unknown as {
        setData: (
          data: GeoJSON.FeatureCollection,
        ) => void;
      }
    ).setData(
      routeData,
    );
  } else {
    map.addSource(
      ROUTE_LAYER_IDS.selectedSource,
      {
        type: "geojson",
        data: routeData,
      },
    );

    map.addLayer({
      id: ROUTE_LAYER_IDS.selectedCasing,
      type: "line",
      source: ROUTE_LAYER_IDS.selectedSource,
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": ROUTE_STYLE_TOKENS.selected.casingColor,
        "line-width": ROUTE_STYLE_TOKENS.selected.casingWidth,
        "line-opacity": ROUTE_STYLE_TOKENS.selected.casingOpacity,
      },
    });

    map.addLayer({
      id: ROUTE_LAYER_IDS.selectedLine,
      type: "line",
      source: ROUTE_LAYER_IDS.selectedSource,
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": ROUTE_STYLE_TOKENS.selected.color,
        "line-width": ROUTE_STYLE_TOKENS.selected.width,
        "line-opacity": ROUTE_STYLE_TOKENS.selected.opacity,
        "line-dasharray": [1, 0],
      },
    });
  }

  if (
    map.getLayer(
      ROUTE_LAYER_IDS.selectedLine,
    )
  ) {
    map.setPaintProperty(
      ROUTE_LAYER_IDS.selectedLine,
      "line-color",
      ROUTE_STYLE_TOKENS.selected.color,
    );

    map.setPaintProperty(
      ROUTE_LAYER_IDS.selectedLine,
      "line-width",
      ROUTE_STYLE_TOKENS.selected.width,
    );

    map.setPaintProperty(
      ROUTE_LAYER_IDS.selectedLine,
      "line-opacity",
      ROUTE_STYLE_TOKENS.selected.opacity,
    );
    map.setPaintProperty(
      ROUTE_LAYER_IDS.selectedLine,
      "line-dasharray",
      [1, 0],
    );
  }
  if (map.getLayer(ROUTE_LAYER_IDS.selectedCasing)) {
    map.setPaintProperty(ROUTE_LAYER_IDS.selectedCasing, "line-color", ROUTE_STYLE_TOKENS.selected.casingColor);
    map.setPaintProperty(ROUTE_LAYER_IDS.selectedCasing, "line-width", ROUTE_STYLE_TOKENS.selected.casingWidth);
    map.setPaintProperty(ROUTE_LAYER_IDS.selectedCasing, "line-opacity", ROUTE_STYLE_TOKENS.selected.casingOpacity);
  }
}
