import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  describe,
  expect,
  it,
} from "vitest";

const routingHook = readFileSync(
  resolve(
    process.cwd(),
    "src/hooks/use-routing.ts",
  ),
  "utf8",
);

const dashboard = readFileSync(
  resolve(
    process.cwd(),
    "components/getra-dashboard.tsx",
  ),
  "utf8",
);

const map = readFileSync(
  resolve(
    process.cwd(),
    "components/getra-map.tsx",
  ),
  "utf8",
);

const searchControls = readFileSync(
  resolve(process.cwd(), "src/features/global-search/components/global-search-controls.tsx"),
  "utf8",
);

const routeLayer = readFileSync(
  resolve(
    process.cwd(),
    "src/features/routing/route-layer.ts",
  ),
  "utf8",
);

const basemap = readFileSync(
  resolve(
    process.cwd(),
    "lib/mapid.ts",
  ),
  "utf8",
);

describe("commuter browser safety", () => {
  it(
    "cancels stale route requests and never fabricates a client route",
    () => {
      expect(
        routingHook,
      ).toContain(
        "AbortController",
      );

      expect(
        routingHook,
      ).toContain(
        "controller.signal.aborted || sequence.current !== id",
      );

      expect(
        routingHook,
      ).toContain(
        "snapshot?.identity === identity",
      );

      expect(
        routingHook,
      ).not.toContain(
        "direct_line_fallback",
      );

      expect(
        routingHook,
      ).not.toContain(
        "calculateDistanceMeters",
      );
    },
  );

  it(
    "keeps explicit filter relaxation while routing alternatives come from the provider",
    () => {
      expect(
        dashboard,
      ).toContain(
        "tidak mengubah filter Anda secara otomatis",
      );

      expect(
        dashboard,
      ).not.toContain(
        "Tujuan UMKM berikutnya",
      );

      /**
       * Keep the route hook guard from HEAD.
       *
       * This ensures cleared route state does not immediately
       * trigger another stale route request.
       */
      expect(
        routingHook,
      ).toContain(
        "if (!ready || key === clearedKey) return",
      );

      /**
       * Keep the finalmerge route-alternative UX assertion.
       *
       * Alternatives must come from GETRA's routing provider,
       * not from a fabricated client-side route.
       */
      expect(
        dashboard,
      ).toContain(
        "Menghitung rute dan pilihan alternatif",
      );

      expect(
        dashboard,
      ).toContain(
        "serviceAreaGeometry",
      );
    },
  );

  it(
    "renders network service-area edges separately from the route",
    () => {
      expect(
        map,
      ).toContain(
        '"walking-service-area"',
      );

      expect(
        map,
      ).toContain(
        "syncWalkingRoute",
      );

      expect(
        routeLayer,
      ).toContain(
        '"walking-route"',
      );

      expect(
        map,
      ).not.toContain(
        "routeIsFallback",
      );
    },
  );

  it(
    "does not ship a hard-coded MAPID credential in frontend source",
    () => {
      expect(
        basemap,
      ).not.toMatch(
        /[a-f0-9]{24}/i,
      );

      expect(
        basemap,
      ).toContain(
        "NEXT_PUBLIC_MAPID_BASEMAP_KEY",
      );

      expect(
        basemap,
      ).toContain(
        "tiles.openfreemap.org",
      );
    },
  );

  it("prevents stale AI searches from overwriting newer manual criteria", () => {
    expect(dashboard).toContain("canonicalSearchGenerationRef");
    expect(dashboard).toContain("generation !== canonicalSearchGenerationRef.current");
    expect(dashboard).toContain("searchRevision !== searchRevisionRef.current");
    expect(dashboard).toContain("searchRevisionRef.current++; canonicalRequestRef.current?.abort(); serviceAreaRequestRef.current?.abort()");
  });

  it("keeps automatic nearby context separate from route origin state", () => {
    expect(dashboard).toContain("requestAutoLocationOnce");
    expect(dashboard).toContain("started: autoLocationStartedRef");
    expect(dashboard).toContain("locationRequestInFlightRef.current");
    expect(dashboard).toContain("setAsRouteOrigin: false");
    expect(dashboard).toContain("loadNearbyContext: true");
    expect(dashboard).toContain("Di sekitar kamu");
    expect(searchControls).toContain("Aktifkan lokasi saya");
  });

  it("keeps legacy data workspaces out of the commuter sidebar", () => {
    expect(dashboard).toContain("Layer Peta");
    expect(dashboard).not.toContain("Eksplorasi & data peta");
    expect(dashboard).not.toContain("Filter cakupan data");
    expect(dashboard).not.toContain("Data map siap difilter");
    expect(searchControls).not.toContain("<legend>Brand</legend>");
    expect(searchControls).toContain("Harga maksimal");
  });

  it("keeps bootstrap browsing quiet and retries the same failed search", () => {
    expect(dashboard).toContain('failureMode?: "SEARCH" | "BOOTSTRAP"');
    expect(dashboard).toContain('failureMode === "SEARCH"');
    expect(dashboard).toContain('lastFailedSearchRef.current = retryExecution');
    expect(dashboard).toContain('}, false, false, "BOOTSTRAP")');
    expect(dashboard).not.toContain("Belum ada pencarian aktif.");
  });

  it("keeps commuter layers in the sidebar and hides the duplicate map control", () => {
    expect(dashboard).toContain('showContextualLayerControl={activeExperience !== "GENERAL"}');
    expect(dashboard).toContain("Layer Peta");
    expect(map).toContain("showContextualLayerControl ? <ContextualLayerControl");
  });

  it("shows a real user marker without a visible dataset-origin marker", () => {
    expect(map).toContain('"user-location-anchor"');
    expect(map).toContain('"Lokasi saya"');
    expect(map).not.toContain("datasetOriginMarkerRef");
    expect(map).not.toContain("Pusat area data aktif");
  });

  it("keeps a resolved non-merchant place visible and routable", () => {
    expect(dashboard).toContain("const [resolvedPlace, setResolvedPlace]");
    expect(dashboard).toContain('aria-label="Lokasi ditemukan"');
    expect(dashboard).toContain("routeToResolvedPlace(resolvedPlace)");
    expect(dashboard).toContain("focusedPlace={resolvedPlace?.merchant ? null : resolvedPlace}");
    expect(map).toContain("focused-place-marker");
  });

  it("uses a compact basemap disclosure instead of a permanent map-type card", () => {
    expect(map).toContain('className="map-basemap-control"');
    expect(map).toContain("Tampilan Peta");
    expect(map).not.toContain("JENIS PETA");
    expect(map).not.toContain('open={journeyActive ? undefined : true}');
  });

  it("tracks sponsored map clicks once through the dashboard action", () => {
    expect(map).not.toContain('event_type: "SPONSORED_PIN_CLICK"');
    expect(dashboard).toContain("trackSponsoredPinClick");
    expect(dashboard).toContain('surface: "MAPLIBRE_COMMUTER_MAP"');
  });
});
