"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  ScaleControl,
  setWorkerUrl,
} from "maplibre-gl";

import type { Merchant, UserLocation } from "@/types/getra";

import {
  COFFEE_SHOP_BOUNDS,
  COFFEE_SHOP_ORIGIN,
} from "@/data/coffee-shops-jakarta-barat";

import {
  BASEMAP_OPTIONS,
  type BasemapId,
  FALLBACK_MAP_STYLE,
  MAPID_STYLE_NAME,
  MAPID_STYLE_URL,
} from "@/lib/mapid";

setWorkerUrl(
  "/maplibre/maplibre-gl-worker.mjs",
);

type GetraMapProps = {
  merchants: Merchant[];
  selectedId: string | null;
  userLocation: UserLocation | null;
  onSelect: (merchant: Merchant) => void;
};

function createMerchantMarker(
  selected: boolean,
  merchant: Merchant,
) {
  const element =
    document.createElement("button");

  element.type = "button";

  element.className = selected
    ? "map-marker map-marker--selected"
    : "map-marker";

  element.setAttribute(
    "aria-label",
    `Pilih ${merchant.name}`,
  );

  element.dataset.brand =
    merchant.brand;

  const halo =
    document.createElement("span");

  halo.className =
    "map-marker__halo";

  const glyph =
    document.createElement("span");

  glyph.className =
    "map-marker__glyph";

  glyph.textContent =
    merchant.brand
      .trim()
      .slice(0, 1)
      .toUpperCase() || "C";

  element.append(
    halo,
    glyph,
  );

  return element;
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

function addDatasetExtent(map: MapLibreMap) {
  if (
    !map.isStyleLoaded() ||
    map.getSource(
      "coffee-shop-extent",
    )
  ) {
    return;
  }

  map.addSource(
    "coffee-shop-extent",
    {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {
          status:
            "geojson_extent",
        },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [
                COFFEE_SHOP_BOUNDS.west,
                COFFEE_SHOP_BOUNDS.south,
              ],
              [
                COFFEE_SHOP_BOUNDS.east,
                COFFEE_SHOP_BOUNDS.south,
              ],
              [
                COFFEE_SHOP_BOUNDS.east,
                COFFEE_SHOP_BOUNDS.north,
              ],
              [
                COFFEE_SHOP_BOUNDS.west,
                COFFEE_SHOP_BOUNDS.north,
              ],
              [
                COFFEE_SHOP_BOUNDS.west,
                COFFEE_SHOP_BOUNDS.south,
              ],
            ],
          ],
        },
      },
    },
  );

  map.addLayer({
    id: "coffee-shop-extent-fill",
    type: "fill",
    source: "coffee-shop-extent",
    paint: {
      "fill-color": "#22d3ee",
      "fill-opacity": 0.045,
    },
  });

  map.addLayer({
    id: "coffee-shop-extent-line",
    type: "line",
    source: "coffee-shop-extent",
    paint: {
      "line-color": "#22d3ee",
      "line-width": 1.5,
      "line-opacity": 0.75,
      "line-dasharray": [
        2,
        2,
      ],
    },
  });
}

export function GetraMap({
  merchants,
  selectedId,
  userLocation,
  onSelect,
}: GetraMapProps) {
  const [
    activeBasemapId,
    setActiveBasemapId,
  ] =
    useState<BasemapId>(
      "osm",
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
          MAPID_STYLE_URL ||
          BASEMAP_OPTIONS[0]?.style ||
          FALLBACK_MAP_STYLE,

        center: [
          COFFEE_SHOP_ORIGIN.longitude,
          COFFEE_SHOP_ORIGIN.latitude,
        ],

        zoom: 12,

        minZoom: 4,

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

    /*
     * Marker titik asal
     */
    const originElement =
      document.createElement("div");

    originElement.className =
      "transit-marker";

    originElement.title =
      COFFEE_SHOP_ORIGIN.name;

    new Marker({
      element: originElement,
      anchor: "center",
    })
      .setLngLat([
        COFFEE_SHOP_ORIGIN.longitude,
        COFFEE_SHOP_ORIGIN.latitude,
      ])
      .setPopup(
        new Popup({
          offset: 18,
        }).setDOMContent(
          createPopupContent(
            COFFEE_SHOP_ORIGIN.name,
            "Pusat extent dataset GeoJSON",
          ),
        ),
      )
      .addTo(map);

    map.on("load", () => {
      addDatasetExtent(
        map,
      );

      map.fitBounds(
        [
          [
            COFFEE_SHOP_BOUNDS.west,
            COFFEE_SHOP_BOUNDS.south,
          ],
          [
            COFFEE_SHOP_BOUNDS.east,
            COFFEE_SHOP_BOUNDS.north,
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

      map.remove();

      mapRef.current = null;
    };
  }, []);

  /*
   * Basemap switcher
   */
  useEffect(() => {
    const map =
      mapRef.current;

    if (
      !map ||
      MAPID_STYLE_URL
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
        addDatasetExtent(
          map,
        );
      },
    );
  }, [
    activeBasemapId,
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

    for (
      const merchant
      of merchants
    ) {
      const element =
        createMerchantMarker(
          merchant.id ===
            selectedId,
          merchant,
        );

      element.onclick = () => {
        onSelect(
          merchant,
        );
      };

      const marker =
        new Marker({
          element,
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
      "user-location-marker";

    element.title =
      "Lokasi kamu saat ini";

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

  return (
    <div className="map-shell">

      <div
        ref={containerRef}
        className="map-canvas"
      />

      <div className="map-status map-status--top-left">
        <span
          className={
            MAPID_STYLE_URL
              ? "status-dot status-dot--ok"
              : "status-dot"
          }
        />

        <div>
          <strong>
            BASEMAP
          </strong>

          <span>
            {MAPID_STYLE_URL
              ? `MAPID · ${MAPID_STYLE_NAME}`
              : BASEMAP_OPTIONS.find(
                  (option) =>
                    option.id ===
                    activeBasemapId,
                )?.description ?? "OpenStreetMap"}
          </span>
        </div>
      </div>

      {!MAPID_STYLE_URL ? (
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
      ) : null}

    </div>
  );
}
