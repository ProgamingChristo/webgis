"use client";

import { MapPinned, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";

import { getBasemapOption, getDefaultBasemapId } from "../../../../lib/mapid";
import { getCommunityContributionMapFeatures } from "../api/community-contributions.api";
import {
  CONTRIBUTION_REPORT_LABELS,
  DEFAULT_CONTRIBUTION_LOCATION,
} from "../constants";
import type {
  CommunityContributionMapBounds,
  CommunityContributionMapFeature,
} from "../types/community-contributions.types";
import styles from "./community-contributions.module.css";

const MAX_BBOX_SPAN_DEGREES = 2;

function getVisibleBounds(map: MapLibreMap): CommunityContributionMapBounds {
  const bounds = map.getBounds();

  return {
    minLng: bounds.getWest(),
    minLat: bounds.getSouth(),
    maxLng: bounds.getEast(),
    maxLat: bounds.getNorth(),
  };
}

function isSupportedBounds(bounds: CommunityContributionMapBounds) {
  return (
    bounds.minLng >= -180 &&
    bounds.maxLng <= 180 &&
    bounds.minLat >= -90 &&
    bounds.maxLat <= 90 &&
    bounds.minLng < bounds.maxLng &&
    bounds.minLat < bounds.maxLat &&
    bounds.maxLng - bounds.minLng <= MAX_BBOX_SPAN_DEGREES &&
    bounds.maxLat - bounds.minLat <= MAX_BBOX_SPAN_DEGREES
  );
}

function createPopupNode(feature: CommunityContributionMapFeature) {
  const wrapper = document.createElement("div");
  wrapper.className = styles.mapPopup;

  const title = document.createElement("strong");
  title.textContent = CONTRIBUTION_REPORT_LABELS[feature.reportType];

  const meta = document.createElement("span");
  meta.textContent = feature.targetName
    ? `${feature.targetName} - ${feature.projectionSource}`
    : feature.projectionSource;

  wrapper.append(title, meta);
  return wrapper;
}

export function CommunityContributionMapLayer() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [features, setFeatures] = useState<CommunityContributionMapFeature[]>([]);
  const [status, setStatus] = useState("Memuat peta kontribusi diterima...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    async function refreshFeatures(map: MapLibreMap) {
      const bounds = getVisibleBounds(map);

      if (!isSupportedBounds(bounds)) {
        setStatus("Perbesar peta untuk memuat kontribusi diterima.");
        setFeatures([]);
        return;
      }

      setStatus("Memuat kontribusi diterima di area peta...");
      setError(null);

      try {
        const nextFeatures = await getCommunityContributionMapFeatures(bounds);

        if (!cancelled) {
          setFeatures(nextFeatures);
          setStatus(
            nextFeatures.length === 0
              ? "Belum ada kontribusi diterima di area peta ini."
              : `${nextFeatures.length} kontribusi diterima ditampilkan.`,
          );
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Peta kontribusi gagal dimuat.",
          );
          setStatus("Peta kontribusi belum tersedia.");
        }
      }
    }

    async function initializeMap() {
      if (!containerRef.current || mapRef.current) {
        return;
      }

      try {
        const maplibre = await import("maplibre-gl");

        if (cancelled || !containerRef.current) {
          return;
        }

        maplibre.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

        const map = new maplibre.Map({
          container: containerRef.current,
          style: getBasemapOption(getDefaultBasemapId()).style,
          center: [
            DEFAULT_CONTRIBUTION_LOCATION.longitude,
            DEFAULT_CONTRIBUTION_LOCATION.latitude,
          ],
          zoom: 12,
          attributionControl: false,
        });

        map.addControl(
          new maplibre.NavigationControl({
            visualizePitch: true,
          }),
          "top-right",
        );

        map.on("load", () => {
          void refreshFeatures(map);
        });

        map.on("moveend", () => {
          if (refreshTimer) {
            clearTimeout(refreshTimer);
          }

          refreshTimer = setTimeout(() => {
            void refreshFeatures(map);
          }, 250);
        });

        map.on("error", () => {
          setError("Peta kontribusi gagal dimuat.");
        });

        mapRef.current = map;
      } catch {
        if (!cancelled) {
          setError("Peta kontribusi gagal dimuat.");
          setStatus("Peta kontribusi belum tersedia.");
        }
      }
    }

    void initializeMap();

    return () => {
      cancelled = true;
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    let cancelled = false;

    async function renderMarkers() {
      const maplibre = await import("maplibre-gl");

      if (cancelled || !mapRef.current) {
        return;
      }

      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = features.map((feature) => {
        const markerElement = document.createElement("button");
        markerElement.className = styles.contributionMapMarker;
        markerElement.type = "button";
        markerElement.setAttribute(
          "aria-label",
          CONTRIBUTION_REPORT_LABELS[feature.reportType],
        );

        return new maplibre.Marker({ element: markerElement })
          .setLngLat([feature.location.longitude, feature.location.latitude])
          .setPopup(
            new maplibre.Popup({
              closeButton: true,
              offset: 18,
            }).setDOMContent(createPopupNode(feature)),
          )
          .addTo(mapRef.current!);
      });
    }

    void renderMarkers();

    return () => {
      cancelled = true;
    };
  }, [features]);

  return (
    <section
      aria-labelledby="contribution-map-title"
      className={styles.mapProjectionPanel}
    >
      <div className={styles.historyHeader}>
        <div>
          <span className={styles.eyebrow}>Peta Kontribusi</span>
          <h2 id="contribution-map-title">Kontribusi diterima</h2>
        </div>
        <button
          className={styles.secondaryButton}
          onClick={() => {
            mapRef.current?.flyTo({
              center: [
                DEFAULT_CONTRIBUTION_LOCATION.longitude,
                DEFAULT_CONTRIBUTION_LOCATION.latitude,
              ],
              zoom: 12,
              essential: true,
            });
          }}
          type="button"
        >
          <RotateCcw aria-hidden="true" size={15} />
          Reset
        </button>
      </div>

      {error ? <p className={styles.errorText}>{error}</p> : null}
      <div
        aria-label="Peta kontribusi diterima"
        className={styles.mapCanvas}
        ref={containerRef}
        role="application"
        tabIndex={0}
      />
      <p className={styles.statusText} role="status">
        <MapPinned aria-hidden="true" size={14} />
        {status}
      </p>
    </section>
  );
}
