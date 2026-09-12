"use client";

import { Bike, Car, Flag, Footprints, LocateFixed, Navigation, RefreshCw, ShoppingBag, Square } from "lucide-react";
import Link from "next/link";
import type { RoutingMode } from "@/src/services/routing.service";
import type { JourneyController, JourneyGpsState, JourneySnapshot, JourneyState } from "../journey-controller";
import styles from "../routing-controls.module.css";

const stateLabels: Record<JourneyState, string> = {
  PREVIEW: "Pratinjau rute",
  STOPPED: "Perjalanan dihentikan",
  REQUESTING_LOCATION: "Mencari GPS yang lebih akurat...",
  STARTING: "Menyiapkan rute dari GPS...",
  ACTIVE: "Perjalanan aktif",
  REROUTING: "Mencari rute baru...",
  ARRIVED: "Anda telah tiba di tujuan.",
  ERROR: "Navigasi menunggu",
};
const gpsLabels: Record<JourneyGpsState, string> = {
  GPS_REQUESTING: "Mencari GPS",
  GPS_GOOD: "GPS baik",
  GPS_DEGRADED: "GPS lemah",
  GPS_STALE: "GPS kedaluwarsa",
  GPS_UNAVAILABLE: "GPS tidak tersedia",
  GPS_PERMISSION_DENIED: "Izin GPS diperlukan",
};
const distance = (meters: number) => meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;

export function JourneyControls({ journey, canStart, onStart, destinationName = "Tujuan", mode = "walking", onModeChange, nearbyUmkmCount = 0, nearbyUmkmLoading = false }: {
  journey: JourneySnapshot & { controller: JourneyController };
  canStart: boolean;
  onStart: () => void;
  destinationName?: string;
  mode?: RoutingMode;
  onModeChange?(mode: RoutingMode): void;
  nearbyUmkmCount?: number;
  nearbyUmkmLoading?: boolean;
}) {
  const open = journey.state !== "PREVIEW" && journey.state !== "STOPPED";
  if (!open) return <div className={styles.journey} data-journey-state={journey.state} data-journey-following={journey.following}>
    <button className={styles.journeyStart} type="button" disabled={!canStart} onClick={onStart}>
      <Navigation size={18} aria-hidden="true" />Mulai Perjalanan
    </button>
  </div>;

  const maneuver = journey.route?.maneuvers[0];
  const remainingRoute = journey.route;
  const gpsAccuracy = journey.gpsAccuracyMeters === null ? null : Math.round(journey.gpsAccuracyMeters);
  const gpsLabel = gpsLabels[journey.gpsState] + (gpsAccuracy === null ? "" : " \u00b1" + gpsAccuracy + " m");
  const usableAcceptedFix = Boolean(journey.position &&
    (journey.gpsState === "GPS_GOOD" || journey.gpsState === "GPS_DEGRADED"));
  const canRefresh = Boolean(journey.position && journey.gpsState === "GPS_GOOD" &&
    journey.state !== "STARTING" && journey.state !== "REROUTING");
  const nextFallback = journey.gpsState === "GPS_GOOD"
    ? stateLabels[journey.state]
    : journey.gpsState === "GPS_DEGRADED"
      ? "Sinyal GPS belum cukup akurat"
      : journey.gpsState === "GPS_REQUESTING"
        ? "Mencari lokasi yang lebih akurat..."
        : gpsLabels[journey.gpsState];

  return <div className={styles.journeyMapUi} role="region" aria-label="Navigasi aktif"
    data-journey-state={journey.state} data-journey-following={journey.following}
    data-gps-state={journey.gpsState} data-route-stale={journey.routeStale}
    data-route-match={journey.routeMatch} data-nearby-umkm={journey.nearbyUmkmVisible}>
    <section className={styles.nextManeuver} aria-label="Petunjuk berikutnya">
      <Navigation size={28} aria-hidden="true" />
      <div>
        <span>Petunjuk berikutnya</span>
        <strong>{journey.state === "ARRIVED" ? "Anda telah tiba" : maneuver?.instruction ?? nextFallback}</strong>
      </div>
      {journey.state !== "ARRIVED" && maneuver && maneuver.distance_meters > 0 ? <b>{distance(maneuver.distance_meters)}<small>ruas ini</small></b> : null}
    </section>
    <section className={styles.journeyStatusPanel} data-navigation-metrics data-testid={journey.route ? "routing-result" : undefined} aria-live="polite">
      <div className={styles.navigationStatusRow}>
        <span className={styles.gpsStatus} data-gps-quality={journey.gpsState} role="status">
          <LocateFixed size={14} aria-hidden="true" />
          {gpsLabel}
        </span>
        <span className={styles.journeyPhase}>{stateLabels[journey.state]}</span>
      </div>
      <div className={styles.journeySummary}>
        {remainingRoute && remainingRoute.distance_meters !== null && remainingRoute.duration_seconds !== null ? <div className={styles.remainingMetrics}>
          <span><strong>{remainingRoute.duration_seconds === 0 ? "Tiba" : `${Math.max(1, Math.ceil(remainingRoute.duration_seconds / 60))} menit`}</strong><small>sisa waktu</small></span>
          <span><strong>{distance(remainingRoute.distance_meters)}</strong><small>sisa jarak</small></span>
        </div> : <span className={styles.waitingMetric}>Menunggu rute dari lokasi GPS</span>}
        <strong className={styles.journeyDestination}><Flag size={15} aria-hidden="true" />{destinationName}</strong>
      </div>
      {journey.routeStale ? <small className={styles.routeFreshness}>Menampilkan rute terakhir sambil menunggu GPS terbaru.</small> : null}
      {journey.updatedAt ? <small className={styles.routeFreshness}>Rute diperbarui {new Date(journey.updatedAt).toLocaleTimeString("id-ID")}</small> : null}
      {journey.error ? <p role="alert">{journey.error}</p> : null}
      {journey.authRequired ? <Link href="/login">Masuk kembali</Link> : null}
      {journey.engaged && onModeChange ? <div className={styles.navigationModes} role="group" aria-label="Moda perjalanan aktif">
        {(["walking", "motorcycle", "car"] as const).map((value) => {
          const Icon = value === "walking" ? Footprints : value === "motorcycle" ? Bike : Car;
          const label = value === "walking" ? "Jalan kaki" : value === "motorcycle" ? "Motor" : "Mobil";
          return <button type="button" key={value} aria-pressed={mode === value} onClick={() => onModeChange(value)}><Icon size={16} aria-hidden="true" />{label}</button>;
        })}
      </div> : null}
      {journey.route?.maneuvers.length ? <details className={styles.navigationDirections}>
        <summary>Lihat petunjuk ({journey.route.maneuvers.length})</summary>
        <ol>{journey.route.maneuvers.map((step, index) => <li key={index}>{step.instruction}{step.distance_meters > 0 ? <small>{distance(step.distance_meters)}</small> : null}</li>)}</ol>
      </details> : null}
      <div className={styles.journeyActions}>
        {journey.engaged ? <>
          <button type="button" title={usableAcceptedFix ? "Fokuskan Lokasi" : "Menunggu GPS yang lebih akurat"}
            aria-label="Fokuskan Lokasi" aria-pressed={journey.following} onClick={journey.controller.focus}
            disabled={!usableAcceptedFix}><LocateFixed size={20} aria-hidden="true" />Fokuskan</button>
          <button type="button" title={canRefresh ? "Perbarui rute" : "Menunggu GPS yang lebih akurat"}
            aria-label="Perbarui rute" onClick={journey.controller.refresh} disabled={!canRefresh}>
            <RefreshCw size={20} aria-hidden="true" />Perbarui
          </button>
          <button type="button" className={styles.nearbyUmkmToggle}
            aria-pressed={journey.nearbyUmkmVisible} onClick={journey.controller.toggleNearbyUmkm}
            title="Tampilkan merchant terpublikasi di sekitar posisi perjalanan">
            <ShoppingBag size={18} aria-hidden="true" />
            {nearbyUmkmLoading ? "Memuat UMKM..." : journey.nearbyUmkmVisible
              ? `UMKM sekitar${nearbyUmkmCount ? ` (${nearbyUmkmCount})` : ""}`
              : "Tampilkan UMKM sekitar"}
          </button>
        </> : null}
        <button type="button" onClick={journey.controller.stop} className={styles.journeyStop}>
          <Square size={16} aria-hidden="true" />{journey.state === "ARRIVED" ? "Kembali ke perencana" : "Akhiri Perjalanan"}
        </button>
      </div>
    </section>
  </div>;
}
