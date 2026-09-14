"use client";

import React, { useEffect, useRef } from "react";
import type { GeoJSONSource, Map as MapLibreMap, Marker, Popup } from "maplibre-gl";
import { SponsoredPinDTO, SponsoredPinServingContext } from "../types/ad-serving.types";
import { getBasemapOption, getPreferredBasemapId } from "@/lib/mapid";
import { buildSponsoredPopupContent } from "@/src/lib/maplibre-popup";

interface SponsoredPinPreviewMapProps {
  merchantLocation: { longitude: number; latitude: number } | null;
  contextLocation: SponsoredPinServingContext | null;
  targetGeoJSON: any | null;
  placement: SponsoredPinDTO | null;
  onContextChange: (ctx: SponsoredPinServingContext) => void;
  className?: string;
}

export function SponsoredPinPreviewMap({
  merchantLocation,
  contextLocation,
  targetGeoJSON,
  placement,
  onContextChange,
  className = "",
}: SponsoredPinPreviewMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const merchantMarkerRef = useRef<Marker | null>(null);
  const contextMarkerRef = useRef<Marker | null>(null);
  const sponsoredMarkerRef = useRef<Marker | null>(null);
  const popupRef = useRef<Popup | null>(null);

  // 1. Initialize Map
  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      if (!containerRef.current || mapRef.current) return;

      const maplibre = await import("maplibre-gl");
      if (cancelled || !containerRef.current) return;

      maplibre.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

      const defaultCenter: [number, number] = merchantLocation
        ? [merchantLocation.longitude, merchantLocation.latitude]
        : contextLocation
          ? [contextLocation.longitude, contextLocation.latitude]
          : [107.609, -6.9175];

      const map = new maplibre.Map({
        container: containerRef.current,
        style: getBasemapOption(getPreferredBasemapId()).style,
        center: defaultCenter,
        zoom: 14,
      });

      map.addControl(
        new maplibre.NavigationControl({ visualizePitch: true }),
        "top-right"
      );

      map.on("load", () => {
        if (cancelled) return;

        // Target area polygon source & layers
        map.addSource("serving-target-source", {
          type: "geojson",
          data: targetGeoJSON || {
            type: "FeatureCollection",
            features: [],
          },
        });

        map.addLayer({
          id: "serving-target-fill",
          type: "fill",
          source: "serving-target-source",
          paint: {
            "fill-color": "#0ea5e9",
            "fill-opacity": 0.18,
          },
        });

        map.addLayer({
          id: "serving-target-stroke",
          type: "line",
          source: "serving-target-source",
          paint: {
            "line-color": "#0284c7",
            "line-width": 2,
            "line-dasharray": [3, 2],
          },
        });

        // Click on map to set test context point
        map.on("click", (e) => {
          onContextChange({
            longitude: Number(e.lngLat.lng.toFixed(6)),
            latitude: Number(e.lngLat.lat.toFixed(6)),
          });
        });
      });

      mapRef.current = map;
    }

    initMap();

    return () => {
      cancelled = true;
      if (merchantMarkerRef.current) merchantMarkerRef.current.remove();
      if (contextMarkerRef.current) contextMarkerRef.current.remove();
      if (sponsoredMarkerRef.current) sponsoredMarkerRef.current.remove();
      if (popupRef.current) popupRef.current.remove();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // MapLibre owns this imperative setup; marker/source updates are handled by focused effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Update Target GeoJSON source
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource("serving-target-source") as GeoJSONSource | undefined;
    if (source) {
      source.setData(
        targetGeoJSON || {
          type: "FeatureCollection",
          features: [],
        }
      );
    }
  }, [targetGeoJSON]);

  // 3. Update Merchant Marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !merchantLocation) return;

    import("maplibre-gl").then((maplibre) => {
      if (merchantMarkerRef.current) {
        merchantMarkerRef.current.setLngLat([
          merchantLocation.longitude,
          merchantLocation.latitude,
        ]);
      } else {
        const el = document.createElement("div");
        el.className = "flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white border-2 border-white shadow-md text-[10px] font-bold";
        el.innerText = "🏪";

        merchantMarkerRef.current = new maplibre.Marker({ element: el })
          .setLngLat([merchantLocation.longitude, merchantLocation.latitude])
          .addTo(map);
      }
    });
  }, [merchantLocation]);

  // 4. Update Context Test Marker (Draggable)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !contextLocation) {
      contextMarkerRef.current?.remove();
      contextMarkerRef.current = null;
      return;
    }

    import("maplibre-gl").then((maplibre) => {
      if (contextMarkerRef.current) {
        contextMarkerRef.current.setLngLat([
          contextLocation.longitude,
          contextLocation.latitude,
        ]);
      } else {
        const el = document.createElement("div");
        el.className = "group relative flex flex-col items-center cursor-move";
        el.innerHTML = `
          <span class="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[9px] font-bold shadow-sm whitespace-nowrap mb-0.5">Titik Uji</span>
          <div class="w-5 h-5 rounded-full bg-blue-500 border-2 border-white shadow-lg flex items-center justify-center text-white text-[10px]">📍</div>
        `;

        const marker = new maplibre.Marker({ element: el, draggable: true })
          .setLngLat([contextLocation.longitude, contextLocation.latitude])
          .addTo(map);

        marker.on("dragend", () => {
          const lngLat = marker.getLngLat();
          onContextChange({
            longitude: Number(lngLat.lng.toFixed(6)),
            latitude: Number(lngLat.lat.toFixed(6)),
          });
        });

        contextMarkerRef.current = marker;
      }
    });
    // Drag handler reads the latest callback through this render path; avoid recreating the marker on each parent callback identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextLocation?.longitude, contextLocation?.latitude]);

  // 5. Update Sponsored Pin Marker & Popup (rendered when placement is servable)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    import("maplibre-gl").then((maplibre) => {
      if (!placement) {
        if (sponsoredMarkerRef.current) {
          sponsoredMarkerRef.current.remove();
          sponsoredMarkerRef.current = null;
        }
        if (popupRef.current) {
          popupRef.current.remove();
          popupRef.current = null;
        }
        return;
      }

      const [lng, lat] = placement.geometry.coordinates;

      // Create Custom Sponsored Pin Element
      const el = document.createElement("div");
      el.className = "flex flex-col items-center cursor-pointer transform -translate-y-2 animate-bounce";
      el.innerHTML = `
        <span class="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-black uppercase text-white shadow-md border border-amber-300">
          ✨ SPONSORED
        </span>
        <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 border-2 border-white shadow-xl flex items-center justify-center text-white text-xs font-bold mt-0.5">
          📣
        </div>
      `;

      // Create Popup
      const popup = new maplibre.Popup({
        offset: 25,
        closeButton: true,
      }).setDOMContent(buildSponsoredPopupContent(placement));

      if (sponsoredMarkerRef.current) {
        sponsoredMarkerRef.current.setLngLat([lng, lat]);
      } else {
        sponsoredMarkerRef.current = new maplibre.Marker({ element: el })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map);
      }
    });
  }, [placement]);

  return (
    <div
      className={`relative h-[22rem] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner sm:h-[26rem] ${className}`}
      role="region"
      aria-label="Peta pemilihan titik uji penayangan"
    >
      <div ref={containerRef} className="h-full w-full" aria-hidden="true" />

      {/* Map Legend Overlay */}
      <div className="absolute bottom-2 left-2 right-2 z-10 flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white/95 p-2 text-[10px] font-medium text-slate-600 shadow-md backdrop-blur-sm sm:right-auto">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          Toko UMKM
        </span>
        <span className="text-slate-300">|</span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-sky-500" />
          Wilayah sasaran
        </span>
        <span className="text-slate-300">|</span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
          Titik Uji (Klik/Geser)
        </span>
        {placement && (
          <>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1 text-amber-400 font-bold">
              <span>📣</span>
              Penanda promosi aktif
            </span>
          </>
        )}
      </div>
    </div>
  );
}
