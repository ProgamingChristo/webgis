import { describe, it, expect, vi } from "vitest";
import { MapLayerRegistry, type RegisteredMapLayer } from "@/lib/map-layer-registry";
function entry(id: string, dependencies: string[], order: string[]): RegisteredMapLayer {
  let loaded = false;
  return { id, dependencies, source: null, type: "custom", visibility: "visible", isLoaded: () => loaded,
    reload: vi.fn(() => { loaded = true; order.push(id); }), destroy: () => { loaded = false; } };
}
describe("MapLayerRegistry", () => {
  it("restores dependencies first, deduplicates, and rehydrates after destruction", () => {
    const registry = new MapLayerRegistry(), order: string[] = [];
    const layer = entry("route", ["source"], order), source = entry("source", [], order);
    registry.register(layer); registry.register(source);
    expect(registry.rehydrateAll().failures).toEqual([]); registry.rehydrateAll();
    expect(order).toEqual(["source", "route"]);
    source.destroy(); layer.destroy(); registry.rehydrateAll(); expect(order).toHaveLength(4);
  });
  it("isolates cycles and missing dependencies without losing independent overlays", () => {
    const registry = new MapLayerRegistry(), order: string[] = [];
    registry.register(entry("a", ["b"], order)); registry.register(entry("b", ["a"], order));
    registry.register(entry("missing", ["absent"], order)); registry.register(entry("merchant", [], order));
    const result = registry.rehydrateAll(); expect(result.failures.length).toBe(3); expect(order).toEqual(["merchant"]);
  });
});
