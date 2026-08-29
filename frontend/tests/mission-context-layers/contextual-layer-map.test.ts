import { describe, expect, it, vi } from "vitest";

import {
  CONTEXTUAL_LAYER_CONFIG,
  syncContextualObservationLayers,
} from "@/src/features/mission-context-layers/map/contextual-observation-layers";
import type {
  ContextualLayerData,
  ContextualLayerVisibility,
} from "@/src/features/mission-context-layers/types/contextual-layer.types";

const emptyState = {
  collection: { type: "FeatureCollection" as const, features: [] },
  error: null,
  loading: false,
  totalAvailable: 0,
};
const data: ContextualLayerData = {
  PROPERTI_GO: emptyState,
  STRUK_GO: emptyState,
  ACTIVITIES: emptyState,
};
const visibility: ContextualLayerVisibility = {
  merchant: true,
  property: true,
  transaction: true,
  activities: true,
  boundary: true,
};

function mockMap() {
  const sources = new Map<string, unknown>();
  const layers = new Map<string, unknown>();
  return {
    sources,
    layers,
    isStyleLoaded: vi.fn(() => true),
    getSource: vi.fn((id: string) => sources.get(id)),
    addSource: vi.fn((id: string, source: unknown) => sources.set(id, {
      source,
      setData: vi.fn(),
    })),
    getLayer: vi.fn((id: string) => layers.get(id)),
    addLayer: vi.fn((layer: { id: string }) => layers.set(layer.id, layer)),
    setLayoutProperty: vi.fn(),
  };
}

describe("contextual MapLibre sources", () => {
  it("creates three collision-free clustered sources and does not duplicate them", () => {
    const map = mockMap();
    syncContextualObservationLayers(map as never, data, visibility);
    syncContextualObservationLayers(map as never, data, visibility);

    expect(map.addSource).toHaveBeenCalledTimes(3);
    expect(new Set(Object.values(CONTEXTUAL_LAYER_CONFIG).map((item) => item.sourceId)).size)
      .toBe(3);
    expect(map.addLayer).toHaveBeenCalledTimes(12);
    for (const sourceCall of map.addSource.mock.calls) {
      expect(sourceCall[1]).toMatchObject({ cluster: true, clusterMaxZoom: 14 });
    }
  });

  it("hides each source independently", () => {
    const map = mockMap();
    syncContextualObservationLayers(map as never, data, {
      ...visibility,
      property: false,
      activities: false,
    });
    const visibilityCalls = map.setLayoutProperty.mock.calls;
    expect(visibilityCalls.filter((call) => String(call[0]).includes("property")))
      .toEqual(expect.arrayContaining([expect.arrayContaining([expect.any(String), "visibility", "none"])]));
    expect(visibilityCalls.filter((call) => String(call[0]).includes("transaction")))
      .toEqual(expect.arrayContaining([expect.arrayContaining([expect.any(String), "visibility", "visible"])]));
  });
});
