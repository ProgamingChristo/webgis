import type { Map as MapLibreMap } from "maplibre-gl";
import { isRouteGeometry } from "./route-geometry";
import type { RoutingCandidate } from "@/src/services/routing.service";

export type LayerRouteInput = {
  distance_meters: number;
  duration_seconds: number;
  geometry: GeoJSON.LineString | import("@/src/types/spatial").LineStringGeometry;
  has_ferry?: boolean;
  has_highway?: boolean;
  has_toll?: boolean;
  id: string;
  is_fastest?: boolean;
  maneuvers?: unknown[];
  name: string;
  warnings?: string[];
};

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
    width: 8,
    opacity: 0.98,
    casingColor: "#082f49",
    casingWidth: 12,
    casingOpacity: 0.85,
  },
  alternative: {
    alt1Color: "#2563eb",
    alt1Opacity: 0.78,
    alt2Color: "#64748b",
    alt2Opacity: 0.72,
    umkmColor: "#16a34a",
    umkmOpacity: 0.85,
    colors: ["#2563eb", "#64748b"] as const,
    width: 6,
    opacity: 0.75,
    casingColor: "#0f172a",
    casingWidth: 10,
    casingOpacity: 0.55,
    hitWidth: 24,
  },
} as const;

export function isMapStyleReady(map: MapLibreMap): boolean {
  if (map.isStyleLoaded()) return true;
  try {
    const style = map.getStyle();
    return Boolean(style && Array.isArray(style.layers) && style.layers.length > 0);
  } catch {
    return false;
  }
}

function orderRouteLayers(map: MapLibreMap) {
  const before = map.getLayer(ROUTE_LAYER_IDS.selectedCasing)
    ? ROUTE_LAYER_IDS.selectedCasing
    : map.getLayer(ROUTE_LAYER_IDS.selectedLine)
      ? ROUTE_LAYER_IDS.selectedLine
      : undefined;
  for (const layer of [
    ROUTE_LAYER_IDS.alternativeCasing,
    ROUTE_LAYER_IDS.alternativeLine,
    ROUTE_LAYER_IDS.alternativeHit,
  ]) {
    if (map.getLayer(layer)) {
      try {
        map.moveLayer(layer, before);
      } catch {
        // ignore if layer cannot be moved relative to before
      }
    }
  }
}

export function syncRouteAlternatives(map: MapLibreMap, candidates: RoutingCandidate[], selectedRouteId: string | null) {
  const features: GeoJSON.Feature[] = candidates
    .filter((candidate) => candidate.route_id !== selectedRouteId && isRouteGeometry(candidate.geometry))
    .map((candidate, index) => {
      const isUmkm = candidate.route_category === "UMKM_AREA";
      const color = isUmkm
        ? ROUTE_STYLE_TOKENS.alternative.umkmColor
        : (index === 0 ? ROUTE_STYLE_TOKENS.alternative.alt1Color : ROUTE_STYLE_TOKENS.alternative.alt2Color);
      const opacity = isUmkm
        ? ROUTE_STYLE_TOKENS.alternative.umkmOpacity
        : (index === 0 ? ROUTE_STYLE_TOKENS.alternative.alt1Opacity : ROUTE_STYLE_TOKENS.alternative.alt2Opacity);
      return {
        type: "Feature" as const,
        properties: {
          routeId: candidate.route_id,
          routeCategory: candidate.route_category,
          lineColor: color,
          lineOpacity: opacity,
          lineWidth: ROUTE_STYLE_TOKENS.alternative.width,
        },
        geometry: candidate.geometry,
      };
    });

  const data: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features,
  };

  const source = map.getSource(ROUTE_LAYER_IDS.alternativeSource) as import("maplibre-gl").GeoJSONSource | undefined;
  if (source) {
    source.setData(data);
  }

  if (!isMapStyleReady(map)) return;

  if (!source) {
    try {
      map.addSource(ROUTE_LAYER_IDS.alternativeSource, { type: "geojson", data });
    } catch {
      return;
    }
  }

  try {
    if (!map.getLayer(ROUTE_LAYER_IDS.alternativeCasing)) {
      map.addLayer({
        id: ROUTE_LAYER_IDS.alternativeCasing,
        type: "line",
        source: ROUTE_LAYER_IDS.alternativeSource,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": ROUTE_STYLE_TOKENS.alternative.casingColor,
          "line-width": ROUTE_STYLE_TOKENS.alternative.casingWidth,
          "line-opacity": ROUTE_STYLE_TOKENS.alternative.casingOpacity,
        },
      });
    }
    if (!map.getLayer(ROUTE_LAYER_IDS.alternativeLine)) {
      map.addLayer({
        id: ROUTE_LAYER_IDS.alternativeLine,
        type: "line",
        source: ROUTE_LAYER_IDS.alternativeSource,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": ["get", "lineColor"],
          "line-width": ROUTE_STYLE_TOKENS.alternative.width,
          "line-opacity": ["get", "lineOpacity"],
        },
      });
    }
    if (!map.getLayer(ROUTE_LAYER_IDS.alternativeHit)) {
      map.addLayer({
        id: ROUTE_LAYER_IDS.alternativeHit,
        type: "line",
        source: ROUTE_LAYER_IDS.alternativeSource,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#000000",
          "line-width": ROUTE_STYLE_TOKENS.alternative.hitWidth,
          "line-opacity": 0.001,
        },
      });
    }
    if (map.getLayer(ROUTE_LAYER_IDS.alternativeLine)) {
      map.setPaintProperty(ROUTE_LAYER_IDS.alternativeLine, "line-color", ["get", "lineColor"]);
      map.setPaintProperty(ROUTE_LAYER_IDS.alternativeLine, "line-width", ROUTE_STYLE_TOKENS.alternative.width);
      map.setPaintProperty(ROUTE_LAYER_IDS.alternativeLine, "line-opacity", ["get", "lineOpacity"]);
    }
    if (map.getLayer(ROUTE_LAYER_IDS.alternativeCasing)) {
      map.setPaintProperty(ROUTE_LAYER_IDS.alternativeCasing, "line-color", ROUTE_STYLE_TOKENS.alternative.casingColor);
      map.setPaintProperty(ROUTE_LAYER_IDS.alternativeCasing, "line-width", ROUTE_STYLE_TOKENS.alternative.casingWidth);
      map.setPaintProperty(ROUTE_LAYER_IDS.alternativeCasing, "line-opacity", ROUTE_STYLE_TOKENS.alternative.casingOpacity);
    }
    orderRouteLayers(map);
  } catch {
    // ignore transient paint property errors during style transitions
  }
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
  routeGeometry?: GeoJSON.LineString | import("@/src/types/spatial").LineStringGeometry | null,
  routes?: LayerRouteInput[] | null,
  selectedRouteId?: string | null,
): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  if (routes && routes.length > 0) {
    const activeId = selectedRouteId ?? routes[0]?.id;
    const sorted = [...routes].sort((a, b) => {
      if (a.id === activeId) return 1;
      if (b.id === activeId) return -1;
      return 0;
    });

    return {
      type: "FeatureCollection",
      features: sorted.map((route) => ({
        type: "Feature" as const,
        id: route.id,
        properties: {
          id: route.id,
          name: route.name,
          isSelected: route.id === activeId,
          duration_seconds: route.duration_seconds,
          distance_meters: route.distance_meters,
          is_fastest: Boolean(route.is_fastest),
        },
        geometry: route.geometry as GeoJSON.LineString,
      })),
    };
  }

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

export function getRouteLabelCoordinate(
  geometry: GeoJSON.LineString | null | undefined,
  ratio = 0.5,
): [number, number] | null {
  if (!geometry || !geometry.coordinates || geometry.coordinates.length < 2) return null;
  const coords = geometry.coordinates;
  const index = Math.min(coords.length - 1, Math.max(0, Math.floor(coords.length * ratio)));
  return [coords[index][0], coords[index][1]];
}

export function syncWalkingRoute(
  map: MapLibreMap,
  routeGeometry?: GeoJSON.LineString | null,
) {
  if (!isMapStyleReady(map)) {
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
  orderRouteLayers(map);
}
