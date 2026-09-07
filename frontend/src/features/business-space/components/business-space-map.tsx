"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { getBasemapOption, getPreferredBasemapId } from "@/lib/mapid";
import type { BusinessSpaceCandidate, BusinessSpaceCandidateDetail, BusinessSpaceViewport } from "../types/business-space.types";
import { PROPERTY_LAYER_ID, PROPERTY_SOURCE_ID, subscribePropertyViewport, syncBusinessSpaceMap } from "../utils/property-map";

export function BusinessSpaceMap({
  candidates,
  selectedId,
  comparison,
  onSelect,
  onViewportChange,
}: {
  candidates: BusinessSpaceCandidate[];
  selectedId: string | null;
  comparison: BusinessSpaceCandidateDetail[];
  onSelect: (id: string) => void;
  onViewportChange: (viewport: BusinessSpaceViewport) => void;
}) {
  const container = useRef<HTMLDivElement | null>(null);
  const map = useRef<MapLibreMap | null>(null);
  const latest = useRef({ candidates, selectedId, comparison, onSelect, onViewportChange });
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    latest.current = { candidates, selectedId, comparison, onSelect, onViewportChange };
    syncBusinessSpaceMap(map.current, latest.current);
  }, [candidates, selectedId, comparison, onSelect, onViewportChange]);

  useEffect(() => {
    let cancelled = false;
    let instance: MapLibreMap | null = null;
    let observer: ResizeObserver | null = null;
    let unsubscribeViewport: (() => void) | undefined;

    void import("maplibre-gl").then((maplibre) => {
      if (cancelled || !container.current) return;
      maplibre.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      const created = new maplibre.Map({
        container: container.current,
        style: getBasemapOption(getPreferredBasemapId()).style,
        center: [106.8272, -6.1754],
        zoom: 11,
        renderWorldCopies: false,
      });
      // Keep the instance before load so route changes also clean up a still-loading map.
      instance = created;
      map.current = created;
      created.addControl(new maplibre.NavigationControl(), "top-right");
      created.on("error", () => {
        if (!cancelled) setMapError("Sebagian peta belum dapat dimuat. Periksa koneksi lalu muat ulang halaman.");
      });
      created.on("load", () => {
        if (cancelled) return;
        setMapError(null);
        created.addSource(PROPERTY_SOURCE_ID, {
          type: "geojson", data: { type: "FeatureCollection", features: [] },
        });
        created.addLayer({
          id: PROPERTY_LAYER_ID,
          type: "circle",
          source: PROPERTY_SOURCE_ID,
          paint: {
            "circle-radius": ["case", ["get", "selected"], 12, ["get", "comparison"], 10, 7],
            "circle-color": ["case", ["get", "selected"], "#22d3ee", ["get", "comparison"], "#a3e635", "#facc15"],
            "circle-stroke-color": "#071318",
            "circle-stroke-width": 2,
          },
        });
        created.on("click", PROPERTY_LAYER_ID, (event) => {
          const id = event.features?.[0]?.properties?.id;
          if (typeof id === "string") latest.current.onSelect(id);
        });
        created.on("mouseenter", PROPERTY_LAYER_ID, () => { created.getCanvas().style.cursor = "pointer"; });
        created.on("mouseleave", PROPERTY_LAYER_ID, () => { created.getCanvas().style.cursor = ""; });
        syncBusinessSpaceMap(created, latest.current);
        unsubscribeViewport = subscribePropertyViewport(created, (bounds) => latest.current.onViewportChange(bounds));
        container.current?.setAttribute("data-map-ready", "true");
      });
      if (typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(() => { if (!cancelled) created.resize(); });
        observer.observe(container.current);
      }
    }).catch(() => {
      if (!cancelled) setMapError("Peta belum dapat dibuka di browser ini. Muat ulang halaman untuk mencoba lagi.");
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
      unsubscribeViewport?.();
      instance?.remove();
      if (map.current === instance) map.current = null;
    };
  }, []);

  return (
    <div className="business-space-map-shell">
      <div ref={container} className="business-space-map" data-candidate-count={candidates.length}
        role="region" aria-label="Peta Properti Go. Geser atau perbesar peta untuk melihat properti di area tersebut." />
      {mapError ? <p className="business-space-map-error" role="alert">{mapError}</p> : null}
      <div className="business-space-map-legend" aria-label="Legenda properti">
        <span><i className="bs-legend-candidate" />Properti Go</span>
        <span><i className="bs-legend-selected" />Dipilih</span>
        <span><i className="bs-legend-compare" />Dibandingkan</span>
      </div>
    </div>
  );
}
