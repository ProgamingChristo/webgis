"use client";

import { useEffect, useRef } from "react";
import type { FeatureCollection, MultiPolygon, Point } from "geojson";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { getBasemapOption, getPreferredBasemapId } from "@/lib/mapid";
import type { UmkmIntelligenceResult } from "../types/umkm-intelligence.types";

const EMPTY_POINTS: FeatureCollection<Point> = { type: "FeatureCollection", features: [] };
const EMPTY_REGIONS: FeatureCollection<MultiPolygon> = { type: "FeatureCollection", features: [] };

export function UmkmIntelligenceMap({ data }: { data: UmkmIntelligenceResult }) {
  const container = useRef<HTMLDivElement | null>(null);
  const map = useRef<MapLibreMap | null>(null);
  const latest = useRef(data);

  useEffect(() => { latest.current = data; syncMap(map.current, data); }, [data]);
  useEffect(() => {
    let cancelled = false;
    void import("maplibre-gl").then((maplibre) => {
      if (cancelled || !container.current || map.current) return;
      maplibre.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      const instance = new maplibre.Map({
        container: container.current,
        style: getBasemapOption(getPreferredBasemapId()).style,
        center: [latest.current.merchant.longitude, latest.current.merchant.latitude],
        zoom: 13,
      });
      instance.addControl(new maplibre.NavigationControl(), "top-right");
      instance.on("load", () => {
        if (cancelled) return;
        instance.addSource("umkm-intelligence-region", { type: "geojson", data: EMPTY_REGIONS });
        instance.addSource("umkm-intelligence-points", { type: "geojson", data: EMPTY_POINTS });
        instance.addLayer({
          id: "umkm-intelligence-region-fill", type: "fill", source: "umkm-intelligence-region",
          paint: { "fill-color": "#0891b2", "fill-opacity": 0.13 },
        });
        instance.addLayer({
          id: "umkm-intelligence-region-line", type: "line", source: "umkm-intelligence-region",
          paint: { "line-color": "#22d3ee", "line-width": 1.5 },
        });
        instance.addLayer({
          id: "umkm-intelligence-similar", type: "circle", source: "umkm-intelligence-points",
          filter: ["==", ["get", "kind"], "SIMILAR"],
          paint: { "circle-radius": 5, "circle-color": "#facc15", "circle-stroke-color": "#422006", "circle-stroke-width": 1.5 },
        });
        instance.addLayer({
          id: "umkm-intelligence-transit", type: "circle", source: "umkm-intelligence-points",
          filter: ["==", ["get", "kind"], "TRANSIT"],
          paint: { "circle-radius": 6, "circle-color": "#38bdf8", "circle-stroke-color": "#082f49", "circle-stroke-width": 2 },
        });
        instance.addLayer({
          id: "umkm-intelligence-owned", type: "circle", source: "umkm-intelligence-points",
          filter: ["==", ["get", "kind"], "OWNED"],
          paint: { "circle-radius": 9, "circle-color": "#84cc16", "circle-stroke-color": "#ffffff", "circle-stroke-width": 3 },
        });
        map.current = instance;
        syncMap(instance, latest.current);
        container.current?.setAttribute("data-map-ready", "true");
      });
    });
    return () => { cancelled = true; map.current?.remove(); map.current = null; };
  }, []);

  return <div className="umkm-intelligence-map-shell">
    <div
      ref={container}
      className="umkm-intelligence-map"
      data-owned-merchant-count="1"
      data-similar-merchant-count={data.nearby_similar_merchants.length}
      data-transit-count={data.location_context.nearest_transit ? 1 : 0}
    />
    <div className="umkm-intelligence-map-legend" aria-label="Legenda peta usaha">
      <span><i className="legend-owned" />Usaha Anda</span>
      <span><i className="legend-similar" />Usaha sejenis</span>
      <span><i className="legend-transit" />Transportasi umum yang dapat dicapai berjalan kaki</span>
    </div>
  </div>;
}

function syncMap(map: MapLibreMap | null, data: UmkmIntelligenceResult) {
  if (!map?.isStyleLoaded()) return;
  const regionData: FeatureCollection<MultiPolygon> = data.market_context.area ? {
    type: "FeatureCollection",
    features: [{ type: "Feature", geometry: data.market_context.area.geometry, properties: { name: data.market_context.area.name } }],
  } : EMPTY_REGIONS;
  const points: FeatureCollection<Point> = {
    type: "FeatureCollection",
    features: [
      { type: "Feature", geometry: { type: "Point", coordinates: [data.merchant.longitude, data.merchant.latitude] }, properties: { kind: "OWNED", name: data.merchant.name } },
      ...data.nearby_similar_merchants.map((merchant) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [merchant.longitude, merchant.latitude] },
        properties: { kind: "SIMILAR", name: merchant.name },
      })),
      ...(data.location_context.nearest_transit ? [{
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [data.location_context.nearest_transit.longitude, data.location_context.nearest_transit.latitude] },
        properties: { kind: "TRANSIT", name: data.location_context.nearest_transit.name },
      }] : []),
    ],
  };
  (map.getSource("umkm-intelligence-region") as GeoJSONSource | undefined)?.setData(regionData);
  (map.getSource("umkm-intelligence-points") as GeoJSONSource | undefined)?.setData(points);
  const coordinates = points.features.map((feature) => feature.geometry.coordinates as [number, number]);
  if (coordinates.length > 1) {
    const bounds = coordinates.reduce((result, [longitude, latitude]) => ({
      west: Math.min(result.west, longitude), south: Math.min(result.south, latitude),
      east: Math.max(result.east, longitude), north: Math.max(result.north, latitude),
    }), { west: coordinates[0]![0], south: coordinates[0]![1], east: coordinates[0]![0], north: coordinates[0]![1] });
    map.fitBounds([[bounds.west, bounds.south], [bounds.east, bounds.north]], { padding: 54, maxZoom: 14, duration: 400 });
  } else map.flyTo({ center: coordinates[0], zoom: 14, duration: 400 });
}
