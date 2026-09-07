import type { Map as MapLibreMap } from "maplibre-gl";
import { isRouteGeometry } from "./route-geometry";
import type { NavigationRouteOption } from "@/src/services/routing.service";

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
            type: "Feature" as const,
            id: "route-0",
            properties: { isSelected: true },
            geometry: routeGeometry as GeoJSON.LineString,
          },
        ]
      : [],
  };
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
  routes?: NavigationRouteOption[] | null,
  selectedRouteId?: string | null,
) {
  if (!map.isStyleLoaded()) {
    const existing = map.getSource("walking-route") as import("maplibre-gl").GeoJSONSource | undefined;
    existing?.setData(toRouteFeatureCollection(routeGeometry, routes, selectedRouteId));
    return;
  }

  const routeData = toRouteFeatureCollection(routeGeometry, routes, selectedRouteId);
  const source = map.getSource("walking-route");

  if (map.getLayer("walking-route-line")) {
    map.moveLayer("walking-route-line");
  }

  if (map.getLayer("walking-route-casing")) {
    map.moveLayer("walking-route-casing", "walking-route-line");
  }

  if (source) {
    (source as unknown as { setData: (data: GeoJSON.FeatureCollection) => void }).setData(routeData);
  } else {
    map.addSource("walking-route", {
      type: "geojson",
      data: routeData,
    });

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
        "line-width": ["case", ["boolean", ["get", "isSelected"], true], 8.5, 6],
        "line-opacity": ["case", ["boolean", ["get", "isSelected"], true], 0.85, 0.5],
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
        "line-color": ["case", ["boolean", ["get", "isSelected"], true], "#22d3ee", "#64748b"],
        "line-width": ["case", ["boolean", ["get", "isSelected"], true], 5.5, 4],
        "line-opacity": ["case", ["boolean", ["get", "isSelected"], true], 0.95, 0.7],
        "line-dasharray": [1, 0],
      },
    });
  }

  if (map.getLayer("walking-route-line")) {
    map.setPaintProperty("walking-route-line", "line-color", [
      "case",
      ["boolean", ["get", "isSelected"], true],
      "#22d3ee",
      "#64748b",
    ]);

    map.setPaintProperty("walking-route-line", "line-width", [
      "case",
      ["boolean", ["get", "isSelected"], true],
      5.5,
      4,
    ]);

    map.setPaintProperty("walking-route-line", "line-dasharray", [1, 0]);
  }
}
