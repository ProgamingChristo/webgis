"use client";

import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, setWorkerUrl } from "maplibre-gl";

import { getBasemapOption, getPreferredBasemapId } from "../../../../lib/mapid";
import { LandingMapArtwork } from "./landing-map-artwork";
import {
  LANDING_MAP_FIXTURE,
  toPointFeatureCollection,
} from "../utils/landing-map.utils";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

type WebgisHeroMapProps = {
  className?: string;
};

function addLandingLayers(map: MapLibreMap) {
  const fixture = LANDING_MAP_FIXTURE;

  map.addSource("landing-service-area", { type: "geojson", data: fixture.serviceArea });
  map.addSource("landing-corridor", { type: "geojson", data: fixture.corridor });
  map.addSource("landing-route", { type: "geojson", data: fixture.route });
  map.addSource("landing-points", {
    type: "geojson",
    data: toPointFeatureCollection(fixture),
  });

  map.addLayer({
    id: "landing-service-area-fill",
    type: "fill",
    source: "landing-service-area",
    paint: { "fill-color": "#62d6c8", "fill-opacity": 0.18 },
  });
  map.addLayer({
    id: "landing-service-area-line",
    type: "line",
    source: "landing-service-area",
    paint: {
      "line-color": "#367e77",
      "line-width": 2.2,
      "line-dasharray": [1.5, 1.5],
    },
  });
  map.addLayer({
    id: "landing-corridor-line",
    type: "line",
    source: "landing-corridor",
    paint: { "line-color": "#f3bd3b", "line-width": 4, "line-opacity": 0.9 },
  });
  map.addLayer({
    id: "landing-route-casing",
    type: "line",
    source: "landing-route",
    paint: { "line-color": "#ffffff", "line-width": 8, "line-opacity": 0.92 },
  });
  map.addLayer({
    id: "landing-route-line",
    type: "line",
    source: "landing-route",
    paint: {
      "line-color": "#118ab2",
      "line-width": 3.4,
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
        "#118ab2",
        "hidden-gem",
        "#367e77",
        "sponsored",
        "#d8a519",
        "#367e77",
      ],
      "circle-radius": ["match", ["get", "kind"], "transit", 8, 6],
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 3,
    },
  });
}

export function WebgisHeroMap({ className = "" }: WebgisHeroMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let disposed = false;
    let loaded = false;

    try {
      const map = new MapLibreMap({
        container: containerRef.current,
        // The surrounding onboarding card is deliberately light, while the
        // map itself honors the visitor's persisted basemap choice just like
        // every other GETRA MapLibre surface.
        style: getBasemapOption(getPreferredBasemapId()).style,
        center: LANDING_MAP_FIXTURE.center,
        zoom: 13.2,
        pitch: 28,
        bearing: -18,
        interactive: false,
        attributionControl: false,
      });

      mapRef.current = map;
      map.once("load", () => {
        if (disposed) return;
        try {
          addLandingLayers(map);
          loaded = true;
          setMapReady(true);
        } catch {
          setMapError(true);
        }
      });
      map.once("error", () => {
        if (!disposed && !loaded) setMapError(true);
      });
    } catch {
      queueMicrotask(() => {
        if (!disposed) setMapError(true);
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
      className={`getra-onboarding-map ${className}`.trim()}
      aria-label="Peta onboarding GETRA dengan transit, rute pejalan kaki, jangkauan, dan usaha lokal"
    >
      <LandingMapArtwork className="getra-onboarding-map__fallback" />
      <div
        ref={containerRef}
        className={`getra-onboarding-map__canvas ${mapReady && !mapError ? "getra-onboarding-map__canvas--ready" : ""}`}
        aria-hidden="true"
      />

      <div className="getra-onboarding-map__caption">
        <span>Peta onboarding GETRA</span>
        <strong>{mapReady && !mapError ? "Transit, rute, dan usaha lokal" : "Peta ilustratif berbasis data contoh"}</strong>
      </div>
      <div className="getra-onboarding-map__legend" aria-hidden="true">
        <span><i className="getra-onboarding-map__legend-dot getra-onboarding-map__legend-dot--transit" />Transit</span>
        <span><i className="getra-onboarding-map__legend-line" />Rute jalan kaki</span>
      </div>
      <figcaption className="sr-only">
        Peta ini memakai data contoh dan tidak memakai lokasi pribadi atau data usaha produksi.
      </figcaption>
    </figure>
  );
}
