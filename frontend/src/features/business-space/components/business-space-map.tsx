"use client";

import { useEffect, useRef } from "react";
import type { FeatureCollection, Point } from "geojson";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { getBasemapOption, getPreferredBasemapId } from "@/lib/mapid";
import type { BusinessSpaceCandidate, BusinessSpaceCandidateDetail } from "../types/business-space.types";

const EMPTY: FeatureCollection<Point> = { type: "FeatureCollection", features: [] };

export function BusinessSpaceMap({
  candidates,
  selectedId,
  comparison,
  onSelect,
}: {
  candidates: BusinessSpaceCandidate[];
  selectedId: string | null;
  comparison: BusinessSpaceCandidateDetail[];
  onSelect: (id: string) => void;
}) {
  const container = useRef<HTMLDivElement | null>(null);
  const map = useRef<MapLibreMap | null>(null);
  const latest = useRef({ candidates, selectedId, comparison });

  useEffect(() => {
    latest.current = { candidates, selectedId, comparison };
    syncMap(map.current, latest.current);
  }, [candidates, selectedId, comparison]);

  useEffect(() => {
    let cancelled = false;
    void import("maplibre-gl").then((maplibre) => {
      if (cancelled || !container.current || map.current) return;
      maplibre.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      const first = latest.current.candidates[0];
      const instance = new maplibre.Map({
        container: container.current,
        style: getBasemapOption(getPreferredBasemapId()).style,
        center: first ? [first.longitude, first.latitude] : [106.8272, -6.1754],
        zoom: first ? 12 : 10,
      });
      instance.addControl(new maplibre.NavigationControl(), "top-right");
      instance.on("load", () => {
        if (cancelled) return;
        instance.addSource("business-space-points", { type: "geojson", data: EMPTY });
        instance.addLayer({
          id: "business-space-candidates",
          type: "circle",
          source: "business-space-points",
          paint: {
            "circle-radius": ["case", ["get", "selected"], 11, ["get", "comparison"], 9, 6],
            "circle-color": ["case", ["get", "selected"], "#22d3ee", ["get", "comparison"], "#a3e635", "#facc15"],
            "circle-stroke-color": "#071318",
            "circle-stroke-width": 2,
          },
        });
        instance.on("click", "business-space-candidates", (event) => {
          const id = event.features?.[0]?.properties?.id;
          if (typeof id === "string") onSelect(id);
        });
        map.current = instance;
        syncMap(instance, latest.current);
        container.current?.setAttribute("data-map-ready", "true");
      });
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, [onSelect]);

  return (
    <div className="business-space-map-shell">
      <div ref={container} className="business-space-map" data-candidate-count={candidates.length} />
      <div className="business-space-map-legend" aria-label="Legenda kandidat properti">
        <span><i className="bs-legend-candidate" />Kandidat</span>
        <span><i className="bs-legend-selected" />Dipilih</span>
        <span><i className="bs-legend-compare" />Comparison</span>
      </div>
    </div>
  );
}

function syncMap(map: MapLibreMap | null, state: { candidates: BusinessSpaceCandidate[]; selectedId: string | null; comparison: BusinessSpaceCandidateDetail[] }) {
  if (!map?.isStyleLoaded()) return;
  const comparisonIds = new Set(state.comparison.map((item) => item.candidate.id));
  const points: FeatureCollection<Point> = {
    type: "FeatureCollection",
    features: state.candidates.map((candidate) => ({
      type: "Feature" as const,
      id: candidate.id,
      geometry: { type: "Point" as const, coordinates: [candidate.longitude, candidate.latitude] },
      properties: {
        id: candidate.id,
        selected: candidate.id === state.selectedId,
        comparison: comparisonIds.has(candidate.id),
      },
    })),
  };
  (map.getSource("business-space-points") as GeoJSONSource | undefined)?.setData(points);
  if (points.features.length > 1) {
    const bounds = points.features.reduce((result, feature) => {
      const [longitude, latitude] = feature.geometry.coordinates;
      return {
        west: Math.min(result.west, longitude),
        south: Math.min(result.south, latitude),
        east: Math.max(result.east, longitude),
        north: Math.max(result.north, latitude),
      };
    }, {
      west: points.features[0]!.geometry.coordinates[0],
      south: points.features[0]!.geometry.coordinates[1],
      east: points.features[0]!.geometry.coordinates[0],
      north: points.features[0]!.geometry.coordinates[1],
    });
    map.fitBounds([[bounds.west, bounds.south], [bounds.east, bounds.north]], { padding: 56, maxZoom: 13, duration: 350 });
  }
}
