import type { Map as MapLibreMap } from "maplibre-gl";
import { isRouteGeometry } from "./route-geometry";

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
