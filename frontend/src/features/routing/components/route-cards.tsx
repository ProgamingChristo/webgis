"use client";

import React, { useId } from "react";
import { Navigation, Clock, ShieldAlert, CheckCircle2, ChevronRight, Zap } from "lucide-react";
import type { NavigationRouteOption } from "@/src/services/routing.service";
import styles from "../routing-controls.module.css";

interface RouteCardsProps {
  routes: NavigationRouteOption[];
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
  onStartNavigation: () => void;
}

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatArrivalTime(durationSeconds: number): string {
  const arrival = new Date(Date.now() + durationSeconds * 1000);
  const hours = arrival.getHours().toString().padStart(2, "0");
  const minutes = arrival.getMinutes().toString().padStart(2, "0");
  return `Tiba pukul ${hours}:${minutes}`;
}

export function RouteCards({
  routes,
  selectedRouteId,
  onSelectRoute,
  onStartNavigation,
}: RouteCardsProps) {
  const groupId = useId();

  if (!routes || routes.length === 0) {
    return null;
  }

  const activeId = selectedRouteId ?? routes[0]?.id;
  const fastestDuration = Math.min(...routes.map((r) => r.duration_seconds));
  const selectedRoute = routes.find((r) => r.id === activeId) ?? routes[0];

  return (
    <div className={styles.routeContainer} data-testid="route-cards-container">
      <div
        className={styles.routeCardsList}
        role="radiogroup"
        aria-label="Pilihan rute perjalanan"
      >
        {routes.map((route) => {
          const isSelected = route.id === activeId;
          const durationMinutes = Math.max(1, Math.ceil(route.duration_seconds / 60));
          const fastestMinutes = Math.max(1, Math.ceil(fastestDuration / 60));
          const diffMinutes = durationMinutes - fastestMinutes;

          return (
            <div
              key={route.id}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              id={`${groupId}-${route.id}`}
              className={`${styles.routeCard} ${isSelected ? styles.routeCardActive : ""}`}
              onClick={() => onSelectRoute(route.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectRoute(route.id);
                }
              }}
            >
              <div className={styles.routeCardHeader}>
                <div className={styles.routeRadioIndicator} aria-hidden="true">
                  {isSelected ? <CheckCircle2 size={18} className={styles.routeRadioChecked} /> : <div className={styles.routeRadioUnchecked} />}
                </div>
                <div className={styles.routeCardTitleArea}>
                  <div className={styles.routeCardTitleRow}>
                    <strong className={styles.routeCardTitle}>{route.name}</strong>
                    {route.is_fastest ? (
                      <span className={styles.fastestBadge}>
                        <Zap size={12} aria-hidden="true" /> Tercepat
                      </span>
                    ) : diffMinutes > 0 ? (
                      <span className={styles.altDiffBadge}>+{diffMinutes} mnt</span>
                    ) : null}
                  </div>
                  <span className={styles.routeCardEta}>{formatArrivalTime(route.duration_seconds)}</span>
                </div>
              </div>

              {/* Time + Distance Visual Hierarchy */}
              <div className={styles.routeMetricsRow}>
                <div className={styles.routeTimeBlock}>
                  <span className={styles.routeTimeValue}>{durationMinutes}</span>
                  <span className={styles.routeTimeUnit}>menit</span>
                </div>
                <div className={styles.routeDistanceBlock}>
                  <span className={styles.routeDistanceValue}>{formatDistance(route.distance_meters)}</span>
                </div>
              </div>

              {/* Route Flags / Attributes */}
              <div className={styles.routeBadgesRow}>
                <span className={route.has_toll ? styles.tollBadge : styles.noTollBadge}>
                  {route.has_toll ? "Jalan Tol" : "Tanpa Tol"}
                </span>
                {route.has_highway && !route.has_toll ? (
                  <span className={styles.highwayBadge}>Jalan Layang</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Prominent Mulai Perjalanan CTA */}
      <button
        type="button"
        className={styles.startNavigationButton}
        onClick={onStartNavigation}
        aria-label="Mulai perjalanan navigasi"
        data-testid="start-navigation-button"
      >
        <div className={styles.startNavigationIconWrapper}>
          <Navigation size={20} className={styles.startNavigationIcon} aria-hidden="true" />
        </div>
        <div className={styles.startNavigationContent}>
          <span className={styles.startNavigationLabel}>Mulai Perjalanan</span>
          <span className={styles.startNavigationSub}>
            {Math.max(1, Math.ceil(selectedRoute.duration_seconds / 60))} mnt · {formatDistance(selectedRoute.distance_meters)}
          </span>
        </div>
        <ChevronRight size={20} className={styles.startNavigationArrow} aria-hidden="true" />
      </button>
    </div>
  );
}
