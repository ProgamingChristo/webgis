"use client";

import { LocateFixed, Navigation, RefreshCw, Square } from "lucide-react";
import type { JourneyController, JourneySnapshot } from "../journey-controller";
import styles from "../routing-controls.module.css";

const labels = {
  PREVIEW: "Pratinjau rute", STOPPED: "Perjalanan dihentikan", REQUESTING_LOCATION: "Meminta lokasi perangkat...",
  STARTING: "Menyiapkan rute dari GPS...", ACTIVE: "Perjalanan aktif", REROUTING: "Memperbarui rute...",
  ARRIVED: "Anda telah tiba di tujuan.", ERROR: "Perjalanan terjeda",
};

export function JourneyControls({ journey, canStart, onStart }: {
  journey: JourneySnapshot & { controller: JourneyController }; canStart: boolean; onStart: () => void;
}) {
  const open = journey.state !== "PREVIEW" && journey.state !== "STOPPED";
  return <div className={styles.journey} data-journey-state={journey.state} data-journey-following={journey.following}>
    {open ? <>
      <strong role="status">{labels[journey.state]}</strong>
      {journey.position ? <span>Lokasi perangkat · akurasi sekitar {Math.round(journey.position.accuracyMeters)} m</span> : null}
      <div className={styles.journeyActions}>
        {journey.engaged ? <>
          <button type="button" title="Fokuskan Lokasi" aria-label="Fokuskan Lokasi" aria-pressed={journey.following}
            onClick={journey.controller.focus}><LocateFixed size={20} /></button>
          <button type="button" title="Perbarui rute" aria-label="Perbarui rute" onClick={journey.controller.refresh}
            disabled={!journey.position || journey.state === "STARTING" || journey.state === "REROUTING"}><RefreshCw size={20} /></button>
        </> : null}
        <button type="button" onClick={journey.controller.stop} className={styles.journeyStop}>
          <Square size={16} />{journey.state === "ARRIVED" ? "Kembali ke perencana" : "Akhiri Perjalanan"}</button>
      </div>
    </> : <button className={styles.journeyStart} type="button" disabled={!canStart} onClick={onStart}>
      <Navigation size={18} />Mulai Perjalanan</button>}
  </div>;
}
