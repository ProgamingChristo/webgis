"use client";

import { Bike, Car, Check, ChevronUp, Footprints, Navigation, Route, Store, X } from "lucide-react";
import type { RoutePreference, RoutingCandidate, RoutingMode, RoutingResult } from "@/src/services/routing.service";
import { formatRouteDistance, formatRouteMinutes, getRouteContext, getRouteIdentity } from "../route-presentation";
import styles from "../routing-controls.module.css";

const modeLabel = (mode: RoutingResult["mode"]) => mode === "walking" ? "Jalan kaki" : mode === "motorcycle" ? "Motor" : "Mobil";

function ModeIcon({ mode }: { mode: RoutingResult["mode"] }) {
  if (mode === "walking") return <Footprints size={19} aria-hidden="true" />;
  if (mode === "motorcycle") return <Bike size={19} aria-hidden="true" />;
  return <Car size={19} aria-hidden="true" />;
}

export function RouteSelectionSheet({ route, open, originLabel, destinationLabel, onOpenChange, onSelect, onModeChange, preference, onPreferenceChange, onStart }: {
  route: RoutingResult;
  open: boolean;
  originLabel: string;
  destinationLabel: string;
  onOpenChange(open: boolean): void;
  onSelect(candidate: RoutingCandidate): void;
  onModeChange(mode: RoutingMode): void;
  preference: RoutePreference;
  onPreferenceChange(preference: RoutePreference): void;
  onStart(): void;
}) {
  const candidates = route.route_candidates ?? [];
  const fastest = candidates.find((item) => item.route_category === "FASTEST") ?? candidates[0];

  return <div className={styles.routeOverview} data-sheet-open={open} data-testid="routing-result" aria-live="polite">
    <button type="button" className={styles.routeOverviewButton} onClick={() => onOpenChange(!open)}
      aria-expanded={open} aria-controls="route-choice-sheet">
      <span className={styles.routeModeLabel}><ModeIcon mode={route.mode} />{modeLabel(route.mode)}</span>
      <span className={styles.routeHeadline}>
        <strong>{formatRouteMinutes(route.duration_seconds!)}</strong>
        <b>{formatRouteDistance(route.distance_meters!)}</b>
      </span>
      <span className={styles.routeOverviewFooter}>
        <small>{candidates.length > 1 ? `${candidates.length} pilihan rute` : "Rute tersedia"}</small>
        <span>{open ? "Tutup" : "Lihat rute"}<ChevronUp size={17} aria-hidden="true" /></span>
      </span>
    </button>
    {!open ? <button type="button" className={styles.sheetStart} onClick={onStart}>
      <Navigation size={18} aria-hidden="true" />Mulai Perjalanan
    </button> : null}

    {open ? <section id="route-choice-sheet" className={styles.routeSheet} aria-label="Pilihan rute">
      <div className={styles.sheetHandle} aria-hidden="true" />
      <header>
        <div><span className={styles.sheetEyebrow}>Pilihan perjalanan</span><h3>{destinationLabel}</h3></div>
        <button type="button" className={styles.sheetClose} onClick={() => onOpenChange(false)}
          aria-label="Tutup pilihan rute"><X size={20} aria-hidden="true" /></button>
      </header>
      <div className={styles.tripEndpoints} aria-label="Asal dan tujuan">
        <span><i aria-hidden="true" />{originLabel}</span>
        <span><i aria-hidden="true" />{destinationLabel}</span>
      </div>
      <div className={styles.sheetModes} role="group" aria-label="Moda perjalanan">
        {(["walking", "motorcycle", "car"] as const).map((mode) => <button type="button" key={mode}
          aria-pressed={route.mode === mode} onClick={() => onModeChange(mode)}>
          <ModeIcon mode={mode} /><span>{modeLabel(mode)}</span>
        </button>)}
      </div>
      <div className={styles.preferenceControl} role="group" aria-label="Preferensi rute">
        <button type="button" aria-pressed={preference === "FASTEST"} onClick={() => onPreferenceChange("FASTEST")}>
          <Navigation size={16} aria-hidden="true" />Tercepat
        </button>
        <button type="button" aria-pressed={preference === "UMKM"} disabled={!route.umkm_preference_available}
          onClick={() => onPreferenceChange("UMKM")}><Store size={16} aria-hidden="true" />Lewat area UMKM</button>
      </div>
      {!route.umkm_preference_available ? <p className={styles.enrichmentNote}>Belum ada alternatif lewat area UMKM untuk perjalanan ini.</p> : null}
      {route.umkm_enrichment_status === "UNAVAILABLE" ? <p className={styles.enrichmentNote}>Data UMKM di sekitar rute belum tersedia.</p> : null}
      <div className={styles.candidateList}>
        {candidates.map((candidate, index) => {
          const selected = candidate.route_id === route.selected_route_id;
          const slowerSeconds = fastest ? Math.max(0, candidate.duration_seconds - fastest.duration_seconds) : 0;
          const extraMeters = fastest ? Math.max(0, candidate.distance_meters - fastest.distance_meters) : 0;
          const category = candidate.route_category === "FASTEST" ? "Rute tercepat" : candidate.route_category === "UMKM_AREA" ? "Lewat area UMKM" : "Alternatif";
          const routeContext = getRouteContext(candidate);
          return <button key={candidate.route_id} type="button" aria-pressed={selected}
            className={styles.candidateCard} onClick={() => onSelect(candidate)}>
            <span className={styles.candidateHeading}>
              <span>{candidate.route_category === "UMKM_AREA" ? <Store size={17} aria-hidden="true" /> : <Route size={17} aria-hidden="true" />}{category}</span>
              {selected ? <Check size={19} aria-label="Dipilih" /> : null}
            </span>
            <span className={styles.routeIdentity}>{getRouteIdentity(candidate, index)}</span>
            <span className={styles.candidateMetrics}><strong>{formatRouteMinutes(candidate.duration_seconds)}</strong><b>{formatRouteDistance(candidate.distance_meters)}</b></span>
            {slowerSeconds > 0 || extraMeters > 0 ? <small>
              {slowerSeconds > 0 ? `+${Math.max(1, Math.ceil(slowerSeconds / 60))} menit` : null}
              {slowerSeconds > 0 && extraMeters > 0 ? " / " : null}
              {extraMeters > 0 ? `+${formatRouteDistance(extraMeters)}` : null} dibanding rute tercepat
            </small> : null}
            {candidate.nearby_umkm_count !== null ? <small className={styles.umkmCount}>{candidate.nearby_umkm_count} UMKM di sekitar jalur</small> : null}
            {routeContext.length > 0 ? <small>{routeContext.join(" / ")}</small> : null}
            <span className={styles.selectRoute}>{selected ? "Rute dipilih" : "Pilih rute"}</span>
          </button>;
        })}
      </div>
      <p className={styles.trafficNotice}>Estimasi tanpa data lalu lintas real-time.</p>
      <button type="button" className={styles.sheetStart} onClick={onStart}>
        <Navigation size={18} aria-hidden="true" />Mulai Perjalanan
      </button>
    </section> : null}
  </div>;
}
