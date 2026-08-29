import { describe, expect, it } from "vitest";

import {
  activityCategoryLabel,
  DEFAULT_CONTEXTUAL_LAYER_VISIBILITY,
  formatObservationFreshness,
  setContextualLayerVisibility,
} from "@/src/features/mission-context-layers/utils/contextual-layer.utils";

describe("contextual layer state and presentation", () => {
  it("defaults to merchant only and toggles each layer independently", () => {
    expect(DEFAULT_CONTEXTUAL_LAYER_VISIBILITY).toEqual({
      merchant: true,
      property: false,
      transaction: false,
      activities: false,
      boundary: true,
    });
    const propertyOn = setContextualLayerVisibility(
      DEFAULT_CONTEXTUAL_LAYER_VISIBILITY,
      "property",
      true,
    );
    expect(propertyOn.property).toBe(true);
    expect(propertyOn.activities).toBe(false);
    expect(propertyOn.transaction).toBe(false);
    expect(propertyOn.merchant).toBe(true);
  });

  it("formats evidence freshness without claiming current availability", () => {
    expect(formatObservationFreshness({ freshness_status: "UNKNOWN", observed_at: null }))
      .toBe("Waktu observasi belum tersedia");
    expect(formatObservationFreshness({ freshness_status: "STALE", observed_at: null }))
      .toBe("Perlu konfirmasi ulang");
    expect(formatObservationFreshness({
      freshness_status: "FRESH",
      observed_at: "2026-08-28T00:00:00.000Z",
    })).toContain("Diamati");
  });

  it("uses an explicit generic Activity fallback", () => {
    expect(activityCategoryLabel("TRANSIT_OBSERVATION")).toBe("Observasi transit");
    expect(activityCategoryLabel("UNCLASSIFIED")).toBe("Observasi lapangan");
  });
});
