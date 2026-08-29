import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const dashboard = readFileSync(resolve(root, "src/features/umkm-intelligence/components/umkm-intelligence-dashboard.tsx"), "utf8");
const service = readFileSync(resolve(root, "src/features/umkm-intelligence/services/umkm-intelligence.service.ts"), "utf8");
const hook = readFileSync(resolve(root, "src/features/umkm-intelligence/hooks/use-umkm-intelligence.ts"), "utf8");
const map = readFileSync(resolve(root, "src/features/umkm-intelligence/components/umkm-intelligence-map.tsx"), "utf8");

describe("Phase 10 UMKM intelligence frontend contract", () => {
  it("uses only GETRA-owned intelligence endpoints", () => {
    expect(service).toMatch(/\/api\/umkm\/intelligence/);
    expect(service).not.toMatch(/maps\.mapid|\/web\/competition|x-api-key|service.role/i);
  });

  it("renders deterministic diagnostics, recommendations, charts, map, and safe claims", () => {
    expect(dashboard).toMatch(/Data Readiness/);
    expect(dashboard).toMatch(/Visibility Readiness/);
    expect(dashboard).toMatch(/Location Readiness/);
    expect(dashboard).toMatch(/Demand Score/);
    expect(dashboard).toMatch(/Retail Gap/);
    expect(dashboard).toMatch(/recommendations/);
    expect(dashboard).toMatch(/UmkmIntelligenceChart/);
    expect(dashboard).toMatch(/UmkmIntelligenceMap/);
    expect(dashboard).toMatch(/bukan.*(?:revenue|profit|ROI)/is);
  });

  it("shows an ownership-safe empty state instead of treating UMKM mode as ownership", () => {
    expect(dashboard).toMatch(/merchants\.length === 0/);
    expect(dashboard).toMatch(/Mode UMKM tidak memberikan ownership/i);
  });

  it("guards stale requests and bounds local merchant rendering", () => {
    expect(hook).toMatch(/AbortController/);
    expect(hook).toMatch(/sequence\.current === requestId/);
    expect(map).toMatch(/nearby_similar_merchants/);
    expect(map).not.toMatch(/\/web\/competition|x-api-key|service.role/i);
  });
});
