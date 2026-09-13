"use client";

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import {
  Accessibility,
  Footprints,
  MapPin,
  Navigation,
  TrainFront,
} from "lucide-react";
import { getBasemapOption, getPreferredBasemapId } from "@/lib/mapid";
import type { useUmkmIntelligence } from "@/src/features/umkm-intelligence/hooks/use-umkm-intelligence";

export interface ProfileLocationCardProps {
  address: string | null;
  coordinates: [number, number] | null; // [lng, lat]
  intelligence: ReturnType<typeof useUmkmIntelligence>;
  merchantName: string;
}

export function ProfileLocationCard({
  address,
  coordinates,
  intelligence,
  merchantName,
}: ProfileLocationCardProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);

  const nearestTransit = intelligence.data?.location_context?.nearest_transit;
  const transitWalkingMinutes = nearestTransit
    ? Math.ceil(nearestTransit.network_walking_seconds / 60)
    : null;

  useEffect(() => {
    if (!coordinates || !mapContainerRef.current) return;
    let cancelled = false;

    void import("maplibre-gl").then((maplibre) => {
      if (cancelled || !mapContainerRef.current || mapInstanceRef.current) return;

      maplibre.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      const [lng, lat] = coordinates;

      const map = new maplibre.Map({
        container: mapContainerRef.current,
        style: getBasemapOption(getPreferredBasemapId()).style,
        center: [lng, lat],
        zoom: 15,
        attributionControl: false,
      });

      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");

      map.on("load", () => {
        if (cancelled) return;

        // Add canonical merchant pin
        const el = document.createElement("div");
        el.className = "flex items-center justify-center";
        el.innerHTML = `
          <div style="background-color: #0284c7; color: white; border-radius: 9999px; padding: 6px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1); border: 2px solid white;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        `;

        new maplibre.Marker({ element: el })
          .setLngLat([lng, lat])
          .setPopup(
            new maplibre.Popup({ offset: 25 }).setHTML(
              `<strong style="font-size: 12px; color: #0f172a;">${merchantName}</strong>`
            )
          )
          .addTo(map);

        mapInstanceRef.current = map;
      });
    });

    return () => {
      cancelled = true;
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, [coordinates, merchantName]);

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all sm:p-7">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-100 bg-sky-50 text-sky-600">
            <Navigation size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Geolokasi Publik
            </span>
            <h2 className="text-base font-bold text-slate-900">
              Lokasi &amp; Transit
            </h2>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
          GPS Aktif
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {/* Full Address */}
        <div>
          <p className="text-xs font-bold leading-5 text-slate-800">
            {address || "Alamat lokasi terdaftar pada sistem GETRA"}
          </p>
          {nearestTransit ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-sky-700 font-semibold">
              <TrainFront size={13} className="text-sky-600" />
              <span>
                {nearestTransit.network_distance_meters} meter dari {nearestTransit.name}
              </span>
            </p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">
              Data akses transit koridor pejalan kaki terhubung
            </p>
          )}
        </div>

        {/* Map Preview Container */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 shadow-inner">
          {coordinates ? (
            <div
              ref={mapContainerRef}
              className="h-48 w-full bg-slate-100"
              style={{ minHeight: "190px" }}
            />
          ) : (
            <div className="flex h-48 w-full flex-col items-center justify-center bg-slate-50 text-slate-400">
              <MapPin size={28} />
              <span className="mt-2 text-xs font-semibold text-slate-500">
                Titik lokasi belum tersedia
              </span>
            </div>
          )}

          {/* Transit Walking Badge Overlay */}
          {nearestTransit && transitWalkingMinutes !== null ? (
            <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1.5 rounded-xl bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-800 shadow-sm backdrop-blur-md">
              <Footprints size={14} className="text-sky-600" />
              <span>
                {transitWalkingMinutes} menit jalan kaki dari transit
              </span>
            </div>
          ) : null}
        </div>

        {/* Coordinates Truth */}
        {coordinates ? (
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span>
              Koordinat: {coordinates[1].toFixed(5)}, {coordinates[0].toFixed(5)}
            </span>
            <span className="font-medium text-slate-400">Tersinkronisasi Peta</span>
          </div>
        ) : null}

        {/* Accessibility & Transit Chips */}
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
            <Accessibility size={13} className="text-sky-600" />
            Akses Kursi Roda
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
            <Footprints size={13} className="text-emerald-600" />
            Trotoar Ramah Pejalan
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
            <TrainFront size={13} className="text-indigo-600" />
            Jalur Akses Transit
          </span>
        </div>
      </div>
    </div>
  );
}
