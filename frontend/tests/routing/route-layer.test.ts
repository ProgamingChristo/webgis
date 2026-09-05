import { describe, expect, it, vi } from "vitest";
import type { Map } from "maplibre-gl";
import { bindRouteAlternativeSelection, syncRouteAlternatives, syncWalkingRoute, toRouteFeatureCollection } from "@/src/features/routing/route-layer";

const geometry: GeoJSON.LineString = { type: "LineString", coordinates: [[106.8, -6.2], [106.81, -6.21]] };
function mapHarness() {
  const sources = new globalThis.Map();
  const layers = new globalThis.Map();
  return { sources, layers, map: {
    isStyleLoaded: () => true,
    getSource: (id: string) => sources.get(id), getLayer: (id: string) => layers.get(id),
    addSource: vi.fn((id, data) => sources.set(id, { ...data, setData: vi.fn() })),
    addLayer: vi.fn((layer) => layers.set(layer.id, layer)),
    moveLayer: vi.fn(), setPaintProperty: vi.fn(), on: vi.fn(), off: vi.fn(),
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
  it("renders secondary provider candidates and replaces them on selection", () => {
    const { map, sources } = mapHarness();
    const candidates = [
      { route_id: "route-0", geometry },
      { route_id: "route-1", geometry: { ...geometry, coordinates: [[106.79, -6.19], [106.81, -6.21]] } },
    ] as never;
    syncRouteAlternatives(map as unknown as Map, candidates, "route-0");
    expect(sources.get("route-alternatives").data.features).toHaveLength(1);
    syncRouteAlternatives(map as unknown as Map, candidates, "route-1");
    expect(sources.get("route-alternatives").setData).toHaveBeenLastCalledWith(expect.objectContaining({
      features: [expect.objectContaining({ properties: { routeId: "route-0" } })],
    }));
  });
  it("binds alternative selection after a delayed style load and cleans up", () => {
    const { map, layers } = mapHarness();
    let idle: (() => void) | undefined;
    map.on.mockImplementation((event, ...args) => { if (event === "idle") idle = args[0]; });
    const select = vi.fn();
    const unbind = bindRouteAlternativeSelection(map as unknown as Map, select);
    layers.set("route-alternatives-line", {});
    idle?.();
    expect(map.on).toHaveBeenCalledWith("click", "route-alternatives-line", expect.any(Function));
    unbind();
    expect(map.off).toHaveBeenCalledWith("idle", expect.any(Function));
    expect(map.off).toHaveBeenCalledWith("click", "route-alternatives-line", expect.any(Function));
  });
});
