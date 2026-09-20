import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const catalog = readFileSync(resolve(root, "lib/mapid.ts"), "utf8");
const mainMap = readFileSync(resolve(root, "components/getra-map.tsx"), "utf8");

describe("MAPID GL Style basemap catalog", () => {
  it("defines the canonical provider catalog", () => {
    const ids = [...new Set([...catalog.matchAll(/id:\s*"([^"]+)"/g)].map((match) => match[1]))];
    expect(ids).toEqual([
      "mapid-default", "osm", "carto-light", "carto-dark", "esri-satellite",
    ]);
  });

  it("keeps MAPID credentials behind the server proxy", () => {
    expect(catalog).toContain("/api/basemap/mapid/styles/default/style.json");
    expect(catalog).not.toContain("NEXT_PUBLIC_MAPID_BASEMAP_KEY");
    expect(catalog).not.toContain("?key=");
  });

  it("exposes an accessible switcher and persists the selected option", () => {
    expect(mainMap).toMatch(/BASEMAP_OPTIONS\.map/);
    expect(mainMap).toMatch(/aria-pressed=/);
    expect(mainMap).toMatch(/useBasemap\(\)/);
    expect(catalog).toMatch(/localStorage\.setItem\(BASEMAP_PREFERENCE_STORAGE_KEY/);
  });

  it("uses the persisted preference across every secondary MapLibre surface", () => {
    const files = [
      "src/features/landing/components/webgis-hero-map.tsx",
      "src/features/community/components/map/cultural-map.tsx",
      "src/features/community/components/location/post-location-map.tsx",
      "src/features/community/components/location/location-picker.tsx",
      "src/features/community-contributions/components/community-contribution-map-layer.tsx",
      "src/features/community-contributions/components/contribution-location-picker.tsx",
      "src/features/merchant-submission/components/merchant-submission-map-picker.tsx",
      "src/features/umkm-intelligence/components/umkm-intelligence-map.tsx",
      "src/features/umkm-advertising/ad-serving/components/sponsored-pin-preview-map.tsx",
      "src/features/umkm-advertising/targeting/components/targeting-map.tsx",
    ];
    for (const file of files) {
      expect(readFileSync(resolve(root, file), "utf8"), file).toMatch(/getPreferredBasemapId\(\)/);
    }
  });
});
