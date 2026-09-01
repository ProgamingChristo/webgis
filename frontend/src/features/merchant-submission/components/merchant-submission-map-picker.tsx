"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { MapPin, Locate, AlertCircle } from "lucide-react";
import { getBasemapOption, getPreferredBasemapId } from "@/lib/mapid";

interface MerchantMapPickerProps {
  initialCoordinates?: [number, number]; // [longitude, latitude]
  onCoordinatesChange: (coordinates: [number, number]) => void;
}

const DEFAULT_JAKARTA_COORDS: [number, number] = [106.827153, -6.175392];

export function MerchantMapPicker({
  initialCoordinates = DEFAULT_JAKARTA_COORDS,
  onCoordinatesChange,
}: MerchantMapPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const initialCoordinatesRef = useRef(initialCoordinates);
  const onCoordinatesChangeRef = useRef(onCoordinatesChange);
  const [coords, setCoords] = useState<[number, number]>(initialCoordinates);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    onCoordinatesChangeRef.current = onCoordinatesChange;
  }, [onCoordinatesChange]);

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!containerRef.current || mapRef.current) return;

      const maplibre = await import("maplibre-gl");
      maplibre.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

      const defaultBasemap = getBasemapOption(getPreferredBasemapId());

      const map = new maplibre.Map({
        container: containerRef.current,
        style: defaultBasemap.style,
        center: initialCoordinatesRef.current,
        zoom: 14,
        attributionControl: false,
      });

      map.addControl(
        new maplibre.NavigationControl({ visualizePitch: true }),
        "top-right"
      );

      map.on("load", () => {
        if (!isMounted) return;

        // Create draggable marker
        const el = document.createElement("div");
        el.className = "merchant-picker-marker";
        el.innerHTML = `
          <div style="
            width: 32px;
            height: 32px;
            background: #059669;
            border: 3px solid #ffffff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            color: white;
            cursor: grab;
          ">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
        `;

        const marker = new maplibre.Marker({ element: el, draggable: true })
          .setLngLat(initialCoordinatesRef.current)
          .addTo(map);

        marker.on("dragend", () => {
          const lngLat = marker.getLngLat();
          const newCoords: [number, number] = [
            parseFloat(lngLat.lng.toFixed(6)),
            parseFloat(lngLat.lat.toFixed(6)),
          ];
          setCoords(newCoords);
          onCoordinatesChangeRef.current(newCoords);
        });

        markerRef.current = marker;
      });

      map.on("click", (e) => {
        const newCoords: [number, number] = [
          parseFloat(e.lngLat.lng.toFixed(6)),
          parseFloat(e.lngLat.lat.toFixed(6)),
        ];
        setCoords(newCoords);
        onCoordinatesChangeRef.current(newCoords);
        if (markerRef.current) {
          markerRef.current.setLngLat(newCoords);
        }
      });

      mapRef.current = map;
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
  }, []);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Browser Anda tidak mendukung geolokasi.");
      return;
    }

    setGeoLoading(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newCoords: [number, number] = [
          parseFloat(pos.coords.longitude.toFixed(6)),
          parseFloat(pos.coords.latitude.toFixed(6)),
        ];
        setCoords(newCoords);
        onCoordinatesChange(newCoords);
        if (mapRef.current) {
          mapRef.current.flyTo({ center: newCoords, zoom: 16 });
        }
        if (markerRef.current) {
          markerRef.current.setLngLat(newCoords);
        }
        setGeoLoading(false);
      },
      (err) => {
        console.warn("[MerchantMapPicker] Geolocation error:", err);
        setGeoError("Izin lokasi ditolak atau tidak tersedia. Silakan klik pada peta.");
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
          <MapPin size={14} className="text-emerald-400" />
          Titik Lokasi Usaha (Klik peta atau geser pin)
        </label>
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={geoLoading}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-300 font-medium transition-colors disabled:opacity-50"
        >
          <Locate size={12} className={geoLoading ? "animate-spin" : ""} />
          {geoLoading ? "Mencari lokasi..." : "Gunakan Lokasi Saya"}
        </button>
      </div>

      {geoError ? (
        <div className="p-2 rounded bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-300 flex items-center gap-1.5">
          <AlertCircle size={13} className="shrink-0" />
          <span>{geoError}</span>
        </div>
      ) : null}

      <div className="relative w-full h-64 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-inner">
        <div ref={containerRef} className="w-full h-full" />
      </div>

      <div className="flex flex-col gap-1 rounded-lg border border-slate-800 bg-slate-950/60 p-2 text-[11px] leading-5 text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <span>Koordinat Terpilih:</span>
        <span className="font-mono text-slate-200 font-medium">
          Lng: {coords[0].toFixed(6)}, Lat: {coords[1].toFixed(6)}
        </span>
      </div>
    </div>
  );
}
