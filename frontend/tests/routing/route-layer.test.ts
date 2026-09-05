import { describe, expect, it, vi } from "vitest";
import type { Map } from "maplibre-gl";
import { syncWalkingRoute, toRouteFeatureCollection } from "@/src/features/routing/route-layer";

const geometry: GeoJSON.LineString = { type: "LineString", coordinates: [[106.8, -6.2], [106.81, -6.21]] };
function mapHarness() {
  const sources = new globalThis.Map();
  const layers = new globalThis.Map();
  return { sources, layers, map: {
    isStyleLoaded: () => true,
    getSource: (id: string) => sources.get(id), getLayer: (id: string) => layers.get(id),
    addSource: vi.fn((id, data) => sources.set(id, { ...data, setData: vi.fn() })),
    addLayer: vi.fn((layer) => layers.set(layer.id, layer)),
    moveLayer: vi.fn(), setPaintProperty: vi.fn(),
  } };
}
describe("MapLibre backend route source", () => {
  it("replaces data without duplicate sources or layers and clears on failure/reset", () => {
    const { map, sources } = mapHarness();
    syncWalkingRoute(map as unknown as Map, geometry);
    const next: GeoJSON.LineString = { ...geometry, coordinates: [[106.7, -6.2], [106.8, -6.21]] };
    syncWalkingRoute(map as unknown as Map, next);
    expect(map.addSource).toHaveBeenCalledTimes(1);
    expect(map.addLayer).toHaveBeenCalledTimes(2);
    expect(sources.get("walking-route").setData).toHaveBeenLastCalledWith(toRouteFeatureCollection(next));
    syncWalkingRoute(map as unknown as Map, null);
    expect(sources.get("walking-route").setData).toHaveBeenLastCalledWith({ type: "FeatureCollection", features: [] });
  });
  it("recreates route layers after a style reload", () => {
    const { map, sources, layers } = mapHarness();
    syncWalkingRoute(map as unknown as Map, geometry);
    sources.clear(); layers.clear();
    syncWalkingRoute(map as unknown as Map, geometry);
    expect(sources.size).toBe(1); expect(layers.size).toBe(2);
  });
  it("clears an existing route immediately while basemap tiles are still loading", () => {
    const { map, sources } = mapHarness();
    syncWalkingRoute(map as unknown as Map, geometry);
    map.isStyleLoaded = () => false;
    syncWalkingRoute(map as unknown as Map, null);
    expect(sources.get("walking-route").setData).toHaveBeenLastCalledWith({ type: "FeatureCollection", features: [] });
    expect(map.addSource).toHaveBeenCalledTimes(1);
  });
  it("waits for style readiness and refuses invalid geometry", () => {
    const { map } = mapHarness();
    map.isStyleLoaded = () => false;
    syncWalkingRoute(map as unknown as Map, geometry);
    expect(map.addSource).not.toHaveBeenCalled();
    expect(toRouteFeatureCollection({ type: "LineString", coordinates: [] }).features).toEqual([]);
  });
});
