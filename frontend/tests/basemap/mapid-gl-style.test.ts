import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const catalog = readFileSync(resolve(root, "lib/mapid.ts"), "utf8");
const mainMap = readFileSync(resolve(root, "components/getra-map.tsx"), "utf8");

describe("MAPID GL Style basemap catalog", () => {
  it("defines exactly the five approved MAPID styles", () => {
    const ids = [...new Set([...catalog.matchAll(/id:\s*"(mapid-[^"]+)"/g)].map((match) => match[1]))];
    expect(ids).toEqual([
      "mapid-basic",
      "mapid-street-2d-building",
      "mapid-satellite",
      "mapid-dark",
      "mapid-light",
    ]);
  });

  it("builds GL Style URLs rather than TileJSON, WMTS, or raster XYZ URLs", () => {
    expect(catalog).toContain("https://basemap.mapid.io/styles/${styleId}/style.json?key=");
    expect(catalog).not.toMatch(/wmts\.xml|\/styles\/512\/|\{z\}\/\{x\}\/\{y\}/i);
    expect(catalog).not.toMatch(/[a-f0-9]{24}/i);
  });

  it("exposes an accessible switcher and persists the selected option", () => {
    expect(mainMap).toMatch(/BASEMAP_OPTIONS\.map/);
    expect(mainMap).toMatch(/aria-pressed=/);
    expect(mainMap).toMatch(/persistBasemapPreference\(option\.id\)/);
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
