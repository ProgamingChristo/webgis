import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildAnalyticsQuery } from "@/src/features/demand-intelligence/services/demand-intelligence.service";

const dashboard = readFileSync(resolve(process.cwd(), "components/getra-dashboard.tsx"), "utf8");
const mapLayers = readFileSync(resolve(process.cwd(), "src/features/demand-intelligence/map/demand-intelligence-layers.ts"), "utf8");
const panel = readFileSync(resolve(process.cwd(), "src/features/demand-intelligence/components/demand-intelligence-panel.tsx"), "utf8");
const hook = readFileSync(resolve(process.cwd(), "src/features/demand-intelligence/hooks/use-demand-intelligence.ts"), "utf8");

describe("Phase 09 analytics frontend contract", () => {
  it("builds bounded GETRA API queries without raw event access", () => {
    const query = buildAnalyticsQuery({ mode: "RETAIL_GAP", category: "bakso", days: 30, region_ids: ["jakarta-barat", "jakarta-selatan"], bbox: null });
    expect(query).toContain("category=bakso");
    expect(query).toContain("region_ids=jakarta-barat%2Cjakarta-selatan");
    expect(query).not.toMatch(/user|email|origin|analytics_events|mapid/i);
  });

  it("keeps analytics off by default and protects stale requests", () => {
    expect(dashboard).toContain('useState<"fair-discovery" | "dataset" | "analytics">("dataset")');
    expect(hook).toContain("AbortController");
    expect(hook).toContain("sequence.current === requestId");
  });

  it("renders exact region polygons, a legend-ready scale, charts, and textual metrics", () => {
    expect(mapLayers).toContain('type: "fill"');
    expect(mapLayers).toContain('"retail_gap"');
    expect(panel).toContain("Demand vs represented supply");
    expect(panel).toContain("Retail Gap relatif");
    expect(panel).toContain('<table className="analytics-table">');
    expect(panel).toContain("transaction observation");
  });

  it("uses safe claims and never labels Struk observations as revenue", () => {
    expect(panel).toContain("bukan total demand penduduk atau proyeksi pendapatan");
    expect(panel).not.toMatch(/pasti laku|ROI tinggi|merchant sales/i);
  });
});
