"use client";

import { Bike, Car, Flag, Footprints, LocateFixed, Navigation, RefreshCw, Square } from "lucide-react";
import Link from "next/link";
import type { RoutingMode } from "@/src/services/routing.service";
import type { JourneyController, JourneySnapshot } from "../journey-controller";
import styles from "../routing-controls.module.css";

const labels = {
  PREVIEW: "Pratinjau rute",
  STOPPED: "Perjalanan dihentikan",
  REQUESTING_LOCATION: "Meminta lokasi perangkat...",
  STARTING: "Menyiapkan rute dari GPS...",
  ACTIVE: "Perjalanan aktif",
  REROUTING: "Memperbarui rute...",
  ARRIVED: "Anda telah tiba di tujuan.",
  ERROR: "Perjalanan terjeda",
};
const distance = (meters: number) => meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;

export function JourneyControls({ journey, canStart, onStart, destinationName = "Tujuan", mode = "walking", onModeChange }: {
  journey: JourneySnapshot & { controller: JourneyController };
  canStart: boolean;
  onStart: () => void;
  destinationName?: string;
  mode?: RoutingMode;
  onModeChange?(mode: RoutingMode): void;
}) {
  const open = journey.state !== "PREVIEW" && journey.state !== "STOPPED";
  if (!open) return <div className={styles.journey} data-journey-state={journey.state} data-journey-following={journey.following}>
    <button className={styles.journeyStart} type="button" disabled={!canStart} onClick={onStart}>
      <Navigation size={18} aria-hidden="true" />Mulai Perjalanan
    </button>
  </div>;

  const maneuver = journey.route?.maneuvers[0];
  return <div className={styles.journeyMapUi} role="region" aria-label="Navigasi aktif" data-journey-state={journey.state} data-journey-following={journey.following}>
    <section className={styles.nextManeuver} aria-label="Petunjuk berikutnya">
      <Navigation size={28} aria-hidden="true" />
      <div>
        <span>Petunjuk berikutnya</span>
        <strong>{journey.state === "ARRIVED" ? "Anda telah tiba" : maneuver?.instruction ?? labels[journey.state]}</strong>
      </div>
      {journey.state !== "ARRIVED" && maneuver && maneuver.distance_meters > 0 ? <b>{distance(maneuver.distance_meters)}<small>ruas ini</small></b> : null}
    </section>
    <section className={styles.journeyStatusPanel} data-navigation-metrics data-testid={journey.route ? "routing-result" : undefined} aria-live="polite">
      <div className={styles.journeyStatusHeading}>
        <span role="status">{labels[journey.state]}</span>
        <strong><Flag size={16} aria-hidden="true" />{destinationName}</strong>
      </div>
      {journey.route?.distance_meters && journey.route.duration_seconds ? <div className={styles.remainingMetrics}>
        <span><strong>{Math.max(1, Math.ceil(journey.route.duration_seconds / 60))} menit</strong></span>
        <span><strong>{distance(journey.route.distance_meters)}</strong>tersisa</span>
      </div> : null}
      {journey.position ? <small>GPS aktif, akurasi sekitar {Math.round(journey.position.accuracyMeters)} m</small> : null}
      {journey.updatedAt ? <small>Rute diperbarui {new Date(journey.updatedAt).toLocaleTimeString("id-ID")}</small> : null}
      {journey.error ? <p role="alert">{journey.error}</p> : null}
      {journey.authRequired ? <Link href="/login">Masuk kembali</Link> : null}
      {journey.engaged && onModeChange ? <div className={styles.navigationModes} role="group" aria-label="Moda perjalanan aktif">
        {(["walking", "motorcycle", "car"] as const).map((value) => {
          const Icon = value === "walking" ? Footprints : value === "motorcycle" ? Bike : Car;
          const label = value === "walking" ? "Jalan kaki" : value === "motorcycle" ? "Motor" : "Mobil";
          return <button type="button" key={value} aria-pressed={mode === value} onClick={() => onModeChange(value)}><Icon size={16} />{label}</button>;
        })}
      </div> : null}
      {journey.route?.maneuvers.length ? <details className={styles.navigationDirections}>
        <summary>Lihat petunjuk ({journey.route.maneuvers.length})</summary>
        <ol>{journey.route.maneuvers.map((step, index) => <li key={index}>{step.instruction}{step.distance_meters > 0 ? <small>{distance(step.distance_meters)}</small> : null}</li>)}</ol>
      </details> : null}
      <div className={styles.journeyActions}>
        {journey.engaged ? <>
          <button type="button" title="Fokuskan Lokasi" aria-label="Fokuskan Lokasi" aria-pressed={journey.following}
            onClick={journey.controller.focus}><LocateFixed size={20} aria-hidden="true" />Fokuskan</button>
          <button type="button" title="Perbarui rute" aria-label="Perbarui rute" onClick={journey.controller.refresh}
            disabled={!journey.position || journey.state === "STARTING" || journey.state === "REROUTING"}>
            <RefreshCw size={20} aria-hidden="true" />Perbarui
          </button>
        </> : null}
        <button type="button" onClick={journey.controller.stop} className={styles.journeyStop}>
          <Square size={16} aria-hidden="true" />{journey.state === "ARRIVED" ? "Kembali ke perencana" : "Akhiri Perjalanan"}
        </button>
      </div>
    </section>
  </div>;
}
