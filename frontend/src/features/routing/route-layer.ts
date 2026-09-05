import type { Map as MapLibreMap } from "maplibre-gl";
import { isRouteGeometry } from "./route-geometry";
import type { RoutingCandidate } from "@/src/services/routing.service";

const ALTERNATIVE_SOURCE_ID = "route-alternatives";
const ALTERNATIVE_LAYER_ID = "route-alternatives-line";

export function syncRouteAlternatives(map: MapLibreMap, candidates: RoutingCandidate[], selectedRouteId: string | null) {
  const data: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: candidates
    .filter((candidate) => candidate.route_id !== selectedRouteId && isRouteGeometry(candidate.geometry))
    .map((candidate) => ({ type: "Feature", properties: { routeId: candidate.route_id }, geometry: candidate.geometry })) };
  const source = map.getSource(ALTERNATIVE_SOURCE_ID) as import("maplibre-gl").GeoJSONSource | undefined;
  if (source) source.setData(data);
  else if (map.isStyleLoaded()) {
    map.addSource(ALTERNATIVE_SOURCE_ID, { type: "geojson", data });
    map.addLayer({ id: ALTERNATIVE_LAYER_ID, type: "line", source: ALTERNATIVE_SOURCE_ID,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#64748b", "line-width": 5, "line-opacity": 0.65 } });
  }
  if (map.getLayer(ALTERNATIVE_LAYER_ID) && map.getLayer("walking-route-casing")) {
    map.moveLayer(ALTERNATIVE_LAYER_ID, "walking-route-casing");
  }
}

export function bindRouteAlternativeSelection(map: MapLibreMap, select: (routeId: string) => void) {
  const click = (event: import("maplibre-gl").MapLayerMouseEvent) => {
    const routeId = event.features?.[0]?.properties?.routeId;
    if (typeof routeId === "string") select(routeId);
  };
  let bound = false;
  const attach = () => {
    if (!bound && map.getLayer(ALTERNATIVE_LAYER_ID)) {
      map.on("click", ALTERNATIVE_LAYER_ID, click);
      bound = true;
    }
  };
  attach();
  map.on("idle", attach);
  return () => {
    map.off("idle", attach);
    if (bound) map.off("click", ALTERNATIVE_LAYER_ID, click);
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
    const existing = map.getSource("walking-route") as import("maplibre-gl").GeoJSONSource | undefined;
    existing?.setData(toRouteFeatureCollection(routeGeometry));
    return;
  }

  const routeData =
    toRouteFeatureCollection(
      routeGeometry,
    );

  const source =
    map.getSource(
      "walking-route",
    );

  if (
    map.getLayer(
      "walking-route-line",
    )
  ) {
    map.moveLayer(
      "walking-route-line",
    );
  }

  if (
    map.getLayer(
      "walking-route-casing",
    )
  ) {
    map.moveLayer(
      "walking-route-casing",
      "walking-route-line",
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
      "walking-route",
      {
        type: "geojson",
        data: routeData,
      },
    );

    map.addLayer({
      id: "walking-route-casing",
      type: "line",
      source: "walking-route",
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": "#041018",
        "line-width": 8,
        "line-opacity": 0.8,
      },
    });

    map.addLayer({
      id: "walking-route-line",
      type: "line",
      source: "walking-route",
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": "#22d3ee",
        "line-width": 5,
        "line-opacity": 0.92,
        "line-dasharray": [1, 0],
      },
    });
  }

  if (
    map.getLayer(
      "walking-route-line",
    )
  ) {
    map.setPaintProperty(
      "walking-route-line",
      "line-color",
      "#22d3ee",
    );

    map.setPaintProperty(
      "walking-route-line",
      "line-width",
      5,
    );

    map.setPaintProperty(
      "walking-route-line",
      "line-dasharray",
      [1, 0],
    );
  }
}
