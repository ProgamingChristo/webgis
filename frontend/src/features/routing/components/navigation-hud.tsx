"use client";

import React, { useState } from "react";
import {
  ArrowUp,
  CornerUpLeft,
  CornerUpRight,
  ArrowUpLeft,
  ArrowUpRight,
  RotateCcw,
  MapPin,
  X,
  ChevronLeft,
  ChevronRight,
  ListOrdered,
  LocateFixed,
} from "lucide-react";
import type { NavigationRouteOption, RoutingManeuver } from "@/src/services/routing.service";
import styles from "../routing-controls.module.css";

interface NavigationHudProps {
  route: NavigationRouteOption;
  activeManeuverIndex: number;
  onPrevManeuver: () => void;
  onNextManeuver: () => void;
  onSelectManeuver: (index: number) => void;
  onRecenter: () => void;
  onExitNavigation: () => void;
}

function getManeuverIcon(instruction: string, size = 24) {
  const text = instruction.toLowerCase();
  if (text.includes("putar") || text.includes("u-turn")) {
    return <RotateCcw size={size} aria-hidden="true" />;
  }
  if (text.includes("kiri tajam") || text.includes("belok kiri tajam")) {
    return <CornerUpLeft size={size} aria-hidden="true" />;
  }
  if (text.includes("kanan tajam") || text.includes("belok kanan tajam")) {
    return <CornerUpRight size={size} aria-hidden="true" />;
  }
  if (text.includes("kiri")) {
    return <ArrowUpLeft size={size} aria-hidden="true" />;
  }
  if (text.includes("kanan")) {
    return <ArrowUpRight size={size} aria-hidden="true" />;
  }
  if (text.includes("tiba") || text.includes("sampai") || text.includes("tujuan")) {
    return <MapPin size={size} aria-hidden="true" />;
  }
  return <ArrowUp size={size} aria-hidden="true" />;
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
  return `${hours}:${minutes}`;
}

export function NavigationHud({
  route,
  activeManeuverIndex,
  onPrevManeuver,
  onNextManeuver,
  onSelectManeuver,
  onRecenter,
  onExitNavigation,
}: NavigationHudProps) {
  const [showManeuverDrawer, setShowManeuverDrawer] = useState(false);

  const maneuvers = route.maneuvers;
  const currentManeuver: RoutingManeuver | undefined = maneuvers[activeManeuverIndex] ?? maneuvers[0];
  const nextManeuver: RoutingManeuver | undefined = maneuvers[activeManeuverIndex + 1];

  // Remaining calculation from current maneuver onwards
  const remainingMeters = maneuvers
    .slice(activeManeuverIndex)
    .reduce((sum, m) => sum + (m.distance_meters || 0), 0);
  const remainingSeconds = maneuvers
    .slice(activeManeuverIndex)
    .reduce((sum, m) => sum + (m.time_seconds || 0), 0);

  const totalMinutes = Math.max(1, Math.ceil((remainingSeconds || route.duration_seconds) / 60));
  const totalDistance = remainingMeters > 0 ? remainingMeters : route.distance_meters;

  return (
    <div className={styles.navigationOverlay} data-testid="navigation-hud">
      {/* Top Banner - Prominent Turn Maneuver Guidance */}
      <header className={styles.navTopBanner} role="region" aria-label="Petunjuk navigasi aktif">
        <div className={styles.navTopMain}>
          <div className={styles.navManeuverIconCircle}>
            {getManeuverIcon(currentManeuver?.instruction ?? "Lurus", 28)}
          </div>
          <div className={styles.navManeuverTextGroup}>
            {currentManeuver && currentManeuver.distance_meters > 0 ? (
              <span className={styles.navManeuverDistance}>
                {formatDistance(currentManeuver.distance_meters)}
              </span>
            ) : null}
            <strong className={styles.navManeuverInstruction}>
              {currentManeuver?.instruction ?? "Mulai perjalanan"}
            </strong>
          </div>
        </div>

        {nextManeuver ? (
          <div className={styles.navNextPreview}>
            <span className={styles.navNextLabel}>Setelah itu:</span>
            <span className={styles.navNextInstruction}>{nextManeuver.instruction}</span>
          </div>
        ) : null}
      </header>

      {/* Floating Recenter Action */}
      <div className={styles.navFloatingActions}>
        <button
          type="button"
          className={styles.navCircleButton}
          onClick={onRecenter}
          aria-label="Pusatkan peta ke posisi saat ini"
          title="Pusatkan peta"
        >
          <LocateFixed size={20} aria-hidden="true" />
        </button>
      </div>

      {/* Bottom Status Bar - ETA, Remaining Distance & Step Controls */}
      <footer className={styles.navBottomBar} role="region" aria-label="Status navigasi dan kontrol">
        <div className={styles.navMetrics}>
          <div className={styles.navTimeBlock}>
            <span className={styles.navMinutes}>{totalMinutes}</span>
            <span className={styles.navMinutesUnit}>mnt</span>
          </div>
          <div className={styles.navMetaBlock}>
            <span className={styles.navDistanceText}>{formatDistance(totalDistance)}</span>
            <span className={styles.navEtaText}>Tiba {formatArrivalTime(remainingSeconds || route.duration_seconds)}</span>
          </div>
        </div>

        <div className={styles.navControls}>
          <div className={styles.navStepButtonGroup}>
            <button
              type="button"
              className={styles.navStepButton}
              onClick={onPrevManeuver}
              disabled={activeManeuverIndex <= 0}
              aria-label="Langkah sebelumnya"
              title="Langkah sebelumnya"
            >
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <span className={styles.navStepCounter} aria-live="polite">
              {activeManeuverIndex + 1}/{maneuvers.length || 1}
            </span>
            <button
              type="button"
              className={styles.navStepButton}
              onClick={onNextManeuver}
              disabled={activeManeuverIndex >= maneuvers.length - 1}
              aria-label="Langkah berikutnya"
              title="Langkah berikutnya"
            >
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            className={styles.navSecondaryToggle}
            onClick={() => setShowManeuverDrawer((prev) => !prev)}
            aria-expanded={showManeuverDrawer}
            aria-label="Lihat seluruh daftar petunjuk langkah"
          >
            <ListOrdered size={16} aria-hidden="true" />
            <span>Petunjuk</span>
          </button>

          <button
            type="button"
            className={styles.navExitButton}
            onClick={onExitNavigation}
            aria-label="Akhiri navigasi perjalanan"
            data-testid="exit-navigation-button"
          >
            <X size={16} aria-hidden="true" />
            <span>Akhiri</span>
          </button>
        </div>
      </footer>

      {/* Secondary Collapsible Maneuver Drawer */}
      {showManeuverDrawer ? (
        <aside
          className={styles.navManeuverDrawer}
          role="dialog"
          aria-label="Daftar seluruh langkah petunjuk"
        >
          <div className={styles.navDrawerHeader}>
            <h3>Daftar Petunjuk ({maneuvers.length} langkah)</h3>
            <button
              type="button"
              className={styles.navDrawerClose}
              onClick={() => setShowManeuverDrawer(false)}
              aria-label="Tutup daftar petunjuk"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <ol className={styles.navDrawerList}>
            {maneuvers.map((maneuver, index) => {
              const isCurrent = index === activeManeuverIndex;
              return (
                <li
                  key={`${maneuver.type ?? "step"}-${index}`}
                  className={`${styles.navDrawerItem} ${isCurrent ? styles.navDrawerItemActive : ""}`}
                  onClick={() => {
                    onSelectManeuver(index);
                    setShowManeuverDrawer(false);
                  }}
                  tabIndex={0}
                  role="button"
                >
                  <div className={styles.navDrawerStepBadge}>{index + 1}</div>
                  <div className={styles.navDrawerStepIcon}>
                    {getManeuverIcon(maneuver.instruction, 18)}
                  </div>
                  <div className={styles.navDrawerStepBody}>
                    <p>{maneuver.instruction}</p>
                    {maneuver.distance_meters > 0 ? (
                      <small>{formatDistance(maneuver.distance_meters)}</small>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </aside>
      ) : null}
    </div>
  );
}
