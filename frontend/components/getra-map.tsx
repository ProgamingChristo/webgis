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
  void importBoundaries;

  if (!map.isStyleLoaded()) {
    return;
  }

  const boundaryData: GeoJSON.FeatureCollection<
    GeoJSON.Polygon | GeoJSON.MultiPolygon
  > = {
    type: "FeatureCollection",
    features: [
      ...JAKARTA_ADMIN_BOUNDARIES.features,
    ],
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
    return;
  }

  map.addSource(
    "jakarta-admin-boundaries",
    {
      type: "geojson",
      data:
        boundaryData,
    },
  );

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
      "text-font": [
        "Noto Sans Bold",
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

    return () => {
      merchantMarkers.forEach(
        (marker) =>
          marker.remove(),
      );

      merchantMarkers.clear();

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

    map.once(
      "style.load",
      () => {
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
      },
    );
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
