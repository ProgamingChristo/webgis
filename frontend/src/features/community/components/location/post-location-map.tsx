"use client";

import { MapPin, X } from "lucide-react";
import {
  useEffect,
  useRef,
} from "react";
import type {
  Map as MapLibreMap,
  Marker,
} from "maplibre-gl";

import type { CommunityPostLocation } from "../../types/community.types";
import {
  formatExactLocationCoordinate,
  formatLocationCoordinate,
} from "../../utils/community-format";
import { getBasemapOption, getPreferredBasemapId } from "../../../../../lib/mapid";
import styles from "../community.module.css";

type PostLocationMapProps = {
  location: CommunityPostLocation;
  onClose(): void;
};

export function PostLocationMap({
  location,
  onClose,
}: PostLocationMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const label =
    location.visibility === "EXACT"
      ? formatExactLocationCoordinate(location.latitude, location.longitude)
      : "Sekitar lokasi yang dibagikan";

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;

    async function initializeMap() {
      if (!containerRef.current || mapRef.current) {
        return;
      }

      const maplibre = await import("maplibre-gl");

      if (cancelled || !containerRef.current) {
        return;
      }

      maplibre.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

      const center: [number, number] = [
        location.longitude,
        location.latitude,
      ];
      const map = new maplibre.Map({
        container: containerRef.current,
        style: getBasemapOption(getPreferredBasemapId()).style,
        center,
        zoom: 15,
      });

      map.addControl(
        new maplibre.NavigationControl({
          visualizePitch: true,
        }),
        "top-right",
      );

      markerRef.current = new maplibre.Marker({
        color: "#9af24a",
      })
        .setLngLat(center)
        .addTo(map);
      mapRef.current = map;
    }

    void initializeMap();

    return () => {
      cancelled = true;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [location.latitude, location.longitude]);

  return (
    <div className={styles.locationOverlay} role="dialog" aria-modal="true">
      <section className={styles.locationDialog} aria-labelledby="post-location-title">
        <header className={styles.locationDialogHeader}>
          <div>
            <span className={styles.eyebrow}>Lokasi Post</span>
            <h3 id="post-location-title">Lihat di peta</h3>
          </div>
          <button
            aria-label="Tutup peta lokasi"
            className={styles.iconButton}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={17} />
          </button>
        </header>
        <div
          aria-label="Peta lokasi post"
          className={styles.locationMap}
          ref={containerRef}
        />
        <div className={styles.locationDialogFooter}>
          <div className={styles.locationCoordinateText}>
            <MapPin aria-hidden="true" size={15} />
            <span>
              {location.visibility === "EXACT"
                ? label
                : `${label} (${formatLocationCoordinate(
                    location.latitude,
                    location.longitude,
                  )})`}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
