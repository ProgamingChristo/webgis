import type { Map as MapLibreMap, LayerSpecification, SourceSpecification } from "maplibre-gl";

export interface RegisteredMapLayer {
  id: string;
  source: string | null;
  type: string;
  visibility: "visible" | "none";
  dependencies: string[];
  reload(): void;
  destroy(): void;
  isLoaded(): boolean;
}

/** One registry per map; a failed overlay does not prevent unrelated layers restoring. */
export class MapLayerRegistry {
  private entries = new Map<string, RegisteredMapLayer>();
  register(entry: RegisteredMapLayer) { this.entries.set(entry.id, entry); }
  unregister(id: string) { this.entries.get(id)?.destroy(); this.entries.delete(id); }
  get(id: string) { return this.entries.get(id); }
  rehydrateAll(): { restored: string[]; failures: { id: string; reason: string }[] } {
    const restored: string[] = [], failures: { id: string; reason: string }[] = [];
    const visiting = new Set<string>(), completed = new Set<string>(), failed = new Set<string>();
    const visit = (id: string): void => {
      if (completed.has(id)) { if (failed.has(id)) throw new Error("Dependency failed"); return; }
      if (visiting.has(id)) throw new Error("Layer dependency cycle");
      const entry = this.entries.get(id);
      if (!entry) throw new Error("Missing layer dependency");
      visiting.add(id);
      try {
        entry.dependencies.forEach(visit);
        if (!entry.isLoaded()) entry.reload();
        if (!entry.isLoaded()) throw new Error("Layer did not load");
        restored.push(id);
      } catch (error) {
        failed.add(id);
        failures.push({ id, reason: error instanceof Error ? error.message : "Layer restore failed" });
        throw error;
      } finally { visiting.delete(id); completed.add(id); }
    };
    for (const id of this.entries.keys()) { try { visit(id); } catch { /* Continue independent overlays. */ } }
    return { restored, failures };
  }
  destroy() {
    // Entries are registered in source/layer order. Remove dependent layers first.
    for (const entry of [...this.entries.values()].reverse()) entry.destroy();
    this.entries.clear();
  }
}

export function createSnapshotRegistry(map: MapLibreMap, sources: Record<string, SourceSpecification>, layers: LayerSpecification[]) {
  const registry = new MapLayerRegistry();
  for (const [id, specification] of Object.entries(sources)) registry.register({
    id: `source:${id}`, source: id, type: specification.type, visibility: "visible", dependencies: [],
    isLoaded: () => Boolean(map.getSource(id)),
    reload: () => { if (!map.getSource(id)) map.addSource(id, specification); },
    destroy: () => { if (map.getSource(id)) map.removeSource(id); },
  });
  for (const layer of layers) {
    const source = "source" in layer && typeof layer.source === "string" ? layer.source : null;
    registry.register({ id: layer.id, source, type: layer.type, visibility: layer.layout?.visibility === "none" ? "none" : "visible",
      dependencies: source ? [`source:${source}`] : [],
      isLoaded: () => Boolean(map.getLayer(layer.id)),
      reload: () => { if (!map.getLayer(layer.id)) map.addLayer(layer); },
      destroy: () => { if (map.getLayer(layer.id)) map.removeLayer(layer.id); },
    });
  }
  return registry;
}
