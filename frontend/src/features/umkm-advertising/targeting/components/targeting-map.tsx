"use client";

import React, { useEffect, useRef } from "react";
import type { GeoJSONSource, Map as MapLibreMap, Marker } from "maplibre-gl";
import { GeoJSONFeature, TargetType } from "../types/targeting.types";
import { getBasemapOption, getDefaultBasemapId } from "@/lib/mapid";

interface TargetingMapProps {
  merchantLocation: { longitude: number; latitude: number } | null;
  previewGeoJSON: GeoJSONFeature | null;
  targetType: TargetType;
  radiusMeters?: number;
}

export function TargetingMap({
  merchantLocation,
  previewGeoJSON,
  targetType,
}: TargetingMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const initialMerchantLocationRef = useRef(merchantLocation);
  const initialPreviewGeoJSONRef = useRef(previewGeoJSON);

  // Initialize Map
  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current || mapRef.current) return;

      const initialMerchantLocation = initialMerchantLocationRef.current;
      const initialPreviewGeoJSON = initialPreviewGeoJSONRef.current;

      const maplibre = await import("maplibre-gl");
      if (cancelled || !containerRef.current) return;

      maplibre.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

      const defaultCenter: [number, number] = initialMerchantLocation
        ? [initialMerchantLocation.longitude, initialMerchantLocation.latitude]
        : [106.827153, -6.175392]; // Jakarta default

      const map = new maplibre.Map({
        container: containerRef.current,
        style: getBasemapOption(getDefaultBasemapId()).style,
        center: defaultCenter,
        zoom: initialMerchantLocation ? 14 : 11,
      });

      map.addControl(
        new maplibre.NavigationControl({ visualizePitch: true }),
        "top-right"
      );

      map.on("load", () => {
        if (cancelled) return;

        // Add source for targeting preview polygon
        map.addSource("targeting-preview-source", {
          type: "geojson",
          data: initialPreviewGeoJSON || {
            type: "FeatureCollection",
            features: [],
          },
        });

        // Add fill layer
        map.addLayer({
          id: "targeting-preview-fill",
          type: "fill",
          source: "targeting-preview-source",
          paint: {
            "fill-color": "#10b981",
            "fill-opacity": 0.25,
          },
        });

        // Add line layer
        map.addLayer({
          id: "targeting-preview-stroke",
          type: "line",
          source: "targeting-preview-source",
          paint: {
            "line-color": "#059669",
            "line-width": 2.5,
            "line-dasharray": [2, 2],
          },
        });
      });

      if (initialMerchantLocation) {
        markerRef.current = new maplibre.Marker({ color: "#059669" })
          .setLngLat([
            initialMerchantLocation.longitude,
            initialMerchantLocation.latitude,
          ])
          .addTo(map);
      }

      mapRef.current = map;
    }

    void init();

    return () => {
      cancelled = true;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Marker
  useEffect(() => {
    if (!mapRef.current) return;
    if (merchantLocation) {
      if (markerRef.current) {
        markerRef.current.setLngLat([merchantLocation.longitude, merchantLocation.latitude]);
      } else {
        import("maplibre-gl").then((maplibre) => {
          if (!mapRef.current) return;
          markerRef.current = new maplibre.Marker({ color: "#059669" })
            .setLngLat([merchantLocation.longitude, merchantLocation.latitude])
            .addTo(mapRef.current);
        });
      }
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, [merchantLocation]);

  // Update GeoJSON & FitBounds
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource("targeting-preview-source") as
      | GeoJSONSource
      | undefined;
    if (source && previewGeoJSON) {
      source.setData(previewGeoJSON);
    } else if (source) {
      source.setData({
        type: "FeatureCollection",
        features: [],
      });
    }

    // Safe fitBounds calculation
    if (previewGeoJSON && previewGeoJSON.geometry) {
      const coords = extractCoordinates(previewGeoJSON.geometry);
      if (coords.length > 0) {
        let minLng = coords[0][0];
        let maxLng = coords[0][0];
        let minLat = coords[0][1];
        let maxLat = coords[0][1];

        for (const [lng, lat] of coords) {
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        }

        map.fitBounds(
          [
            [minLng, minLat],
            [maxLng, maxLat],
          ],
          { padding: 40, maxZoom: 16, duration: 600 }
        );
      }
    } else if (merchantLocation) {
      map.flyTo({
        center: [merchantLocation.longitude, merchantLocation.latitude],
        zoom: 14,
        duration: 600,
      });
    }
  }, [previewGeoJSON, merchantLocation]);

  return (
    <div className="relative w-full h-[360px] rounded-lg overflow-hidden border border-gray-200 shadow-inner bg-gray-100">
      <div ref={containerRef} className="w-full h-full" />

      {/* Map Legend */}
      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-2 rounded shadow text-xs space-y-1 z-10 border border-gray-100">
        <div className="font-semibold text-gray-700 mb-1">Legenda Target Area</div>
        {merchantLocation && (
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
            <span className="text-gray-600">Lokasi Outlet Merchant</span>
          </div>
        )}
        <div className="flex items-center space-x-2">
          <span className="w-3.5 h-2 bg-emerald-500/30 border border-emerald-600 border-dashed inline-block rounded-sm" />
          <span className="text-gray-600">
            {targetType === "RADIUS" ? "Radius Jangkauan Promosi" : "Zona Wilayah Studi"}
          </span>
        </div>
      </div>
    </div>
  );
}

function extractCoordinates(geometry: GeoJSON.Geometry): [number, number][] {
  const coords: [number, number][] = [];

  function flatten(arr: unknown) {
    if (
      Array.isArray(arr) &&
      arr.length >= 2 &&
      typeof arr[0] === "number" &&
      typeof arr[1] === "number"
    ) {
      coords.push([arr[0], arr[1]]);
      return;
    }
    if (Array.isArray(arr)) {
      for (const item of arr) {
        flatten(item);
      }
    }
  }

  if (geometry.type === "GeometryCollection") {
    for (const childGeometry of geometry.geometries) {
      coords.push(...extractCoordinates(childGeometry));
    }
  } else {
    flatten(geometry.coordinates);
  }

  return coords;
}
