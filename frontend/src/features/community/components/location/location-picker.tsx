"use client";

import {
  Crosshair,
  LocateFixed,
  MapPinned,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  Map as MapLibreMap,
  Marker,
} from "maplibre-gl";

import { COMMUNITY_DEFAULT_LOCATION } from "../../constants/community.constants";
import type {
  CommunityLocationInput,
  CommunityLocationVisibility,
} from "../../types/community.types";
import { formatLocationCoordinate } from "../../utils/community-format";
import { getBasemapOption, getPreferredBasemapId } from "../../../../../lib/mapid";
import styles from "../community.module.css";
import { LocationPrivacyControl } from "./location-privacy-control";

type LocationPickerProps = {
  initialLocation: CommunityLocationInput | null;
  initialVisibility: CommunityLocationVisibility;
  onClose(): void;
  onConfirm(location: CommunityLocationInput): void;
};

type DraftLocation = {
  longitude: number;
  latitude: number;
  accuracy_m?: number;
};

function getGeolocationErrorMessage(error: GeolocationPositionError): string {
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

export function LocationPicker({
  initialLocation,
  initialVisibility,
  onClose,
  onConfirm,
}: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const initialLocationRef = useRef(initialLocation);
  const initialCenterRef = useRef(
    initialLocation ?? COMMUNITY_DEFAULT_LOCATION,
  );
  const initialZoomRef = useRef(initialLocation ? 15 : 12);
  const [draft, setDraft] = useState<DraftLocation | null>(
    initialLocation
      ? {
          longitude: initialLocation.longitude,
          latitude: initialLocation.latitude,
          accuracy_m: initialLocation.accuracy_m,
        }
      : null,
  );
  const [visibility, setVisibility] =
    useState<CommunityLocationVisibility>(initialVisibility);
  const [status, setStatus] = useState<string | null>(null);
  const [loadingCurrentLocation, setLoadingCurrentLocation] = useState(false);

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

      const center = initialCenterRef.current;
      const map = new maplibre.Map({
        container: containerRef.current,
        style: getBasemapOption(getPreferredBasemapId()).style,
        center: [center.longitude, center.latitude],
        zoom: initialZoomRef.current,
      });

      map.addControl(
        new maplibre.NavigationControl({
          visualizePitch: true,
        }),
        "top-right",
      );

      map.on("click", (event) => {
        setDraft({
          longitude: event.lngLat.lng,
          latitude: event.lngLat.lat,
        });
        setStatus("Titik peta dipilih.");
      });

      mapRef.current = map;

      if (initialLocationRef.current) {
        markerRef.current = new maplibre.Marker({
          color: "#22d3ee",
          draggable: true,
        })
          .setLngLat([
            initialLocationRef.current.longitude,
            initialLocationRef.current.latitude,
          ])
          .addTo(map);

        markerRef.current.on("dragend", () => {
          const next = markerRef.current?.getLngLat();

          if (next) {
            setDraft({
              longitude: next.lng,
              latitude: next.lat,
            });
            setStatus("Marker dipindahkan.");
          }
        });
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

    if (!map || !draft) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    const lngLat: [number, number] = [
      draft.longitude,
      draft.latitude,
    ];

    if (!markerRef.current) {
      void import("maplibre-gl").then((maplibre) => {
        if (!mapRef.current || markerRef.current) {
          return;
        }

        markerRef.current = new maplibre.Marker({
          color: "#22d3ee",
          draggable: true,
        })
          .setLngLat(lngLat)
          .addTo(mapRef.current);

        markerRef.current.on("dragend", () => {
          const next = markerRef.current?.getLngLat();

          if (next) {
            setDraft({
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
  }, [draft]);

  function useCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setStatus(
        "Browser belum mendukung lokasi perangkat. Pilih titik secara manual di peta.",
      );
      return;
    }

    setLoadingCurrentLocation(true);
    setStatus("Meminta izin lokasi perangkat...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDraft({
          longitude: position.coords.longitude,
          latitude: position.coords.latitude,
          accuracy_m: Number.isFinite(position.coords.accuracy)
            ? position.coords.accuracy
            : undefined,
        });
        setStatus("Lokasi perangkat dipilih.");
        setLoadingCurrentLocation(false);
      },
      (error) => {
        setStatus(getGeolocationErrorMessage(error));
        setLoadingCurrentLocation(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      },
    );
  }

  function confirmLocation() {
    if (!draft) {
      setStatus("Pilih titik lokasi terlebih dahulu.");
      return;
    }

    onConfirm({
      longitude: draft.longitude,
      latitude: draft.latitude,
      visibility,
      ...(draft.accuracy_m ? { accuracy_m: draft.accuracy_m } : {}),
    });
  }

  return (
    <div className={styles.locationOverlay} role="dialog" aria-modal="true">
      <section className={styles.locationDialog} aria-labelledby="location-picker-title">
        <header className={styles.locationDialogHeader}>
          <div>
            <span className={styles.eyebrow}>Lokasi Community</span>
            <h3 id="location-picker-title">Tambahkan Lokasi</h3>
          </div>
          <button
            aria-label="Tutup pemilih lokasi"
            className={styles.iconButton}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={17} />
          </button>
        </header>

        <div className={styles.locationPickerActions}>
          <button
            className={styles.secondaryButton}
            disabled={loadingCurrentLocation}
            onClick={useCurrentLocation}
            type="button"
          >
            <LocateFixed aria-hidden="true" size={15} />
            {loadingCurrentLocation ? "Mengambil lokasi..." : "Gunakan lokasi saya"}
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

        <div
          aria-label="Peta pilih lokasi"
          className={styles.locationMap}
          ref={containerRef}
          role="application"
          tabIndex={0}
        />

        <div className={styles.locationDialogFooter}>
          <div className={styles.locationCoordinateText}>
            <Crosshair aria-hidden="true" size={15} />
            <span>
              {draft
                ? formatLocationCoordinate(draft.latitude, draft.longitude, 5)
                : "Belum ada titik dipilih"}
            </span>
          </div>
          {status ? (
            <p className={styles.locationStatus} role="status">
              {status}
            </p>
          ) : null}
          <LocationPrivacyControl value={visibility} onChange={setVisibility} />
          <div className={styles.locationDialogButtons}>
            <button className={styles.secondaryButton} onClick={onClose} type="button">
              Batal
            </button>
            <button
              className={styles.primaryButton}
              disabled={!draft}
              onClick={confirmLocation}
              type="button"
            >
              Konfirmasi Lokasi
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
