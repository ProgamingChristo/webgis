"use client";

import { useEffect, useRef, useState } from "react";
import {
  Map as MapLibreMap,
  setWorkerUrl,
} from "maplibre-gl";

import {
  LANDING_MAP_FIXTURE,
  toPointFeatureCollection,
} from "../utils/landing-map.utils";
import { getBasemapOption, getDefaultBasemapId } from "../../../../lib/mapid";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

function addLandingLayers(map: MapLibreMap) {
  const fixture = LANDING_MAP_FIXTURE;

  map.addSource("landing-service-area", {
    type: "geojson",
    data: fixture.serviceArea,
  });
  map.addSource("landing-corridor", {
    type: "geojson",
    data: fixture.corridor,
  });
  map.addSource("landing-route", {
    type: "geojson",
    data: fixture.route,
  });
  map.addSource("landing-points", {
    type: "geojson",
    data: toPointFeatureCollection(fixture),
  });

  map.addLayer({
    id: "landing-service-area-fill",
    type: "fill",
    source: "landing-service-area",
    paint: {
      "fill-color": "#7ad43b",
      "fill-opacity": 0.16,
    },
  });

  map.addLayer({
    id: "landing-service-area-line",
    type: "line",
    source: "landing-service-area",
    paint: {
      "line-color": "#7ad43b",
      "line-width": 2.2,
      "line-dasharray": [1.5, 1.5],
    },
  });

  map.addLayer({
    id: "landing-corridor-line",
    type: "line",
    source: "landing-corridor",
    paint: {
      "line-color": "#2878c7",
      "line-width": 4,
      "line-opacity": 0.78,
    },
  });

  map.addLayer({
    id: "landing-route-casing",
    type: "line",
    source: "landing-route",
    paint: {
      "line-color": "#07111f",
      "line-width": 7,
      "line-opacity": 0.72,
    },
  });

  map.addLayer({
    id: "landing-route-line",
    type: "line",
    source: "landing-route",
    paint: {
      "line-color": "#29c7d8",
      "line-width": 3.2,
      "line-dasharray": [1.2, 1.1],
    },
  });

  map.addLayer({
    id: "landing-points-circle",
    type: "circle",
    source: "landing-points",
    paint: {
      "circle-color": [
        "match",
        ["get", "kind"],
        "transit",
        "#29c7d8",
        "hidden-gem",
        "#7ad43b",
        "sponsored",
        "#f7c948",
        "#7ad43b",
      ],
      "circle-radius": [
        "match",
        ["get", "kind"],
        "transit",
        8,
        6,
      ],
      "circle-stroke-color": "#07111f",
      "circle-stroke-width": 3,
    },
  });
}

export function WebgisHeroMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    let disposed = false;

    try {
      const basemap = getBasemapOption(getDefaultBasemapId());
      const map = new MapLibreMap({
        container: containerRef.current,
        style: basemap.style,
        center: LANDING_MAP_FIXTURE.center,
        zoom: 13.2,
        pitch: 36,
        bearing: -18,
        interactive: false,
        attributionControl: false,
      });

      mapRef.current = map;

      map.once("load", () => {
        if (disposed) {
          return;
        }

        try {
          addLandingLayers(map);
          setMapReady(true);
        } catch {
          setMapError("Layer WebGIS landing belum bisa dimuat.");
        }
      });

      map.once("error", () => {
        if (!disposed) {
          setMapError("Basemap tidak tersedia. Menampilkan fallback WebGIS.");
        }
      });
    } catch {
      queueMicrotask(() => {
        if (!disposed) {
          setMapError("WebGL tidak tersedia. Menampilkan fallback WebGIS.");
        }
      });
    }

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <figure
      className="relative min-h-[420px] overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-2xl shadow-cyan-950/30"
      aria-label="Ilustrasi WebGIS GETRA: transit node, rute pedestrian, service area, dan titik UMKM"
    >
      <div
        className="absolute inset-0 bg-[linear-gradient(rgba(41,199,216,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(41,199,216,0.08)_1px,transparent_1px)] bg-[size:32px_32px]"
        aria-hidden="true"
      />

      <div
        ref={containerRef}
        className={`absolute inset-0 transition-opacity duration-700 ${mapReady && !mapError ? "opacity-95" : "opacity-0"}`}
      />

      <svg
        className="pointer-events-none absolute inset-0 z-10 h-full w-full opacity-80 mix-blend-screen"
        viewBox="0 0 640 420"
        aria-hidden="true"
      >
        <path
          className="getra-route-draw"
          d="M 205 205 C 260 230, 315 264, 374 318"
          fill="none"
          stroke="#29c7d8"
          strokeLinecap="round"
          strokeWidth="4"
        />
        <circle className="getra-marker-pulse" cx="205" cy="205" r="7" fill="#29c7d8" />
        <circle className="getra-marker-pulse getra-marker-pulse--green" cx="374" cy="318" r="7" fill="#7ad43b" />
      </svg>

      {mapError ? (
        <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_36%,rgba(41,199,216,0.18),transparent_30%),linear-gradient(135deg,rgba(122,212,59,0.12),transparent_44%)] p-8 text-center">
          <div className="max-w-xs rounded-3xl border border-getra-cyan/25 bg-slate-950/78 p-5">
            <strong className="text-sm text-white">
              Fallback WebGIS aktif
            </strong>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              {mapError} Hero tetap menjelaskan konsep GETRA tanpa memuat data privat.
            </p>
          </div>
        </div>
      ) : null}

      <div className="absolute left-4 top-4 rounded-2xl border border-white/10 bg-slate-950/82 px-4 py-3 backdrop-blur">
        <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-getra-green">
          WebGIS Hero
        </span>
        <strong className="mt-1 block text-sm text-white">
          Illustrative landing map
        </strong>
      </div>

      <div className="absolute bottom-4 left-4 right-4 grid gap-2 rounded-2xl border border-white/10 bg-slate-950/84 p-3 backdrop-blur sm:grid-cols-3">
        {["Transit node", "Pedestrian route", "Service area"].map((label) => (
          <span
            key={label}
            className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-300"
          >
            {label}
          </span>
        ))}
      </div>

      <figcaption className="sr-only">
        Ilustrasi peta landing memakai data demonstrasi deterministik, bukan data merchant produksi.
      </figcaption>
    </figure>
  );
}
