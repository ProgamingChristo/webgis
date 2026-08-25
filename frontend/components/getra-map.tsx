"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  ScaleControl,
  setWorkerUrl,
} from "maplibre-gl";

import type { Merchant, UserLocation } from "@/types/getra";

import { JAKARTA_ADMIN_BOUNDARIES } from "@/data/jakarta-admin-boundaries";
import {
  BASEMAP_OPTIONS,
  type BasemapId,
  FALLBACK_MAP_STYLE,
  getBasemapOption,
  getDefaultBasemapId,
} from "@/lib/mapid";

setWorkerUrl(
  "/maplibre/maplibre-gl-worker.mjs",
);

import { CampaignEventService, type SponsoredPinDTO } from "@/src/features/umkm-advertising";

type GetraMapProps = {
  merchants: Merchant[];
  selectedId: string | null;
  userLocation: UserLocation | null;
  onSelect: (merchant: Merchant) => void;
  onClearSelection: () => void;
  datasetBounds: DatasetBounds;
  datasetOrigin: DatasetOrigin;
  routeOriginPoint?: RoutePoint | null;
  routeDestinationPoint?: RoutePoint | null;
  routeGeometry?: GeoJSON.LineString | null;
  routeIsFallback?: boolean;
  importBoundaries?: GeoJSON.FeatureCollection<GeoJSON.MultiPolygon> | null;
  sponsoredPlacements?: SponsoredPinDTO[];
  onSelectSponsored?: (placement: SponsoredPinDTO) => void;
};

type DatasetBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

type DatasetOrigin = {
  name: string;
  longitude: number;
  latitude: number;
};

type RoutePoint = {
  label: string;
  latitude: number;
  longitude: number;
};

function createMerchantMarker(
  selected: boolean,
  merchant: Merchant,
) {
  const element =
    document.createElement("div");

  element.className =
    "map-marker-anchor";

  const button =
    document.createElement("button");

  button.type = "button";

  button.className = selected
    ? "map-marker map-marker--selected"
    : "map-marker";

  button.setAttribute(
    "aria-label",
    `Pilih ${merchant.name}`,
  );

  button.dataset.brand =
    merchant.brand;

  element.append(button);

  return {
    element,
    button,
  };
}

function createPopupContent(
  title: string,
  detail: string,
) {
  const content =
    document.createElement("div");

  const heading =
    document.createElement("strong");

  heading.textContent =
    title;

  content.append(
    heading,
    document.createElement("br"),
    document.createTextNode(detail),
  );

  return content;
}

function createRouteEndpointMarker(
  kind: "start" | "destination",
  label: string,
) {
  const element =
    document.createElement("div");

  element.className =
    `route-endpoint route-endpoint--${kind}`;

  const dot =
    document.createElement("span");

  dot.className =
    "route-endpoint__dot";

  const badge =
    document.createElement("span");

  badge.className =
    "route-endpoint__badge";

  badge.textContent =
    kind === "start"
      ? "START"
      : "TUJUAN";

  element.title =
    label;

  element.append(
    dot,
    badge,
  );

  return element;
}

function addDatasetExtent(
  map: MapLibreMap,
  _bounds: DatasetBounds,
) {
  void _bounds;

  if (
    !map.isStyleLoaded()
  ) {
    return;
  }

  /*
   * Dataset extent used to be rendered as a large bounding rectangle.
   * Keep the cleanup here so old hot-reload map instances lose the box,
   * but do not add it back to the visual map.
   */
  for (const layerId of [
    "coffee-shop-extent-line",
    "coffee-shop-extent-fill",
  ]) {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
  }

  if (map.getSource("coffee-shop-extent")) {
    map.removeSource("coffee-shop-extent");
  }
}

function addJakartaAdminBoundaries(
  map: MapLibreMap,
  importBoundaries: GeoJSON.FeatureCollection<GeoJSON.MultiPolygon> | null,
) {
  if (!map.isStyleLoaded()) {
    return;
  }

  const boundaryFeatures = new Map<
    string,
    GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>
  >();

  JAKARTA_ADMIN_BOUNDARIES.features.forEach((feature, index) => {
    const id =
      typeof feature.properties?.id === "string"
        ? feature.properties.id
        : `static-${index}`;

    boundaryFeatures.set(id, feature);
  });

  (importBoundaries?.features ?? []).forEach((feature, index) => {
    const boundaryMethod =
      typeof feature.properties?.boundary_method === "string"
        ? feature.properties.boundary_method
        : null;

    /*
     * Older admin imports stored a broad rectangle around the point extent.
     * Those rectangles caused the "kotak gede" visual artifact, so keep them
     * persisted for audit metadata but do not render them as admin boundaries.
     */
    if (boundaryMethod === "import_extent_with_safety_padding") {
      return;
    }

    const id =
      typeof feature.properties?.id === "string"
        ? feature.properties.id
        : `import-${index}`;

    boundaryFeatures.set(id, feature);
  });

  const boundaryData: GeoJSON.FeatureCollection<
    GeoJSON.Polygon | GeoJSON.MultiPolygon
  > = {
    type: "FeatureCollection",
    features: Array.from(boundaryFeatures.values()),
  };

  const existingSource =
    map.getSource(
      "jakarta-admin-boundaries",
    );

  if (existingSource) {
    (
      existingSource as unknown as {
        setData: (
          data: GeoJSON.FeatureCollection<
            GeoJSON.Polygon | GeoJSON.MultiPolygon
          >,
        ) => void;
      }
    ).setData(
      boundaryData,
    );
  } else {
    map.addSource(
      "jakarta-admin-boundaries",
      {
        type: "geojson",
        data:
          boundaryData,
      },
    );
  }

  if (!map.getLayer("jakarta-admin-boundary-fill")) {
    map.addLayer({
      id: "jakarta-admin-boundary-fill",
      type: "fill",
      source: "jakarta-admin-boundaries",
      paint: {
        "fill-color": [
          "match",
          [
            "get",
            "id",
          ],
          "jakarta-barat",
          "#22d3ee",
          "jakarta-pusat",
          "#9af24a",
          "jakarta-timur",
          "#f59e0b",
          "#22d3ee",
        ],
        "fill-opacity": [
          "case",
          [
            "has",
            "boundary_method",
          ],
          0.025,
          0.05,
        ],
      },
    });
  }

  if (!map.getLayer("jakarta-admin-boundary-casing")) {
    map.addLayer({
      id: "jakarta-admin-boundary-casing",
      type: "line",
      source: "jakarta-admin-boundaries",
      paint: {
        "line-color": "#041018",
        "line-width": [
          "interpolate",
          [
            "linear",
          ],
          [
            "zoom",
          ],
          10,
          6,
          14,
          8,
        ],
        "line-opacity": 0.58,
      },
    });
  }

  if (!map.getLayer("jakarta-admin-boundary-line")) {
    map.addLayer({
      id: "jakarta-admin-boundary-line",
      type: "line",
      source: "jakarta-admin-boundaries",
      paint: {
        "line-color": [
          "match",
          [
            "get",
            "id",
          ],
          "jakarta-barat",
          "#22d3ee",
          "jakarta-pusat",
          "#9af24a",
          "jakarta-timur",
          "#f59e0b",
          "#22d3ee",
        ],
        "line-width": [
          "interpolate",
          [
            "linear",
          ],
          [
            "zoom",
          ],
          10,
          3.8,
          14,
          5.5,
        ],
        "line-opacity": [
          "case",
          [
            "has",
            "boundary_method",
          ],
          0.72,
          0.95,
        ],
      },
    });
  }

  if (!map.getLayer("jakarta-admin-boundary-label")) {
    map.addLayer({
      id: "jakarta-admin-boundary-label",
      type: "symbol",
      source: "jakarta-admin-boundaries",
      minzoom: 10,
      layout: {
        "text-field": [
          "get",
          "name",
        ],
        "text-size": [
          "interpolate",
          [
            "linear",
          ],
          [
            "zoom",
          ],
          10,
          11,
          14,
          15,
        ],
        "text-transform": "uppercase",
        "text-letter-spacing": 0.08,
        "text-allow-overlap": false,
        "symbol-placement": "point",
      },
      paint: {
        "text-color": "#eef8fa",
        "text-halo-color": "#041018",
        "text-halo-width": 2.5,
        "text-opacity": 0.88,
      },
    });
  }
}

function toRouteFeatureCollection(
  routeGeometry?: GeoJSON.LineString | null,
) {
  return {
    type: "FeatureCollection",
    features: routeGeometry
      ? [
          {
            type: "Feature",
            properties: {},
            geometry:
              routeGeometry,
          },
        ]
      : [],
  } satisfies GeoJSON.FeatureCollection;
}

function syncWalkingRoute(
  map: MapLibreMap,
  routeGeometry?: GeoJSON.LineString | null,
  routeIsFallback = false,
) {
  if (!map.isStyleLoaded()) {
    return;
  }

  const routeData =
    toRouteFeatureCollection(
      routeGeometry,
    );

  const source =
    map.getSource(
      "walking-route",
    );

  if (
    map.getLayer(
      "walking-route-line",
    )
  ) {
    map.moveLayer(
      "walking-route-line",
    );
  }

  if (
    map.getLayer(
      "walking-route-casing",
    )
  ) {
    map.moveLayer(
      "walking-route-casing",
      "walking-route-line",
    );
  }

  if (source) {
    (
      source as unknown as {
        setData: (
          data: GeoJSON.FeatureCollection,
        ) => void;
      }
    ).setData(
      routeData,
    );
  } else {
    map.addSource(
      "walking-route",
      {
        type: "geojson",
        data: routeData,
      },
    );

    map.addLayer({
      id: "walking-route-casing",
      type: "line",
      source: "walking-route",
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": "#041018",
        "line-width": 8,
        "line-opacity": 0.8,
      },
    });

    map.addLayer({
      id: "walking-route-line",
      type: "line",
      source: "walking-route",
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": routeIsFallback
          ? "#f7c948"
          : "#22d3ee",
        "line-width": routeIsFallback
          ? 4
          : 5,
        "line-opacity": 0.92,
        "line-dasharray": routeIsFallback
          ? [
              1.2,
              1.4,
            ]
          : [
              1,
              0,
            ],
      },
    });
  }

  if (
    map.getLayer(
      "walking-route-line",
    )
  ) {
    map.setPaintProperty(
      "walking-route-line",
      "line-color",
      routeIsFallback
        ? "#f7c948"
        : "#22d3ee",
    );

    map.setPaintProperty(
      "walking-route-line",
      "line-width",
      routeIsFallback
        ? 4
        : 5,
    );

    map.setPaintProperty(
      "walking-route-line",
      "line-dasharray",
      routeIsFallback
        ? [
            1.2,
            1.4,
          ]
        : [
            1,
            0,
          ],
    );
  }
}

export function GetraMap({
  merchants,
  selectedId,
  userLocation,
  onSelect,
  onClearSelection,
  datasetBounds,
  datasetOrigin,
  routeOriginPoint,
  routeDestinationPoint,
  routeGeometry,
  routeIsFallback,
  importBoundaries,
  sponsoredPlacements,
  onSelectSponsored,
}: GetraMapProps) {
  const [
    activeBasemapId,
    setActiveBasemapId,
  ] =
    useState<BasemapId>(
      getDefaultBasemapId(),
    );

  const containerRef =
    useRef<HTMLDivElement | null>(null);

  const mapRef =
    useRef<MapLibreMap | null>(null);

  const merchantMarkersRef =
    useRef<Map<string, Marker>>(
      new Map(),
    );

  const sponsoredMarkersRef =
    useRef<Map<string, Marker>>(
      new Map(),
    );

  const userLocationMarkerRef =
    useRef<Marker | null>(
      null,
    );

  const datasetOriginMarkerRef =
    useRef<Marker | null>(
      null,
    );

  const routeOriginMarkerRef =
    useRef<Marker | null>(
      null,
    );

  const routeDestinationMarkerRef =
    useRef<Marker | null>(
      null,
    );

  const routeGeometryRef =
    useRef<GeoJSON.LineString | null>(
      null,
    );

  const routeIsFallbackRef =
    useRef(false);

  const datasetBoundsRef =
    useRef<DatasetBounds>(
      datasetBounds,
    );

  const importBoundariesRef =
    useRef<GeoJSON.FeatureCollection<GeoJSON.MultiPolygon> | null>(
      importBoundaries ?? null,
    );

  useEffect(() => {
    routeGeometryRef.current =
      routeGeometry ?? null;

    routeIsFallbackRef.current =
      routeIsFallback ?? false;
  }, [
    routeGeometry,
    routeIsFallback,
  ]);

  useEffect(() => {
    datasetBoundsRef.current =
      datasetBounds;
  }, [
    datasetBounds,
  ]);

  useEffect(() => {
    importBoundariesRef.current =
      importBoundaries ?? null;

    const map = mapRef.current;

    if (map?.isStyleLoaded()) {
      addJakartaAdminBoundaries(
        map,
        importBoundariesRef.current,
      );
    }
  }, [importBoundaries]);

  useEffect(() => {
    if (
      !containerRef.current ||
      mapRef.current
    ) {
      return;
    }

    const map =
      new MapLibreMap({
        container:
          containerRef.current,

        style:
          getBasemapOption(
            getDefaultBasemapId(),
          ).style ||
          FALLBACK_MAP_STYLE,

        center: [
          datasetOrigin.longitude,
          datasetOrigin.latitude,
        ],

        zoom: 12,

        minZoom: 10.5,

        maxZoom: 20,
      });

    mapRef.current = map;

    /*
     * Snapshot marker collection untuk cleanup.
     * Hindari membaca .current secara langsung
     * saat cleanup effect dijalankan.
     */
    const merchantMarkers =
      merchantMarkersRef.current;

    map.addControl(
      new NavigationControl({
        visualizePitch: true,
      }),
      "top-right",
    );

    map.addControl(
      new ScaleControl({
        unit: "metric",
        maxWidth: 120,
      }),
      "bottom-right",
    );

    map.on("load", () => {
      addJakartaAdminBoundaries(
        map,
        importBoundariesRef.current,
      );

      addDatasetExtent(
        map,
        datasetBounds,
      );

      map.fitBounds(
        [
          [
            datasetBounds.west,
            datasetBounds.south,
          ],
          [
            datasetBounds.east,
            datasetBounds.north,
          ],
        ],
        {
          padding: 42,
          duration: 0,
        },
      );
    });

    map.on(
      "error",
      () => {
        console.error(
          "[GETRA MAP ERROR] Map resource failed to load.",
        );
      },
    );

    const sponsoredMarkers = sponsoredMarkersRef.current;

    return () => {
      merchantMarkers.forEach(
        (marker) =>
          marker.remove(),
      );

      merchantMarkers.clear();

      sponsoredMarkers.forEach(
        (marker) =>
          marker.remove(),
      );

      sponsoredMarkers.clear();

      userLocationMarkerRef.current?.remove();
      userLocationMarkerRef.current = null;

      datasetOriginMarkerRef.current?.remove();
      datasetOriginMarkerRef.current = null;

      routeOriginMarkerRef.current?.remove();
      routeOriginMarkerRef.current = null;

      routeDestinationMarkerRef.current?.remove();
      routeDestinationMarkerRef.current = null;

      map.remove();

      mapRef.current = null;
    };
  }, [
    datasetBounds,
    datasetOrigin,
  ]);

  /*
   * Basemap switcher
   */
  useEffect(() => {
    const map =
      mapRef.current;

    if (
      !map
    ) {
      return;
    }

    const activeBasemap =
      BASEMAP_OPTIONS.find(
        (option) =>
          option.id ===
          activeBasemapId,
      ) ?? BASEMAP_OPTIONS[0];

    if (!activeBasemap) {
      return;
    }

    map.setStyle(
      activeBasemap.style,
    );

    const syncBasemapOverlays = () => {
      try {
        addJakartaAdminBoundaries(
          map,
          importBoundariesRef.current,
        );

        addDatasetExtent(
          map,
          datasetBoundsRef.current,
        );
        syncWalkingRoute(
          map,
          routeGeometryRef.current,
          routeIsFallbackRef.current,
        );
      } catch (error) {
        console.error(
          "[GETRA MAP ERROR] Failed to sync map overlays.",
          error,
        );
      }
    };

    const timeoutId =
      window.setTimeout(
        syncBasemapOverlays,
        150,
      );

    map.once(
      "style.load",
      syncBasemapOverlays,
    );

    map.once(
      "idle",
      syncBasemapOverlays,
    );

    return () => {
      window.clearTimeout(
        timeoutId,
      );
      map.off(
        "style.load",
        syncBasemapOverlays,
      );
      map.off(
        "idle",
        syncBasemapOverlays,
      );
    };
  }, [
    activeBasemapId,
  ]);

  /*
   * Active dataset extent and center marker
   */
  useEffect(() => {
    const map =
      mapRef.current;

    if (!map) {
      return;
    }

    const syncDataset = () => {
      addJakartaAdminBoundaries(
        map,
        importBoundariesRef.current,
      );

      addDatasetExtent(
        map,
        datasetBounds,
      );

      datasetOriginMarkerRef.current?.remove();

      const originElement =
        document.createElement("div");

      originElement.className =
        "transit-marker";

      originElement.title =
        datasetOrigin.name;

      datasetOriginMarkerRef.current =
        new Marker({
          element:
            originElement,
          anchor: "center",
        })
          .setLngLat([
            datasetOrigin.longitude,
            datasetOrigin.latitude,
          ])
          .setPopup(
            new Popup({
              offset: 18,
            }).setDOMContent(
              createPopupContent(
                datasetOrigin.name,
                "Pusat extent dataset aktif",
              ),
            ),
          )
          .addTo(map);
    };

    if (map.isStyleLoaded()) {
      syncDataset();
    } else {
      map.once(
        "load",
        syncDataset,
      );
    }

    if (
      !selectedId &&
      !routeGeometry
    ) {
      map.fitBounds(
        [
          [
            datasetBounds.west,
            datasetBounds.south,
          ],
          [
            datasetBounds.east,
            datasetBounds.north,
          ],
        ],
        {
          padding: 52,
          duration: 500,
        },
      );
    }
  }, [
    datasetBounds,
    datasetOrigin,
    routeGeometry,
    selectedId,
  ]);

  /*
   * Merchant marker
   */
  useEffect(() => {
    const map =
      mapRef.current;

    if (!map) {
      return;
    }

    merchantMarkersRef.current.forEach(
      (marker) =>
        marker.remove(),
    );

    merchantMarkersRef.current.clear();

    const selectedMerchant =
      selectedId
        ? merchants.find(
            (merchant) =>
              merchant.id ===
              selectedId,
          )
        : undefined;

    const visibleMerchants =
      selectedMerchant
        ? [selectedMerchant]
        : merchants;

    for (
      const merchant
      of visibleMerchants
    ) {
      const markerElements =
        createMerchantMarker(
          merchant.id ===
            selectedId,
          merchant,
        );

      markerElements.button.onclick = () => {
        onSelect(
          merchant,
        );
      };

      const marker =
        new Marker({
          element:
            markerElements.element,
          anchor: "center",
        })
          .setLngLat([
            merchant.longitude,
            merchant.latitude,
          ])
          .setPopup(
            new Popup({
              offset: 16,
            }).setDOMContent(
              createPopupContent(
                merchant.name,
                `${merchant.brand} · ${merchant.address ?? "Alamat tidak tersedia"}`,
              ),
            ),
          )
          .addTo(map);

      merchantMarkersRef.current.set(
        merchant.id,
        marker,
      );
    }
  }, [
    merchants,
    selectedId,
    onSelect,
  ]);

  /*
   * Sponsored Pin markers
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    sponsoredMarkersRef.current.forEach((marker) => marker.remove());
    sponsoredMarkersRef.current.clear();

    if (!sponsoredPlacements || sponsoredPlacements.length === 0) return;

    const bounds = map.getBounds();

    for (const placement of sponsoredPlacements) {
      const [lng, lat] = placement.geometry.coordinates;

      // Track IMPRESSION if marker is inside visible map viewport
      const isVisible =
        bounds &&
        lat >= bounds.getSouth() &&
        lat <= bounds.getNorth() &&
        lng >= bounds.getWest() &&
        lng <= bounds.getEast();

      if (isVisible) {
        CampaignEventService.recordEvent({
          event_type: "IMPRESSION",
          campaign_id: placement.campaign_id,
          creative_id: placement.creative_id,
          placement: "SPONSORED_PIN",
          context: { surface: "MAPLIBRE_COMMUTER_MAP" },
        });
      }

      const el = document.createElement("div");
      el.className = "group relative flex flex-col items-center cursor-pointer select-none transition-transform duration-200 hover:scale-110";
      el.innerHTML = `
        <span style="font-size:9px; font-weight:800; text-transform:uppercase; background:#f59e0b; color:#ffffff; padding:2px 6px; border-radius:9999px; border:1px solid #fde68a; box-shadow:0 2px 4px rgba(0,0,0,0.3); margin-bottom:2px;">✨ SPONSORED</span>
        <div style="width:30px; height:30px; border-radius:50%; background:linear-gradient(135deg, #d97706, #f59e0b, #fbbf24); border:2px solid #ffffff; box-shadow:0 4px 6px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; color:#ffffff; font-size:13px;">📣</div>
      `;

      el.onclick = () => {
        CampaignEventService.recordEvent({
          event_type: "SPONSORED_PIN_CLICK",
          campaign_id: placement.campaign_id,
          creative_id: placement.creative_id,
          placement: "SPONSORED_PIN",
          context: { surface: "MAPLIBRE_COMMUTER_MAP" },
        });
        onSelectSponsored?.(placement);
      };

      const popup = new Popup({ offset: 20 }).setHTML(`
        <div style="padding: 6px; font-family: sans-serif; max-width: 200px;">
          <span style="background: #fef3c7; color: #92400e; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 9999px; text-transform: uppercase;">✨ Sponsored</span>
          <h5 style="margin: 4px 0 2px 0; font-size: 12px; font-weight: 700; color: #0f172a;">${placement.headline}</h5>
          <p style="margin: 0; font-size: 10px; color: #64748b;">${placement.merchant_name} (${placement.merchant_category})</p>
        </div>
      `);

      const marker = new Marker({ element: el, anchor: "bottom" })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);

      sponsoredMarkersRef.current.set(placement.campaign_id, marker);
    }
  }, [sponsoredPlacements, onSelectSponsored]);

  /*
   * User GPS marker
   */
  useEffect(() => {
    const map =
      mapRef.current;

    if (!map) {
      return;
    }

    userLocationMarkerRef.current?.remove();
    userLocationMarkerRef.current = null;

    if (!userLocation) {
      return;
    }

    const element =
      document.createElement("div");

    element.className =
      "user-location-anchor";

    element.title =
      "Lokasi kamu saat ini";

    const dot =
      document.createElement("div");

    dot.className =
      "user-location-marker";

    const label =
      document.createElement("span");

    label.className =
      "user-location-label";

    label.textContent =
      "Lokasi saya";

    element.append(
      dot,
      label,
    );

    const marker =
      new Marker({
        element,
        anchor: "center",
      })
        .setLngLat([
          userLocation.longitude,
          userLocation.latitude,
        ])
        .setPopup(
          new Popup({
            offset: 18,
          }).setDOMContent(
            createPopupContent(
              "Lokasi kamu",
              `Akurasi sekitar ${userLocation.accuracyMeters} m`,
            ),
          ),
        )
        .addTo(map);

    userLocationMarkerRef.current =
      marker;

    map.easeTo({
      center: [
        userLocation.longitude,
        userLocation.latitude,
      ],
      zoom: Math.max(
        map.getZoom(),
        14,
      ),
      duration: 650,
    });
  }, [
    userLocation,
  ]);

  /*
   * Route endpoint markers
   */
  useEffect(() => {
    const map =
      mapRef.current;

    if (!map) {
      return;
    }

    routeOriginMarkerRef.current?.remove();
    routeOriginMarkerRef.current = null;

    if (routeOriginPoint) {
      routeOriginMarkerRef.current =
        new Marker({
          element:
            createRouteEndpointMarker(
              "start",
              routeOriginPoint.label,
            ),
          anchor: "center",
        })
          .setLngLat([
            routeOriginPoint.longitude,
            routeOriginPoint.latitude,
          ])
          .setPopup(
            new Popup({
              offset: 18,
            }).setDOMContent(
              createPopupContent(
                "Titik mulai",
                routeOriginPoint.label,
              ),
            ),
          )
          .addTo(map);
    }

    routeDestinationMarkerRef.current?.remove();
    routeDestinationMarkerRef.current = null;

    if (routeDestinationPoint) {
      routeDestinationMarkerRef.current =
        new Marker({
          element:
            createRouteEndpointMarker(
              "destination",
              routeDestinationPoint.label,
            ),
          anchor: "center",
        })
          .setLngLat([
            routeDestinationPoint.longitude,
            routeDestinationPoint.latitude,
          ])
          .setPopup(
            new Popup({
              offset: 18,
            }).setDOMContent(
              createPopupContent(
                "Tujuan",
                routeDestinationPoint.label,
              ),
            ),
          )
          .addTo(map);
    }
  }, [
    routeDestinationPoint,
    routeOriginPoint,
  ]);

  /*
   * Focus selected merchant
   */
  useEffect(() => {
    const map =
      mapRef.current;

    if (
      !map ||
      !selectedId
    ) {
      return;
    }

    const merchant =
      merchants.find(
        (item) =>
          item.id ===
          selectedId,
      );

    if (!merchant) {
      return;
    }

    map.easeTo({
      center: [
        merchant.longitude,
        merchant.latitude,
      ],

      zoom: Math.max(
        map.getZoom(),
        16,
      ),

      duration: 500,
    });
  }, [
    merchants,
    selectedId,
  ]);

  /*
   * Draw Route Line
   */
  useEffect(() => {
    const map =
      mapRef.current;

    if (!map) {
      return;
    }

    const updateRoute = () => {
      syncWalkingRoute(
        map,
        routeGeometry,
        routeIsFallback,
      );
    };

    if (map.isStyleLoaded()) {
      updateRoute();
    } else {
      map.once(
        "load",
        updateRoute,
      );
    }

    if (routeGeometry) {
      const bounds =
        new LngLatBounds();

      routeGeometry.coordinates.forEach(
        (
          coordinate,
        ) => {
          bounds.extend([
            coordinate[0],
            coordinate[1],
          ]);
        },
      );

      if (!bounds.isEmpty()) {
        map.fitBounds(
          bounds,
          {
            padding: 72,
            maxZoom: 16,
            duration: 650,
          },
        );
      }
    }
  }, [
    routeGeometry,
    routeIsFallback,
  ]);

  return (
    <div className="map-shell">

      <div
        ref={containerRef}
        className="map-canvas"
      />

      <div className="map-status map-status--top-left">
        <span
          className={
            "status-dot status-dot--ok"
          }
        />

        <div>
          <strong>
            BASEMAP
          </strong>

          <span>
            {BASEMAP_OPTIONS.find(
              (option) =>
                option.id ===
                activeBasemapId,
            )?.description ?? "MAPID basemap"}
          </span>
        </div>
      </div>

      {selectedId ? (
        <button
          className="map-show-all-button"
          type="button"
          onClick={onClearSelection}
        >
          Tampilkan semua titik
        </button>
      ) : null}

      <div
        className="basemap-switcher"
        aria-label="Pilih basemap"
      >
        {BASEMAP_OPTIONS.map(
          (option) => (
            <button
              key={option.id}
              type="button"
              className={
                option.id ===
                activeBasemapId
                  ? "basemap-button basemap-button--active"
                  : "basemap-button"
              }
              onClick={() =>
                setActiveBasemapId(
                  option.id,
                )
              }
            >
              <span>
                {option.label}
              </span>
              <small>
                {option.description}
              </small>
            </button>
          ),
        )}
      </div>

    </div>
  );
}
