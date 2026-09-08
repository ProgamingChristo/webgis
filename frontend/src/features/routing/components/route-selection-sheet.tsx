"use client";

import { Bike, Car, Check, ChevronUp, Footprints, ListOrdered, Navigation, Route, Store, X } from "lucide-react";
import type { RoutePreference, RoutingCandidate, RoutingMode, RoutingResult } from "@/src/services/routing.service";
import { computeCandidateDelta, deduplicateCandidates, formatRouteDistance, formatRouteMinutes, getRouteContext, getRouteIdentity } from "../route-presentation";
import styles from "../routing-controls.module.css";

const modeLabel = (mode: RoutingResult["mode"]) =>
  mode === "walking" ? "Jalan kaki" : mode === "motorcycle" ? "Motor" : "Mobil";

function ModeIcon({ mode }: { mode: RoutingResult["mode"] }) {
  if (mode === "walking") return <Footprints size={18} aria-hidden="true" />;
  if (mode === "motorcycle") return <Bike size={18} aria-hidden="true" />;
  return <Car size={18} aria-hidden="true" />;
}

export interface RouteSelectionSheetProps {
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
  inline?: boolean;
}

export function RouteSelectionSheet({
  route,
  open,
  originLabel,
  destinationLabel,
  onOpenChange,
  onSelect,
  onModeChange,
  preference,
  onPreferenceChange,
  onStart,
  inline = false,
}: RouteSelectionSheetProps) {
  const rawCandidates = route.route_candidates ?? [];
  const candidates = deduplicateCandidates(rawCandidates);
  const fastest = [...candidates].sort((a, b) => a.duration_seconds - b.duration_seconds)[0] ?? candidates[0];
  const selectedCandidate = candidates.find((item) => item.route_id === route.selected_route_id) ?? fastest ?? candidates[0];

  const candidateCards = (
    <div className={styles.candidateList} role="group" aria-label="Daftar opsi rute">
      {candidates.map((candidate, index) => {
        const selected = candidate.route_id === (route.selected_route_id ?? fastest?.route_id);
        const isFastestCandidate = candidate.route_id === fastest?.route_id;
        const isUmkmCandidate = candidate.route_category === "UMKM_AREA" || (candidate.nearby_umkm_count !== null && candidate.nearby_umkm_count > 0 && candidate.route_category !== "FASTEST");
        const categoryLabel = isFastestCandidate
          ? "Rute tercepat"
          : isUmkmCandidate
            ? "Lewat area UMKM"
            : "Alternatif";

        const delta = computeCandidateDelta(candidate, fastest);
        const routeContext = getRouteContext(candidate);
        const viaIdentity = getRouteIdentity(candidate, index, candidates);

        return (
          <button
            key={candidate.route_id}
            type="button"
            aria-pressed={selected}
            data-route-id={candidate.route_id}
            data-route-category={candidate.route_category}
            className={`${styles.candidateCard}${selected ? ` ${styles.candidateCardSelected}` : ""}`}
            onClick={() => onSelect(candidate)}
          >
            <div className={styles.candidateHeading}>
              <span className={`${styles.categoryBadge} ${isFastestCandidate ? styles.categoryFastest : isUmkmCandidate ? styles.categoryUmkm : styles.categoryAlt}`}>
                {isUmkmCandidate ? <Store size={15} aria-hidden="true" /> : <Route size={15} aria-hidden="true" />}
                <span>{categoryLabel}</span>
              </span>
              {selected ? (
                <span className={styles.selectedPill} aria-label="Dipilih">
                  <Check size={16} aria-hidden="true" />
                  <span>Dipilih</span>
                </span>
              ) : null}
            </div>

            <div className={styles.routeIdentity}>{viaIdentity}</div>

            <div className={styles.candidateMetrics}>
              <strong className={styles.candidateTime}>{formatRouteMinutes(candidate.duration_seconds)}</strong>
              <span className={styles.candidateDist}>{formatRouteDistance(candidate.distance_meters)}</span>
            </div>

            {delta?.formattedDeltaSummary ? (
              <small className={styles.candidateDelta}>
                {delta.formattedDeltaSummary}
              </small>
            ) : null}

            {candidate.nearby_umkm_count !== null ? (
              <small className={styles.umkmCount}>
                <Store size={13} aria-hidden="true" />
                <span>{candidate.nearby_umkm_count} UMKM di sekitar jalur</span>
              </small>
            ) : null}

            {routeContext.length > 0 ? (
              <small className={styles.routeContextTag}>{routeContext.join(" · ")}</small>
            ) : null}

            <div className={styles.cardActionRow}>
              <span className={styles.selectRoute}>{selected ? "Rute dipilih" : "Pilih rute"}</span>
            </div>
          </button>
        );
      })}
    </div>
  );

  const directionsContent = selectedCandidate?.maneuvers?.length ? (
    <details className={styles.directionsDetails}>
      <summary className={styles.directionsSummary}>
        <ListOrdered size={16} aria-hidden="true" />
        <span>Lihat petunjuk ({selectedCandidate.maneuvers.length})</span>
      </summary>
      <ol className={styles.directionsList}>
        {selectedCandidate.maneuvers.map((step, idx) => (
          <li key={idx}>
            <span className={styles.stepInstruction}>{step.instruction}</span>
            {step.distance_meters > 0 ? (
              <small className={styles.stepDistance}>{formatRouteDistance(step.distance_meters)}</small>
            ) : null}
          </li>
        ))}
      </ol>
    </details>
  ) : null;

  if (inline) {
    return (
      <div className={styles.inlinePlanner} data-testid="routing-result" aria-live="polite">
        <section className={styles.inlineSection} aria-label="Pilihan rute">
          <div className={styles.sheetModes} role="group" aria-label="Moda perjalanan">
            {(["walking", "motorcycle", "car"] as const).map((mode) => (
              <button
                type="button"
                key={mode}
                aria-pressed={route.mode === mode}
                onClick={() => onModeChange(mode)}
                className={route.mode === mode ? styles.sheetModeActive : styles.sheetModeButton}
              >
                <ModeIcon mode={mode} />
                <span>{modeLabel(mode)}</span>
                {route.mode === mode && route.duration_seconds ? (
                  <small className={styles.modeDurationBadge}>{formatRouteMinutes(route.duration_seconds)}</small>
                ) : null}
              </button>
            ))}
          </div>

          <div className={styles.preferenceControl} role="group" aria-label="Preferensi rute">
            <button
              type="button"
              aria-pressed={preference === "FASTEST"}
              onClick={() => onPreferenceChange("FASTEST")}
            >
              <Navigation size={16} aria-hidden="true" />
              <span>Tercepat</span>
            </button>
            <button
              type="button"
              aria-pressed={preference === "UMKM"}
              disabled={!route.umkm_preference_available}
              onClick={() => onPreferenceChange("UMKM")}
            >
              <Store size={16} aria-hidden="true" />
              <span>Lewat area UMKM</span>
            </button>
          </div>

          {!route.umkm_preference_available ? (
            <p className={styles.enrichmentNote}>Belum ada alternatif lewat area UMKM untuk perjalanan ini.</p>
          ) : null}
          {route.umkm_enrichment_status === "UNAVAILABLE" ? (
            <p className={styles.enrichmentNote}>Data UMKM di sekitar rute belum tersedia.</p>
          ) : null}

          {candidateCards}

          <p className={styles.trafficNotice}>Estimasi tanpa data lalu lintas real-time.</p>

          <button
            type="button"
            className={styles.sheetStart}
            onClick={onStart}
            aria-label="Mulai Perjalanan"
          >
            <Navigation size={18} aria-hidden="true" />
            <span>Mulai Perjalanan</span>
          </button>

          {directionsContent}
        </section>
      </div>
    );
  }

  return (
    <div className={styles.routeOverview} data-sheet-open={open} data-testid="routing-result" aria-live="polite">
      <button
        type="button"
        className={styles.routeOverviewButton}
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-controls="route-choice-sheet"
      >
        <span className={styles.routeModeLabel}>
          <ModeIcon mode={route.mode} />
          <span>{modeLabel(route.mode)}</span>
        </span>
        <span className={styles.routeHeadline}>
          <strong>{formatRouteMinutes(route.duration_seconds!)}</strong>
          <b>{formatRouteDistance(route.distance_meters!)}</b>
        </span>
        <span className={styles.routeOverviewFooter}>
          <small>{candidates.length > 1 ? `${candidates.length} pilihan rute` : "Rute tersedia"}</small>
          <span>
            {open ? "Tutup" : "Lihat rute"}
            <ChevronUp size={17} aria-hidden="true" />
          </span>
        </span>
      </button>

      {!open ? (
        <button type="button" className={styles.sheetStart} onClick={onStart} aria-label="Mulai Perjalanan">
          <Navigation size={18} aria-hidden="true" />
          <span>Mulai Perjalanan</span>
        </button>
      ) : null}

      {open ? (
        <section id="route-choice-sheet" className={styles.routeSheet} aria-label="Pilihan rute">
          <div className={styles.sheetHandle} aria-hidden="true" />
          <header>
            <div>
              <span className={styles.sheetEyebrow}>Pilihan perjalanan</span>
              <h3>{destinationLabel}</h3>
            </div>
            <button
              type="button"
              className={styles.sheetClose}
              onClick={() => onOpenChange(false)}
              aria-label="Tutup pilihan rute"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </header>

          <div className={styles.tripEndpoints} aria-label="Asal dan tujuan">
            <span>
              <i aria-hidden="true" />
              <span>{originLabel}</span>
            </span>
            <span>
              <i aria-hidden="true" />
              <span>{destinationLabel}</span>
            </span>
          </div>

          <div className={styles.sheetModes} role="group" aria-label="Moda perjalanan">
            {(["walking", "motorcycle", "car"] as const).map((mode) => (
              <button
                type="button"
                key={mode}
                aria-pressed={route.mode === mode}
                onClick={() => onModeChange(mode)}
                className={route.mode === mode ? styles.sheetModeActive : styles.sheetModeButton}
              >
                <ModeIcon mode={mode} />
                <span>{modeLabel(mode)}</span>
                {route.mode === mode && route.duration_seconds ? (
                  <small className={styles.modeDurationBadge}>{formatRouteMinutes(route.duration_seconds)}</small>
                ) : null}
              </button>
            ))}
          </div>

          <div className={styles.preferenceControl} role="group" aria-label="Preferensi rute">
            <button
              type="button"
              aria-pressed={preference === "FASTEST"}
              onClick={() => onPreferenceChange("FASTEST")}
            >
              <Navigation size={16} aria-hidden="true" />
              <span>Tercepat</span>
            </button>
            <button
              type="button"
              aria-pressed={preference === "UMKM"}
              disabled={!route.umkm_preference_available}
              onClick={() => onPreferenceChange("UMKM")}
            >
              <Store size={16} aria-hidden="true" />
              <span>Lewat area UMKM</span>
            </button>
          </div>

          {!route.umkm_preference_available ? (
            <p className={styles.enrichmentNote}>Belum ada alternatif lewat area UMKM untuk perjalanan ini.</p>
          ) : null}
          {route.umkm_enrichment_status === "UNAVAILABLE" ? (
            <p className={styles.enrichmentNote}>Data UMKM di sekitar rute belum tersedia.</p>
          ) : null}

          {candidateCards}

          <p className={styles.trafficNotice}>Estimasi tanpa data lalu lintas real-time.</p>

          <button
            type="button"
            className={styles.sheetStart}
            onClick={onStart}
            aria-label="Mulai Perjalanan"
          >
            <Navigation size={18} aria-hidden="true" />
            <span>Mulai Perjalanan</span>
          </button>

          {directionsContent}
        </section>
      ) : null}
    </div>
  );
}

