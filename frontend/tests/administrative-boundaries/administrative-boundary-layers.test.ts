import { describe, expect, it, vi } from "vitest";

import {
  ADMIN_REGION_FILL_LAYER_ID,
  ADMIN_REGION_LABEL_LAYER_ID,
  ADMIN_REGION_LINE_LAYER_ID,
  ADMIN_REGION_SOURCE_ID,
  syncAdministrativeBoundaryLayers,
} from "@/src/features/administrative-boundaries/map/administrative-boundary-layers";

describe("administrative MapLibre layer lifecycle", () => {
  it("registers one source/layer set and updates existing data", () => {
    const sources = new Map<string, { setData: ReturnType<typeof vi.fn> }>();
    const layers = new Set<string>();
    const map = {
      isStyleLoaded: () => true,
      getSource: (id: string) => sources.get(id),
      addSource: (id: string) => sources.set(id, { setData: vi.fn() }),
      getLayer: (id: string) => layers.has(id),
      addLayer: (layer: { id: string }) => layers.add(layer.id),
    };
    const collection = { type: "FeatureCollection" as const, features: [] };
    syncAdministrativeBoundaryLayers(map as never, collection);
    syncAdministrativeBoundaryLayers(map as never, collection);
    expect(sources.size).toBe(1);
    expect(sources.has(ADMIN_REGION_SOURCE_ID)).toBe(true);
    expect(layers).toEqual(new Set([
      ADMIN_REGION_FILL_LAYER_ID,
      ADMIN_REGION_LINE_LAYER_ID,
      ADMIN_REGION_LABEL_LAYER_ID,
    ]));
    expect(sources.get(ADMIN_REGION_SOURCE_ID)?.setData).toHaveBeenCalledOnce();
  });
});
