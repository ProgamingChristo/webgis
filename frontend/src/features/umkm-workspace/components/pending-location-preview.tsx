"use client";

import React, { useEffect, useRef } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { MapPin, ShieldAlert } from "lucide-react";
import { getBasemapOption, getPreferredBasemapId } from "@/lib/mapid";

interface PendingLocationPreviewProps {
  coordinates: [number, number]; // [longitude, latitude]
  merchantName?: string;
  className?: string;
}

export function PendingLocationPreview({
  coordinates,
  merchantName,
  className = "",
}: PendingLocationPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);

  const [lng, lat] = coordinates;

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!containerRef.current || mapRef.current) return;

      try {
        const maplibre = await import("maplibre-gl");
        maplibre.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

        const defaultBasemap = getBasemapOption(getPreferredBasemapId());

        const map = new maplibre.Map({
          container: containerRef.current,
          style: defaultBasemap.style,
          center: [lng, lat],
          zoom: 15,
          interactive: true,
          attributionControl: false,
        });

        map.addControl(
          new maplibre.NavigationControl({ showCompass: false }),
          "top-right"
        );

        map.on("load", () => {
          if (!isMounted) return;

          // Custom pin marker for pending merchant
          const el = document.createElement("div");
          el.className = "pending-merchant-pin";
          el.innerHTML = `
            <div style="
              width: 32px;
              height: 32px;
              background: #0284c7;
              border: 3px solid #ffffff;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 14px rgba(2, 132, 199, 0.45);
              color: white;
            ">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
          `;

          const marker = new maplibre.Marker({ element: el })
            .setLngLat([lng, lat])
            .addTo(map);

          markerRef.current = marker;
        });

        mapRef.current = map;
      } catch (err) {
        console.warn("[PendingLocationPreview] Map initialization failed:", err);
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [lng, lat]);

  return (
    <div
      data-testid="owner-pending-map-preview"
      className={`rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm text-xs ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="flex items-center gap-1.5 font-semibold text-sky-700">
          <MapPin size={14} className="text-sky-600" />
          <span>Pratinjau Lokasi (Hanya Pemilik){merchantName ? ` — ${merchantName}` : ""}</span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
          <ShieldAlert size={11} className="text-amber-600" />
          Belum Publik
        </span>
      </div>

      <div className="relative w-full h-48 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 mb-2">
        <div ref={containerRef} className="w-full h-full" />
      </div>

      <div className="flex flex-col gap-1 text-[11px] leading-5 text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-mono text-slate-700 font-medium">
          Koordinat: {lat.toFixed(6)}, {lng.toFixed(6)}
        </span>
        <span className="text-slate-400">
          Marker ini hanya terlihat di ruang kelola Anda
        </span>
      </div>
    </div>
  );
}
