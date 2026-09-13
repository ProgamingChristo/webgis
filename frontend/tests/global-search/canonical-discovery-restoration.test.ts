import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const dashboard = readFileSync(
  resolve(process.cwd(), "components/getra-dashboard.tsx"),
  "utf8",
);
const map = readFileSync(resolve(process.cwd(), "components/getra-map.tsx"), "utf8");
const controls = readFileSync(
  resolve(process.cwd(), "src/features/global-search/components/global-search-controls.tsx"),
  "utf8",
);

describe("canonical discovery restoration", () => {
  it("loads published canonical merchants for the initial Jakarta viewport", () => {
    expect(dashboard).toContain("initialCanonicalRequestStartedRef.current = true");
    expect(dashboard).toContain("bbox: DEFAULT_JAKARTA_MAP_BOUNDS");
    expect(dashboard).toContain('queryText: ""');
    expect(dashboard).toContain("setCanonicalViewportLoaded(true)");
  });

  it("keeps canonical results visible before a manual search", () => {
    expect(dashboard).toContain("!searchActive && !canonicalViewportLoaded");
    expect(dashboard).toMatch(/datasetId\s*===\s*"all-areas"\s*\?\s*mapidMerchants/);
    expect(dashboard).toContain("merchants.map((merchant) => (");
  });

  it("feeds the same canonical selection to map and sidebar", () => {
    expect(dashboard).toContain("const mapMerchants = useMemo");
    expect(dashboard).toContain(": primaryMode === \"merchant\" ? mapMerchants : []");
    expect(dashboard).toContain("<MerchantResultRow");
    expect(map).toContain("data-merchant-count={merchants.length}");
  });

  it("offers only supported nearby radii and deterministic category filtering", () => {
    expect(controls).toContain("[250, 500, 1000, 2000]");
    expect(dashboard).toContain('category: category !== "Semua" ? category : undefined');
    expect(dashboard).toContain("Kategori");
  });

  it("keeps fair discovery and accessibility reachable in the modern sidebar", () => {
    const activeControls = dashboard.slice(0, dashboard.indexOf('{false ? <details className="commuter-tools"'));
    expect(activeControls).toContain('onClick={() => setViewMode("fair-discovery")}');
    expect(activeControls).toContain("Penelusuran Adil");
    expect(activeControls).toContain("Accessibility");
    expect(activeControls).toContain('onClick={activateAccessibilityMode}');
  });

  it("preserves the five deduplicated Jakarta regions", () => {
    const canonicalRegions = dashboard.slice(
      dashboard.indexOf("export const CANONICAL_SEARCH_REGIONS"),
      dashboard.indexOf("const PROPERTY_BUSINESS_CATEGORIES"),
    );
    for (const region of [
      "jakarta-barat",
      "jakarta-pusat",
      "jakarta-selatan",
      "jakarta-timur",
      "jakarta-utara",
    ]) {
      expect(canonicalRegions.match(new RegExp(`id: "${region}"`, "g"))).toHaveLength(1);
    }
  });
});
