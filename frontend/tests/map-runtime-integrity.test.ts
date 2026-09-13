import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_JAKARTA_MAP_BOUNDS,
  DEFAULT_JAKARTA_MAP_ORIGIN,
} from "../src/features/map-runtime/default-map-context";

const dashboard = readFileSync(resolve(process.cwd(), "components/getra-dashboard.tsx"), "utf8");
const map = readFileSync(resolve(process.cwd(), "components/getra-map.tsx"), "utf8");
const commuterStyles = readFileSync(resolve(process.cwd(), "src/features/global-search/commuter-sidebar.css"), "utf8");

describe("main map runtime integrity", () => {
  it("keeps the default viewport inside Jakarta", () => {
    expect(DEFAULT_JAKARTA_MAP_BOUNDS.west).toBeGreaterThan(106);
    expect(DEFAULT_JAKARTA_MAP_BOUNDS.east).toBeLessThan(108);
    expect(DEFAULT_JAKARTA_MAP_ORIGIN.longitude).toBeCloseTo(106.85);
    expect(DEFAULT_JAKARTA_MAP_ORIGIN.latitude).toBeCloseTo(-6.25);
  });

  it("isolates all-areas camera state from merchant and import extents", () => {
    expect(dashboard).toContain("? DEFAULT_JAKARTA_MAP_ORIGIN");
    expect(dashboard).toContain("? DEFAULT_JAKARTA_MAP_BOUNDS");
    expect(dashboard).not.toMatch(/calculateMerchantOrigin\(\s*allMerchants/);
    expect(dashboard).toContain('showDatasetOrigin={datasetId !== "all-areas"}');
  });

  it("does not reset an already-applied style after merchant layers mount", () => {
    expect(map).toContain("appliedBasemapRef.current?.id === activeBasemap.id");
    expect(map).toContain("retryRevision === basemapRetryRevision");
  });

  it("mounts only one selected-merchant popup and marker lifecycle", () => {
    expect(map.match(/createMerchantMapPopup\(merchant/g)).toHaveLength(1);
  });

  it("mounts one responsive routing result for the active breakpoint", () => {
    expect(dashboard).toContain("const compactRoutingLayout = useCompactRoutingLayout()");
    expect(dashboard).toContain("route && route.distance_meters !== null ? !compactRoutingLayout ? (");
    expect(dashboard).toContain("compactRoutingLayout && route && route.distance_meters !== null && !journeyOpen");
  });

  it("keeps interactive commuter actions above the MapLibre controls", () => {
    expect(commuterStyles).toContain(".commuter-workspace .commuter-map-actions { z-index: 30;");
    expect(commuterStyles).toContain(".commuter-workspace .commuter-assistant { z-index: 31;");
    expect(commuterStyles).toContain(".commuter-map-actions > button { pointer-events: auto;");
  });
});
