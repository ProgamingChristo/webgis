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
});
