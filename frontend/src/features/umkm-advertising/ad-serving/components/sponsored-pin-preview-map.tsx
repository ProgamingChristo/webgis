"use client";

import React, { useEffect, useRef } from "react";
import type { GeoJSONSource, Map as MapLibreMap, Marker, Popup } from "maplibre-gl";
import { SponsoredPinDTO, SponsoredPinServingContext } from "../types/ad-serving.types";
import { getBasemapOption, getDefaultBasemapId } from "@/lib/mapid";

interface SponsoredPinPreviewMapProps {
  merchantLocation: { longitude: number; latitude: number } | null;
  contextLocation: SponsoredPinServingContext;
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
        : [contextLocation.longitude, contextLocation.latitude];

      const map = new maplibre.Map({
        container: containerRef.current,
        style: getBasemapOption(getDefaultBasemapId()).style,
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
            "fill-color": "#8b5cf6",
            "fill-opacity": 0.18,
          },
        });

        map.addLayer({
          id: "serving-target-stroke",
          type: "line",
          source: "serving-target-source",
          paint: {
            "line-color": "#7c3aed",
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
    if (!map) return;

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
  }, [contextLocation.longitude, contextLocation.latitude]);

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
      const popup = new maplibre.Popup({ offset: 25, closeButton: true }).setHTML(`
        <div style="padding: 6px; font-family: sans-serif; max-width: 200px;">
          <span style="background: #fef3c7; color: #92400e; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 9999px; text-transform: uppercase;">✨ Sponsored</span>
          <h5 style="margin: 4px 0 2px 0; font-size: 12px; font-weight: 700; color: #0f172a;">${placement.headline}</h5>
          <p style="margin: 0; font-size: 10px; color: #64748b;">${placement.merchant_name} (${placement.merchant_category})</p>
          <div style="margin-top: 6px; font-size: 10px; font-weight: 600; color: #d97706;">
            ${placement.cta_type === "REQUEST_ROUTE" ? "📍 Rute Tersedia" : "🏪 Kunjungi Profil"}
          </div>
        </div>
      `);

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
    <div className={`relative h-80 w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-950 ${className}`}>
      <div ref={containerRef} className="h-full w-full" />

      {/* Map Legend Overlay */}
      <div className="absolute bottom-2 left-2 z-10 flex flex-wrap items-center gap-1.5 rounded-lg bg-slate-900/85 p-2 text-[10px] text-slate-300 shadow-md backdrop-blur-sm border border-slate-700">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          Toko UMKM
        </span>
        <span className="text-slate-600">|</span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-purple-500" />
          Area Target
        </span>
        <span className="text-slate-600">|</span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
          Titik Uji (Klik/Geser)
        </span>
        {placement && (
          <>
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-1 text-amber-400 font-bold">
              <span>📣</span>
              Sponsored Pin Aktif
            </span>
          </>
        )}
      </div>
    </div>
  );
}
