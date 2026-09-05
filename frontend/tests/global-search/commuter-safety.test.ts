import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const routingHook = readFileSync(resolve(process.cwd(), "src/hooks/use-routing.ts"), "utf8");
const dashboard = readFileSync(resolve(process.cwd(), "components/getra-dashboard.tsx"), "utf8");
const map = readFileSync(resolve(process.cwd(), "components/getra-map.tsx"), "utf8");
const routeLayer = readFileSync(resolve(process.cwd(), "src/features/routing/route-layer.ts"), "utf8");
const basemap = readFileSync(resolve(process.cwd(), "lib/mapid.ts"), "utf8");

describe("commuter browser safety", () => {
  it("cancels stale route requests and never fabricates a client route", () => {
    expect(routingHook).toContain("AbortController");
    expect(routingHook).toContain("controller.signal.aborted || sequence.current !== id");
    expect(routingHook).toContain("snapshot?.identity === identity");
    expect(routingHook).not.toContain("direct_line_fallback");
    expect(routingHook).not.toContain("calculateDistanceMeters");
  });

  it("keeps explicit relaxation and smart-alternative controls", () => {
    expect(dashboard).toContain("tidak melonggarkan budget");
    expect(dashboard).toContain("Tujuan UMKM berikutnya");
    expect(dashboard).toContain("serviceAreaGeometry");
  });

  it("renders network service-area edges separately from the route", () => {
    expect(map).toContain('"walking-service-area"');
    expect(map).toContain("syncWalkingRoute");
    expect(routeLayer).toContain('"walking-route"');
    expect(map).not.toContain("routeIsFallback");
  });

  it("does not ship a hard-coded MAPID credential in frontend source", () => {
    expect(basemap).not.toMatch(/[a-f0-9]{24}/i);
    expect(basemap).toContain("NEXT_PUBLIC_MAPID_BASEMAP_KEY");
    expect(basemap).toContain("tiles.openfreemap.org");
  });
});
