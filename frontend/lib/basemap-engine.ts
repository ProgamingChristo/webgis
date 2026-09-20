import type { Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import { getBasemapOption, type BasemapId } from "./mapid";
import { createSnapshotRegistry } from "./map-layer-registry";

const retained = new WeakMap<MapLibreMap, ReturnType<typeof captureMapLayers>>();

/** Application layers survive provider replacement. DOM markers, popups and controls
 * stay on the same Map instance. Callers re-register dynamic images on style.load. */
export function captureMapLayers(map: MapLibreMap) {
  const style = map.getStyle();
  const sources = Object.fromEntries(Object.entries(style?.sources ?? {}).filter(([id, source]) => source.type === "geojson" || id.startsWith("getra-")));
  const layers = (style?.layers ?? []).filter(layer => "source" in layer && typeof layer.source === "string" && layer.source in sources);
  return { sources, layers };
}
export function rehydrateMapLayers(map: MapLibreMap, overlays: ReturnType<typeof captureMapLayers>) {
  const result = createSnapshotRegistry(map, overlays.sources, overlays.layers).rehydrateAll();
  if (result.failures.length) throw new Error(`Layer peta gagal dipulihkan: ${result.failures.map(f => f.id).join(", ")}`);
}

/** Register listeners BEFORE setStyle; abort prevents older switches committing state. */
export async function applyBasemap(map: MapLibreMap, id: BasemapId, signal: AbortSignal, rehydrate?: () => void): Promise<void> {
  const camera = { center: map.getCenter(), zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() };
  const captured = captureMapLayers(map);
  // During a rapid second switch the style may be between source removal and
  // rehydration. Retain the last complete application snapshot in that interval.
  const overlays = Object.keys(captured.sources).length ? captured : retained.get(map) ?? captured;
  retained.set(map, overlays);
  const option = getBasemapOption(id);
  const started = performance.now();
  await new Promise<void>((resolve, reject) => {
    let ready = false;
    const cleanup = () => { clearTimeout(timer); map.off("style.load", onStyle); map.off("idle", onIdle); map.off("error", onError); signal.removeEventListener("abort", onAbort); };
    const fail = (error: Error) => { cleanup(); reject(error); };
    const onAbort = () => fail(new DOMException("Superseded basemap switch", "AbortError"));
    const onError = (event: unknown) => {
      const sourceId = (event as { sourceId?: string }).sourceId;
      // A cancelled style can finish a failed tile request after its successor
      // starts. Such a source is no longer part of the active basemap.
      if (sourceId && !map.getStyle()?.sources?.[sourceId]) return;
      if (!sourceId || !(sourceId in overlays.sources)) fail(new Error("Basemap gagal dimuat."));
    };
    const onStyle = () => {
      if (signal.aborted) return onAbort();
      try {
        map.jumpTo(camera);
        rehydrateMapLayers(map, overlays);
        rehydrate?.();
        ready = true;
      } catch { fail(new Error("Layer peta gagal dipulihkan.")); }
    };
    const onIdle = () => {
      if (!ready || !map.isStyleLoaded() || !map.areTilesLoaded()) return;
      cleanup(); resolve();
    };
    const timer = setTimeout(() => fail(new Error("Basemap gagal dimuat.")), 25000);
    map.on("style.load", onStyle); map.on("idle", onIdle); map.on("error", onError);
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) return onAbort();
    try { map.setStyle(option.style as string | StyleSpecification, { diff: false }); } catch { fail(new Error("Basemap gagal dimuat.")); }
  });
  map.getContainer().dataset.basemapId = id;
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("getra:basemap-applied", { detail: { id, durationMs: performance.now() - started } }));
}
