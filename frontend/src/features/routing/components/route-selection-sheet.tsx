"use client";

import { Footprints, Navigation, Route, Store } from "lucide-react";
import type { RoutePreference, RoutingCandidate, RoutingResult } from "@/src/services/routing.service";
import styles from "../routing-controls.module.css";

const distance = (meters: number) => meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
const minutes = (seconds: number) => `${Math.max(1, Math.ceil(seconds / 60))} menit`;

export function RouteSelectionSheet({ route, open, onOpenChange, onSelect, preference, onPreferenceChange, onStart }: {
  route: RoutingResult; open: boolean; onOpenChange(open: boolean): void;
  onSelect(candidate: RoutingCandidate): void; preference: RoutePreference;
  onPreferenceChange(preference: RoutePreference): void; onStart(): void;
}) {
  const candidates = route.route_candidates ?? [];
  const fastest = candidates.find((item) => item.route_category === "FASTEST") ?? candidates[0];
  return <div className={styles.routeOverview} data-sheet-open={open}>
    <button type="button" className={styles.routeOverviewButton} onClick={() => onOpenChange(!open)} aria-expanded={open}>
      <span><Route size={18} />{route.mode === "walking" ? "Walking" : route.mode === "motorcycle" ? "Motorcycle" : "Car"}</span>
      <strong>{minutes(route.duration_seconds!)} · {distance(route.distance_meters!)}</strong>
      <small>{candidates.length > 1 ? `${candidates.length} pilihan rute` : "Rute utama"}</small>
    </button>
    {open ? <section className={styles.routeSheet} aria-label="Pilihan rute">
      <header><div><span className={styles.sheetEyebrow}>Pilih rute</span><h3>Perjalanan kamu</h3></div>
        <button type="button" className={styles.sheetClose} onClick={() => onOpenChange(false)} aria-label="Tutup pilihan rute">×</button></header>
      <div className={styles.preferenceControl} role="group" aria-label="Preferensi rute">
        <button type="button" aria-pressed={preference === "FASTEST"} onClick={() => onPreferenceChange("FASTEST")}><Navigation size={16} />Tercepat</button>
        <button type="button" aria-pressed={preference === "UMKM"} disabled={!route.umkm_preference_available}
          onClick={() => onPreferenceChange("UMKM")}><Store size={16} />Lewat area UMKM</button>
      </div>
      {!route.umkm_preference_available ? <p className={styles.enrichmentNote}>Belum ada alternatif lewat area UMKM untuk rute ini.</p> : null}
      {route.umkm_enrichment_status === "UNAVAILABLE" ? <p className={styles.enrichmentNote}>Data UMKM rute belum tersedia.</p> : null}
      <div className={styles.candidateList}>
        {candidates.map((candidate) => {
          const selected = candidate.route_id === route.selected_route_id;
          const slower = fastest ? Math.max(0, Math.ceil((candidate.duration_seconds - fastest.duration_seconds) / 60)) : 0;
          return <button key={candidate.route_id} type="button" aria-pressed={selected}
            className={styles.candidateCard} onClick={() => onSelect(candidate)}>
            <span>{candidate.route_category === "FASTEST" ? "Rute tercepat" : candidate.route_category === "UMKM_AREA" ? "Lewat area UMKM" : "Alternatif"}</span>
            <strong>{minutes(candidate.duration_seconds)} · {distance(candidate.distance_meters)}</strong>
            {slower > 0 ? <small>+{slower} menit dari rute tercepat</small> : null}
            {candidate.nearby_umkm_count !== null ? <small>{candidate.nearby_umkm_count} UMKM di sekitar rute</small> : null}
          </button>;
        })}
      </div>
      <button type="button" className={styles.sheetStart} onClick={onStart}><Footprints size={18} />Mulai Perjalanan</button>
    </section> : null}
  </div>;
}
