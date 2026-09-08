import { describe, expect, it, vi } from "vitest";
import type { Map } from "maplibre-gl";
import { bindRouteAlternativeSelection, ROUTE_LAYER_IDS, ROUTE_STYLE_TOKENS, syncRouteAlternatives, syncWalkingRoute, toRouteFeatureCollection } from "@/src/features/routing/route-layer";

const geometry: GeoJSON.LineString = { type: "LineString", coordinates: [[106.8, -6.2], [106.81, -6.21]] };
function mapHarness() {
  const sources = new globalThis.Map();
  const layers = new globalThis.Map();
  const canvas = { style: { cursor: "" } };
  return { sources, layers, canvas, map: {
    isStyleLoaded: () => true,
    getSource: (id: string) => sources.get(id), getLayer: (id: string) => layers.get(id),
    getCanvas: () => canvas,
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
    const { map, sources, layers } = mapHarness();
    const candidates = [
      { route_id: "route-0", geometry },
      { route_id: "route-1", geometry: { ...geometry, coordinates: [[106.79, -6.19], [106.81, -6.21]] } },
    ] as never;
    syncRouteAlternatives(map as unknown as Map, candidates, "route-0");
    expect(sources.get("route-alternatives").data.features).toHaveLength(1);
    expect(map.addLayer).toHaveBeenCalledTimes(3);
    expect(layers.get(ROUTE_LAYER_IDS.alternativeLine).paint).toMatchObject({
      "line-width": ROUTE_STYLE_TOKENS.alternative.width,
      "line-opacity": ["get", "lineOpacity"],
    });
    expect(layers.get(ROUTE_LAYER_IDS.alternativeHit).paint["line-width"]).toBe(ROUTE_STYLE_TOKENS.alternative.hitWidth);
    syncRouteAlternatives(map as unknown as Map, candidates, "route-1");
    expect(sources.get("route-alternatives").setData).toHaveBeenLastCalledWith(expect.objectContaining({
      features: [expect.objectContaining({ properties: expect.objectContaining({ routeId: "route-0" }) })],
    }));
  });
  it("binds alternative selection after a delayed style load and cleans up", () => {
    const { map, layers, canvas } = mapHarness();
    let idle: (() => void) | undefined;
    let click: ((event: { features: Array<{ properties: { routeId: string } }> }) => void) | undefined;
    let enter: (() => void) | undefined;
    map.on.mockImplementation((event, ...args) => {
      if (event === "idle") idle = args[0];
      if (event === "click") click = args[1];
      if (event === "mouseenter") enter = args[1];
    });
    const select = vi.fn();
    const unbind = bindRouteAlternativeSelection(map as unknown as Map, select);
    layers.set(ROUTE_LAYER_IDS.alternativeHit, {});
    idle?.();
    expect(map.on).toHaveBeenCalledWith("click", ROUTE_LAYER_IDS.alternativeHit, expect.any(Function));
    expect(map.on).toHaveBeenCalledWith("mouseenter", ROUTE_LAYER_IDS.alternativeHit, expect.any(Function));
    expect(map.on).toHaveBeenCalledWith("mouseleave", ROUTE_LAYER_IDS.alternativeHit, expect.any(Function));
    click?.({ features: [{ properties: { routeId: "route-1" } }] });
    expect(select).toHaveBeenCalledWith("route-1");
    enter?.();
    expect(canvas.style.cursor).toBe("pointer");
    unbind();
    expect(map.off).toHaveBeenCalledWith("idle", expect.any(Function));
    expect(map.off).toHaveBeenCalledWith("click", ROUTE_LAYER_IDS.alternativeHit, expect.any(Function));
    expect(canvas.style.cursor).toBe("");
  });
  it("synchronizes multi-route options with active selection placed last", () => {
    const routes = [
      { id: "r1", name: "R1", is_fastest: true, distance_meters: 1000, duration_seconds: 300, geometry, maneuvers: [], has_toll: false, has_highway: false, has_ferry: false, warnings: [] },
      { id: "r2", name: "R2", is_fastest: false, distance_meters: 1200, duration_seconds: 400, geometry: { type: "LineString" as const, coordinates: [[106.8, -6.2], [106.82, -6.22]] }, maneuvers: [], has_toll: false, has_highway: false, has_ferry: false, warnings: [] },
    ];
    const collection = toRouteFeatureCollection(null, routes, "r2");
    expect(collection.features).toHaveLength(2);
    expect(collection.features[1].id).toBe("r2");
    expect(collection.features[1].properties?.isSelected).toBe(true);
    expect(collection.features[0].id).toBe("r1");
    expect(collection.features[0].properties?.isSelected).toBe(false);
  });
});
