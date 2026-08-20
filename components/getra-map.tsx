"use client";

import {
  useEffect,
  useRef,
} from "react";

import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  ScaleControl,
  setWorkerUrl,
} from "maplibre-gl";

import type { Merchant } from "@/types/getra";

import {
  PILOT_ORIGIN,
} from "@/data/demo-merchants";

import {
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
  onSelect: (merchant: Merchant) => void;
};

function createMerchantMarker(
  selected: boolean,
) {
  const element =
    document.createElement("button");

  element.type = "button";

  element.className = selected
    ? "map-marker map-marker--selected"
    : "map-marker";

  element.setAttribute(
    "aria-label",
    "Pilih lokasi UMKM",
  );

  return element;
}

export function GetraMap({
  merchants,
  selectedId,
  onSelect,
}: GetraMapProps) {
  const containerRef =
    useRef<HTMLDivElement | null>(null);

  const mapRef =
    useRef<MapLibreMap | null>(null);

  const merchantMarkersRef =
    useRef<Map<string, Marker>>(
      new Map(),
    );

  useEffect(() => {
    if (
      !containerRef.current ||
      mapRef.current
    ) {
      return;
    }

    console.log(
      "[GETRA] MAPID STYLE:",
      MAPID_STYLE_URL,
    );

    const map =
      new MapLibreMap({
        container:
          containerRef.current,

        style:
          MAPID_STYLE_URL ||
          FALLBACK_MAP_STYLE,

        center: [
          PILOT_ORIGIN.longitude,
          PILOT_ORIGIN.latitude,
        ],

        zoom: 15.1,

        minZoom: 4,

        maxZoom: 20,
      });

    mapRef.current = map;

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
      PILOT_ORIGIN.name;

    new Marker({
      element: originElement,
      anchor: "center",
    })
      .setLngLat([
        PILOT_ORIGIN.longitude,
        PILOT_ORIGIN.latitude,
      ])
      .setPopup(
        new Popup({
          offset: 18,
        }).setHTML(`
          <strong>
            ${PILOT_ORIGIN.name}
          </strong>
          <br />
          Titik asal pilot GETRA
        `),
      )
      .addTo(map);

    /*
     * Debug status
     */
    map.on("load", () => {
      console.log(
        "[GETRA] MAP LOADED",
      );

      console.log(
        "[GETRA] STYLE:",
        map.getStyle(),
      );

      /*
       * Service Area synthetic
       */
      map.addSource(
        "demo-service-area",
        {
          type: "geojson",

          data: {
            type: "Feature",

            properties: {
              status: "synthetic",
            },

            geometry: {
              type: "Polygon",

              coordinates: [
                [
                  [
                    106.81995,
                    -6.1984,
                  ],
                  [
                    106.82205,
                    -6.1974,
                  ],
                  [
                    106.8253,
                    -6.19795,
                  ],
                  [
                    106.82655,
                    -6.20035,
                  ],
                  [
                    106.8253,
                    -6.203,
                  ],
                  [
                    106.8227,
                    -6.20345,
                  ],
                  [
                    106.82015,
                    -6.2024,
                  ],
                  [
                    106.81945,
                    -6.20025,
                  ],
                  [
                    106.81995,
                    -6.1984,
                  ],
                ],
              ],
            },
          },
        },
      );

      map.addLayer({
        id:
          "demo-service-area-fill",

        type: "fill",

        source:
          "demo-service-area",

        paint: {
          "fill-color":
            "#9af24a",

          "fill-opacity":
            0.08,
        },
      });

      map.addLayer({
        id:
          "demo-service-area-line",

        type: "line",

        source:
          "demo-service-area",

        paint: {
          "line-color":
            "#9af24a",

          "line-width":
            2,

          "line-opacity":
            0.8,

          "line-dasharray":
            [2, 2],
        },
      });
    });

    map.on(
      "error",
      (event) => {
        console.error(
          "[GETRA MAP ERROR]",
          event.error,
        );
      },
    );

    return () => {
      merchantMarkersRef.current.forEach(
        (marker) =>
          marker.remove(),
      );

      merchantMarkersRef.current.clear();

      map.remove();

      mapRef.current = null;
    };
  }, []);

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
            }).setHTML(`
              <strong>
                ${merchant.name}
              </strong>
              <br />
              ${merchant.category}
              ·
              ${merchant.walkingMinutes}
              menit
            `),
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
              : "Fallback GETRA"}
          </span>
        </div>
      </div>

    </div>
  );
}