"use client";

import { Layers, MapPin, RefreshCw } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  Map as MapLibreMap,
  Marker,
} from "maplibre-gl";

import { getCommunityCulturalMap } from "../../api/community.api";
import {
  COMMUNITY_DEFAULT_LOCATION,
  COMMUNITY_FINDING_CATEGORIES,
} from "../../constants/community.constants";
import type {
  CommunityCulturalMapItem,
  CommunityFindingCategory,
} from "../../types/community.types";
import {
  formatCommunityFindingCategory,
  formatCommunityTime,
  formatLocationCoordinate,
} from "../../utils/community-format";
import { getBasemapOption, getPreferredBasemapId } from "../../../../../lib/mapid";
import { CommunityAvatar } from "../common/community-avatar";
import styles from "../community.module.css";

type CulturalMapBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

function getInitialBounds(): CulturalMapBounds {
  const { longitude, latitude } = COMMUNITY_DEFAULT_LOCATION;

  return {
    west: longitude - 0.14,
    south: latitude - 0.12,
    east: longitude + 0.14,
    north: latitude + 0.12,
  };
}

function getMapBounds(map: MapLibreMap): CulturalMapBounds {
  const bounds = map.getBounds();

  return {
    west: bounds.getWest(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    north: bounds.getNorth(),
  };
}

export function CulturalMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [items, setItems] = useState<CommunityCulturalMapItem[]>([]);
  const [bounds, setBounds] = useState<CulturalMapBounds>(getInitialBounds);
  const [selectedCategories, setSelectedCategories] = useState<
    CommunityFindingCategory[]
  >([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMapItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextItems = await getCommunityCulturalMap(
        bounds,
        selectedCategories,
      );

      setItems(nextItems);
      setActiveId((current) =>
        current && nextItems.some((item) => item.id === current)
          ? current
          : nextItems[0]?.id ?? null,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Cultural Map gagal dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [bounds, selectedCategories]);

  useEffect(() => {
    const requestId = window.setTimeout(() => {
      void loadMapItems();
    }, 160);

    return () => window.clearTimeout(requestId);
  }, [loadMapItems]);

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

      const map = new maplibre.Map({
        container: containerRef.current,
        style: getBasemapOption(getPreferredBasemapId()).style,
        center: [
          COMMUNITY_DEFAULT_LOCATION.longitude,
          COMMUNITY_DEFAULT_LOCATION.latitude,
        ],
        zoom: 11,
      });

      map.addControl(
        new maplibre.NavigationControl({
          visualizePitch: true,
        }),
        "top-right",
      );
      map.on("load", () => setBounds(getMapBounds(map)));
      map.on("moveend", () => setBounds(getMapBounds(map)));
      mapRef.current = map;
    }

    void initializeMap();

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function syncMarkers() {
      const map = mapRef.current;

      if (!map) {
        return;
      }

      const maplibre = await import("maplibre-gl");

      if (cancelled) {
        return;
      }

      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = items.map((item) => {
        const marker = new maplibre.Marker({
          color: activeId === item.id ? "#9af24a" : "#22d3ee",
        })
          .setLngLat([item.location.longitude, item.location.latitude])
          .addTo(map);

        marker.getElement().addEventListener("click", () => {
          setActiveId(item.id);
          map.flyTo({
            center: [item.location.longitude, item.location.latitude],
            zoom: Math.max(map.getZoom(), 14),
            essential: true,
          });
        });

        return marker;
      });
    }

    void syncMarkers();

    return () => {
      cancelled = true;
    };
  }, [activeId, items]);

  function toggleCategory(category: CommunityFindingCategory) {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  }

  function focusFinding(item: CommunityCulturalMapItem) {
    setActiveId(item.id);
    mapRef.current?.flyTo({
      center: [item.location.longitude, item.location.latitude],
      zoom: Math.max(mapRef.current.getZoom(), 14),
      essential: true,
    });
  }

  return (
    <section className={styles.culturalMapPanel} aria-label="Cultural Map">
      <div className={styles.culturalMapToolbar}>
        <div>
          <span className={styles.eyebrow}>Cultural Map</span>
          <h2>Temuan budaya di sekitar peta</h2>
        </div>
        <button
          className={styles.secondaryButton}
          disabled={loading}
          onClick={() => void loadMapItems()}
          type="button"
        >
          <RefreshCw aria-hidden="true" size={15} />
          {loading ? "Memuat..." : "Segarkan"}
        </button>
      </div>

      <div className={styles.categoryFilterBar} aria-label="Filter kategori">
        {COMMUNITY_FINDING_CATEGORIES.map((item) => {
          const active = selectedCategories.includes(item.value);

          return (
            <button
              className={active ? styles.filterChipActive : styles.filterChip}
              key={item.value}
              onClick={() => toggleCategory(item.value)}
              type="button"
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className={styles.culturalMapLayout}>
        <div
          aria-label="Peta Cultural Map"
          className={styles.culturalMapCanvas}
          ref={containerRef}
          role="application"
        />
        <aside className={styles.culturalMapList} aria-label="Daftar temuan">
          {error ? (
            <div className={styles.feedState} role="alert">
              <span className={styles.eyebrow}>Map error</span>
              <h2>Cultural Map belum bisa dimuat.</h2>
              <p>{error}</p>
            </div>
          ) : null}
          {!error && loading ? (
            <div className={styles.mapLoadingState}>
              <Layers aria-hidden="true" size={18} />
              <span>Memuat temuan...</span>
            </div>
          ) : null}
          {!error && !loading && items.length === 0 ? (
            <div className={styles.mapLoadingState}>
              <MapPin aria-hidden="true" size={18} />
              <span>Belum ada Temuan Komuter di area ini.</span>
            </div>
          ) : null}
          {items.map((item) => (
            <button
              className={
                activeId === item.id
                  ? styles.mapFindingItemActive
                  : styles.mapFindingItem
              }
              key={item.id}
              onClick={() => focusFinding(item)}
              type="button"
            >
              <span>{formatCommunityFindingCategory(item.category)}</span>
              <span className={styles.mapFindingAuthor}>
                <CommunityAvatar
                  avatarUrl={item.author.avatarUrl}
                  displayName={item.author.displayName}
                />
                <span>{item.author.displayName}</span>
              </span>
              <strong>{item.content}</strong>
              <small>
                {formatCommunityTime(item.createdAt)}
              </small>
              <small>
                {formatLocationCoordinate(
                  item.location.latitude,
                  item.location.longitude,
                )}
              </small>
            </button>
          ))}
        </aside>
      </div>
    </section>
  );
}
