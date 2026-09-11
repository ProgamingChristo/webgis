import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const workspace = readFileSync(resolve(root, "src/features/business-space/components/business-space-workspace.tsx"), "utf8");
const service = readFileSync(resolve(root, "src/features/business-space/services/business-space.service.ts"), "utf8");
const map = readFileSync(resolve(root, "src/features/business-space/components/business-space-map.tsx"), "utf8");
const dashboard = readFileSync(resolve(root, "components/getra-dashboard.tsx"), "utf8");
const sharedMap = readFileSync(resolve(root, "components/getra-map.tsx"), "utf8");
const nextConfig = readFileSync(resolve(root, "next.config.ts"), "utf8");
const detail = readFileSync(resolve(root, "src/features/business-space/components/property-candidate-detail.tsx"), "utf8");
const comparison = readFileSync(resolve(root, "src/features/business-space/components/property-comparison.tsx"), "utf8");
const placeDetail = readFileSync(resolve(root, "src/features/global-search/components/place-detail-drawer.tsx"), "utf8");

describe("Business Space frontend contract", () => {
  it("calls GETRA-owned APIs only", () => {
    expect(service).toContain("/api/business-space/candidates");
    expect(service).toContain("/api/business-space/compare");
    expect(service).toContain("/api/business-space/insight");
    expect(service).not.toMatch(/basemap\.mapid\.io\/web\/competition|\/web\/competition|x-api-key/i);
  });

  it("keeps claim-safe property wording", () => {
    expect(detail).toContain("Ketersediaan belum dikonfirmasi");
    expect(detail).toContain("Tanggal observasi belum tersedia");
    expect(detail).toContain("Perlu konfirmasi ulang");
    expect(workspace).not.toMatch(/AVAILABLE NOW|STILL FOR RENT|STILL FOR SALE|untung pasti/i);
  });

  it("has accessible comparison and ECharts output", () => {
    expect(comparison).toContain("<table>");
    expect(comparison).toContain("BusinessSpaceChart");
    expect(comparison).toContain("Jelaskan perbandingan");
  });

  it("uses persisted MAPID GL basemap preference for the map", () => {
    expect(map).toContain("getPreferredBasemapId()");
    expect(map).toContain("getBasemapOption");
    expect(map).toContain("maplibre-gl");
  });

  it("keeps Properti Go map support outside the General commuter controls", () => {
    expect(dashboard).not.toContain(">Ruang Usaha<");
    expect(workspace).toContain("transaction_type");
    expect(workspace).toContain("property_category");
    expect(sharedMap).toContain("property-marker");
    expect(sharedMap).toContain("Sumber: Properti Go");
  });

  it("mounts only the Properti Go workspace for the Investor experience", () => {
    expect(dashboard).toContain('activeExperience === "INVESTOR"');
    expect(dashboard).toContain('<BusinessSpaceWorkspace />');
    expect(dashboard).toContain('data-active-experience="INVESTOR"');
    expect(dashboard).toMatch(
      /activeExperience === "INVESTOR"[\s\S]*?<BusinessSpaceWorkspace \/>[\s\S]*?return <GeneralGetraDashboard \/>/,
    );
  });

  it("exposes Menu Go media as safe canonical merchant enrichment", () => {
    expect(placeDetail).toContain("Foto &amp; Menu");
    expect(placeDetail).toContain("menuPhotos");
    expect(placeDetail).toContain("merchantPrice");
    expect(placeDetail).not.toContain("Menu utama");
    expect(nextConfig).toContain("remotePatterns");
    expect(nextConfig).toContain("mapidstorage.cdn.mapid.io");
    expect(dashboard).not.toMatch(/raw_payload|checksum|SUPABASE_SERVICE_ROLE_KEY|x-api-key/i);
  });
});
