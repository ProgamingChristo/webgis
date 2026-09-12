"use client";

import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, setWorkerUrl } from "maplibre-gl";

import { getBasemapOption, getPreferredBasemapId } from "../../../../lib/mapid";
import { LANDING_MAP_FIXTURE, toPointFeatureCollection } from "../utils/landing-map.utils";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

function addLandingLayers(map: MapLibreMap) {
  const fixture = LANDING_MAP_FIXTURE;
  map.addSource("landing-service-area", { type: "geojson", data: fixture.serviceArea });
  map.addSource("landing-corridor", { type: "geojson", data: fixture.corridor });
  map.addSource("landing-route", { type: "geojson", data: fixture.route });
  map.addSource("landing-points", { type: "geojson", data: toPointFeatureCollection(fixture) });
  map.addLayer({ id: "landing-service-area-fill", type: "fill", source: "landing-service-area", paint: { "fill-color": "#7cd5c7", "fill-opacity": 0.16 } });
  map.addLayer({ id: "landing-service-area-line", type: "line", source: "landing-service-area", paint: { "line-color": "#7cd5c7", "line-width": 2.2, "line-dasharray": [1.5, 1.5] } });
  map.addLayer({ id: "landing-corridor-line", type: "line", source: "landing-corridor", paint: { "line-color": "#118ab2", "line-width": 4, "line-opacity": 0.78 } });
  map.addLayer({ id: "landing-route-casing", type: "line", source: "landing-route", paint: { "line-color": "#ffffff", "line-width": 7, "line-opacity": 0.72 } });
  map.addLayer({ id: "landing-route-line", type: "line", source: "landing-route", paint: { "line-color": "#118ab2", "line-width": 3.2, "line-dasharray": [1.2, 1.1] } });
  map.addLayer({
    id: "landing-points-circle", type: "circle", source: "landing-points",
    paint: {
      "circle-color": ["match", ["get", "kind"], "transit", "#118ab2", "hidden-gem", "#7cd5c7", "sponsored", "#118ab2", "#7cd5c7"],
      "circle-radius": ["match", ["get", "kind"], "transit", 8, 6],
      "circle-stroke-color": "#ffffff", "circle-stroke-width": 3,
    },
  });
}

export function WebgisHeroMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let disposed = false;
    try {
      const map = new MapLibreMap({
        container: containerRef.current,
        style: getBasemapOption(getPreferredBasemapId()).style,
        center: LANDING_MAP_FIXTURE.center,
        zoom: 13.2,
        pitch: 36,
        bearing: -18,
        interactive: false,
        attributionControl: false,
      });
      mapRef.current = map;
      map.once("load", () => {
        if (disposed) return;
        try { addLandingLayers(map); setMapReady(true); } catch { /* hero remains visually safe without demo layers */ }
      });
    } catch { /* WebGL fallback intentionally leaves the white hero background visible */ }
    return () => { disposed = true; mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  return (
    <figure className="relative size-full min-h-[420px] overflow-hidden bg-white" aria-label="Visual peta GETRA pada landing page">
      <div ref={containerRef} className={`absolute inset-0 transition-opacity duration-300 ${mapReady ? "opacity-100" : "opacity-0"}`} />
      <figcaption className="sr-only">Visual peta ilustratif untuk hero landing GETRA.</figcaption>
    </figure>
  );
}
