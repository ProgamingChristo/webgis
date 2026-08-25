"use client";

import { Crosshair, LocateFixed, MapPinned } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  Map as MapLibreMap,
  Marker,
} from "maplibre-gl";

import { getBasemapOption, getDefaultBasemapId } from "../../../../lib/mapid";
import { DEFAULT_CONTRIBUTION_LOCATION } from "../constants";
import type {
  CommunityContributionPoint,
} from "../types/community-contributions.types";
import styles from "./community-contributions.module.css";

type ContributionLocationPickerProps = {
  label: string;
  value: CommunityContributionPoint | null;
  error?: string;
  onChange(value: CommunityContributionPoint): void;
};

function getGeolocationErrorMessage(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) {
    return "Izin lokasi ditolak. Pilih titik secara manual di peta.";
  }

  if (error.code === error.POSITION_UNAVAILABLE) {
    return "Lokasi perangkat belum tersedia. Pilih titik secara manual di peta.";
  }

  if (error.code === error.TIMEOUT) {
    return "Permintaan lokasi terlalu lama. Pilih titik secara manual di peta.";
  }

  return "Lokasi tidak dapat diakses. Pilih titik secara manual di peta.";
}

export function ContributionLocationPicker({
  error,
  label,
  onChange,
  value,
}: ContributionLocationPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const initialCenterRef = useRef(value ?? DEFAULT_CONTRIBUTION_LOCATION);
  const initialZoomRef = useRef(value ? 15 : 12);
  const [status, setStatus] = useState<string | null>(
    "Klik peta atau gunakan lokasi saya saat Anda siap.",
  );
  const [mapError, setMapError] = useState<string | null>(null);
  const [loadingGeolocation, setLoadingGeolocation] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let cancelled = false;

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

        const center = initialCenterRef.current;
        const map = new maplibre.Map({
          container: containerRef.current,
          style: getBasemapOption(getDefaultBasemapId()).style,
          center: [center.longitude, center.latitude],
          zoom: initialZoomRef.current,
          attributionControl: false,
        });

        map.addControl(
          new maplibre.NavigationControl({
            visualizePitch: true,
          }),
          "top-right",
        );

        map.on("click", (event) => {
          onChangeRef.current({
            longitude: event.lngLat.lng,
            latitude: event.lngLat.lat,
          });
          setStatus("Titik peta dipilih.");
        });

        map.on("error", () => {
          setMapError("Peta gagal dimuat. Anda masih dapat memakai tombol lokasi perangkat.");
        });

        mapRef.current = map;
      } catch {
        if (!cancelled) {
          setMapError("Peta gagal dimuat. Anda masih dapat memakai tombol lokasi perangkat.");
        }
      }
    }

    void initializeMap();

    return () => {
      cancelled = true;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !value) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    const lngLat: [number, number] = [value.longitude, value.latitude];

    if (!markerRef.current) {
      void import("maplibre-gl").then((maplibre) => {
        if (!mapRef.current || markerRef.current) {
          return;
        }

        markerRef.current = new maplibre.Marker({
          color: "#9af24a",
          draggable: true,
        })
          .setLngLat(lngLat)
          .addTo(mapRef.current);

        markerRef.current.on("dragend", () => {
          const next = markerRef.current?.getLngLat();

          if (next) {
            onChangeRef.current({
              longitude: next.lng,
              latitude: next.lat,
            });
            setStatus("Marker dipindahkan.");
          }
        });
      });
    } else {
      markerRef.current.setLngLat(lngLat);
    }

    map.flyTo({
      center: lngLat,
      zoom: Math.max(map.getZoom(), 15),
      essential: true,
    });
  }, [value]);

  function useCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setStatus(
        "Browser belum mendukung lokasi perangkat. Pilih titik secara manual di peta.",
      );
      return;
    }

    setLoadingGeolocation(true);
    setStatus("Meminta izin lokasi perangkat...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({
          longitude: position.coords.longitude,
          latitude: position.coords.latitude,
        });
        setStatus("Lokasi perangkat dipilih.");
        setLoadingGeolocation(false);
      },
      (geoError) => {
        setStatus(getGeolocationErrorMessage(geoError));
        setLoadingGeolocation(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      },
    );
  }

  return (
    <section className={styles.locationPicker} aria-label={label}>
      <div className={styles.locationToolbar}>
        <strong className={styles.fieldLabel}>{label}</strong>
        <div className={styles.locationToolbar}>
          <button
            className={styles.secondaryButton}
            disabled={loadingGeolocation}
            onClick={useCurrentLocation}
            type="button"
          >
            <LocateFixed aria-hidden="true" size={15} />
            {loadingGeolocation ? "Mengambil lokasi..." : "Gunakan lokasi saya"}
          </button>
          <button
            className={styles.secondaryButton}
            onClick={() => {
              containerRef.current?.focus();
              setStatus("Klik atau tap titik di peta.");
            }}
            type="button"
          >
            <MapPinned aria-hidden="true" size={15} />
            Pilih titik di peta
          </button>
        </div>
      </div>

      {mapError ? <p className={styles.errorText}>{mapError}</p> : null}
      <div
        aria-label={`${label} pada peta`}
        className={styles.mapCanvas}
        ref={containerRef}
        role="application"
        tabIndex={0}
      />

      <div className={styles.coordinate}>
        <span>
          <Crosshair aria-hidden="true" size={14} /> Lokasi dipilih
        </span>
        <strong>
          {value
            ? `Lng ${value.longitude.toFixed(6)}, Lat ${value.latitude.toFixed(6)}`
            : "Belum ada titik dipilih"}
        </strong>
      </div>
      {status ? (
        <p className={styles.statusText} role="status">
          {status}
        </p>
      ) : null}
      {error ? <p className={styles.errorText}>{error}</p> : null}
    </section>
  );
}
