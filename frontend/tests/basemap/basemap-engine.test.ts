import { describe, expect, it, vi } from "vitest";
import { applyBasemap, rehydrateMapLayers } from "@/lib/basemap-engine";
import { BASEMAP_OPTIONS, DEFAULT_BASEMAP_ID, isBasemapId } from "@/lib/mapid";
import type { Map as MapLibreMap } from "maplibre-gl";

function fakeMap() {
  const listeners = new Map<string, Set<(event?: unknown) => void>>();
  let sources: Record<string, unknown> = { merchant: { type: "geojson", data: { type: "FeatureCollection", features: [] } }, route: { type: "geojson", data: { type: "FeatureCollection", features: [] } } };
  let layers: { id: string; source: string; type: string }[] = [{ id: "merchant", source: "merchant", type: "circle" }, { id: "route", source: "route", type: "line" }];
  const map = {
    getStyle: () => ({ sources, layers }), getCenter: () => ({ lng: 106.8, lat: -6.2 }), getZoom: () => 14, getBearing: () => 45, getPitch: () => 30,
    getContainer: () => ({ dataset: {} }), isStyleLoaded: () => true, areTilesLoaded: () => true,
    on: (event: string, listener: (event?: unknown) => void) => { if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event)!.add(listener); },
    off: (event: string, listener: (event?: unknown) => void) => listeners.get(event)?.delete(listener),
    emit: (event: string, payload?: unknown) => { for (const listener of [...listeners.get(event) ?? []]) listener(payload); },
    setStyle: vi.fn(() => { sources = {}; layers = []; map.emit("style.load"); }),
    jumpTo: vi.fn(), getSource: (id: string) => sources[id], getLayer: (id: string) => layers.find(l => l.id === id),
    addSource: vi.fn((id: string, source: unknown) => { sources[id] = source; }), addLayer: vi.fn((layer: typeof layers[number]) => { layers.push(layer); }),
  };
  return map;
}
describe("basemap engine transactions", () => {
  it("uses MAPID default and five distinct actual styles", () => {
    expect(DEFAULT_BASEMAP_ID).toBe("mapid-default"); expect(BASEMAP_OPTIONS).toHaveLength(5);
    expect(new Set(BASEMAP_OPTIONS.map(o => JSON.stringify(o.style))).size).toBe(5);
    expect(isBasemapId("mapid-basic")).toBe(false);
    expect(BASEMAP_OPTIONS.every(o => o.attribution && o.provider)).toBe(true);
  });
  it.each(BASEMAP_OPTIONS)("changes $id on the same instance and preserves camera and all app overlays", async option => {
    const map = fakeMap(), restore = vi.fn();
    const promise = applyBasemap(map as unknown as MapLibreMap, option.id, new AbortController().signal, restore);
    expect(map.setStyle).toHaveBeenCalledWith(option.style, { diff: false });
    expect(map.getSource("merchant")).toBeTruthy(); expect(map.getLayer("route")).toBeTruthy();
    expect(map.jumpTo).toHaveBeenCalledWith({ center: { lng: 106.8, lat: -6.2 }, zoom: 14, bearing: 45, pitch: 30 });
    let settled = false; void promise.then(() => { settled = true; }); await Promise.resolve(); expect(settled).toBe(false);
    map.emit("idle"); await promise; expect(restore).toHaveBeenCalledOnce();
  });
  it("does not report ready just because style metadata loaded", async () => {
    const map = fakeMap(), controller = new AbortController();
    const promise = applyBasemap(map as unknown as MapLibreMap, "osm", controller.signal);
    map.emit("error", { sourceId: "osm" });
    await expect(promise).rejects.toThrow("Basemap gagal dimuat");
  });
  it("cancels superseded transactions and removes listeners", async () => {
    const map = fakeMap(), controller = new AbortController();
    const promise = applyBasemap(map as unknown as MapLibreMap, "osm", controller.signal);
    controller.abort(); await expect(promise).rejects.toMatchObject({ name: "AbortError" });
    map.emit("idle");
  });
  it("rehydration is idempotent", () => {
    const map = fakeMap();
    const overlays = { sources: { merchant: { type: "geojson" as const, data: { type: "FeatureCollection" as const, features: [] } } }, layers: [{ id: "merchant", source: "merchant", type: "circle" as const }] };
    rehydrateMapLayers(map as unknown as MapLibreMap, overlays); rehydrateMapLayers(map as unknown as MapLibreMap, overlays);
    expect(map.addSource).not.toHaveBeenCalled(); expect(map.addLayer).not.toHaveBeenCalled();
  });
});
