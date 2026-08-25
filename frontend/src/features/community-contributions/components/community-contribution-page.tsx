"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ListChecks, Plus, RotateCcw, Send } from "lucide-react";

import {
  CONTRIBUTION_DETAILS_MAX_LENGTH,
  CONTRIBUTION_REJECTION_REASON_LABELS,
  CONTRIBUTION_REPORT_LABELS,
  CONTRIBUTION_REPORT_OPTIONS,
  OPENING_HOUR_DAY_OPTIONS,
} from "../constants";
import {
  createCommunityContribution,
  getCommunityContributionHistory,
} from "../api/community-contributions.api";
import type {
  CommunityContribution,
  CommunityContributionFormState,
  CommunityContributionHistoryFilters,
  CommunityContributionHistoryResult,
  CommunityContributionPoint,
  CommunityContributionReportType,
  CommunityContributionStatus,
} from "../types/community-contributions.types";
import { createDefaultObservedAtLocal } from "../utils/date-time";
import {
  buildContributionPayload,
  ContributionFormValidationError,
  type ContributionValidationErrors,
} from "../utils/payload-adapter";
import { ContributionLocationPicker } from "./contribution-location-picker";
import { CommunityContributionMapLayer } from "./community-contribution-map-layer";
import { MerchantSearchField } from "./merchant-search-field";
import { ReportTypeSelector } from "./report-type-selector";
import styles from "./community-contributions.module.css";

function createInitialState(
  reportType: CommunityContributionReportType = "SIDEWALK_OBSTRUCTION",
): CommunityContributionFormState {
  return {
    reportType,
    location: null,
    reportedNewLocation: null,
    observedAtLocal: createDefaultObservedAtLocal(),
    details: "",
    notes: "",
    facilityType: "RAMP",
    targetMerchant: null,
    reportedPriceLevel: "",
    reportedOpeningHours: {},
  };
}

function isMerchantReport(reportType: CommunityContributionReportType) {
  return (
    reportType === "MERCHANT_LOCATION_CHANGED" ||
    reportType === "MERCHANT_PRICE_CHANGED" ||
    reportType === "MERCHANT_HOURS_CHANGED"
  );
}

const HISTORY_PAGE_SIZE = 10;

const STATUS_LABELS: Record<CommunityContributionStatus, string> = {
  APPROVED: "Diterima",
  PENDING: "Menunggu pemeriksaan",
  REJECTED: "Ditolak",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function CommunityContributionPage() {
  const [state, setState] = useState<CommunityContributionFormState>(() =>
    createInitialState(),
  );
  const [activeView, setActiveView] = useState<"create" | "history">("create");
  const [errors, setErrors] = useState<ContributionValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [created, setCreated] = useState<CommunityContribution | null>(null);
  const [history, setHistory] =
    useState<CommunityContributionHistoryResult | null>(null);
  const [historyFilters, setHistoryFilters] =
    useState<CommunityContributionHistoryFilters>({});
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const selectedLabel = CONTRIBUTION_REPORT_LABELS[state.reportType];
  const noteLabel = isMerchantReport(state.reportType) ? "Catatan" : "Deskripsi kondisi";
  const canSubmit = useMemo(() => !submitting, [submitting]);

  useEffect(() => {
    if (activeView !== "history") {
      return;
    }

    let ignore = false;

    getCommunityContributionHistory(
      historyPage,
      HISTORY_PAGE_SIZE,
      historyFilters,
    )
      .then((result) => {
        if (ignore) {
          return;
        }

        setHistory((current) =>
          historyPage === 1
            ? result
            : {
                ...result,
                items: [...(current?.items ?? []), ...result.items],
              },
        );
      })
      .catch((error) => {
        if (!ignore) {
          setHistoryError(
            error instanceof Error
              ? error.message
              : "Riwayat kontribusi gagal dimuat.",
          );
        }
      })
      .finally(() => {
        if (!ignore) {
          setHistoryLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [activeView, historyFilters, historyPage]);

  function updateState(next: Partial<CommunityContributionFormState>) {
    setState((current) => ({ ...current, ...next }));
  }

  function changeReportType(reportType: CommunityContributionReportType) {
    setCreated(null);
    setSubmitError(null);
    setErrors({});
    setState((current) => ({
      ...createInitialState(reportType),
      location: current.location,
      observedAtLocal: current.observedAtLocal,
    }));
  }

  async function submit() {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setErrors({});

    try {
      const payload = buildContributionPayload(state);
      const contribution = await createCommunityContribution(payload);
      setCreated(contribution);
    } catch (error) {
      if (error instanceof ContributionFormValidationError) {
        setErrors(error.errors);
      } else {
        setSubmitError(
          error instanceof Error
            ? error.message
            : "Laporan gagal dikirim. Coba lagi.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  function resetForAnotherReport() {
    setState(createInitialState());
    setErrors({});
    setSubmitError(null);
    setCreated(null);
  }

  function updateHistoryFilters(next: CommunityContributionHistoryFilters) {
    setHistoryFilters(next);
    setHistoryPage(1);
    setHistory(null);
    setHistoryLoading(true);
    setHistoryError(null);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>GETRA Community</span>
          <h1>Laporkan Kondisi Akses</h1>
          <p>
            Kirim laporan terstruktur dengan titik lokasi eksplisit. Semua laporan
            masuk sebagai PENDING untuk pemeriksaan.
          </p>
        </div>
        <Link className={styles.backLink} href="/community">
          <ArrowLeft aria-hidden="true" size={16} />
          Kembali ke Community
        </Link>
      </header>

      <nav className={styles.viewSwitch} aria-label="Kontribusi">
        <button
          aria-pressed={activeView === "create"}
          className={
            activeView === "create" ? styles.viewButtonActive : styles.viewButton
          }
          onClick={() => setActiveView("create")}
          type="button"
        >
          <Plus aria-hidden="true" size={15} />
          Buat Laporan
        </button>
        <button
          aria-pressed={activeView === "history"}
          className={
            activeView === "history" ? styles.viewButtonActive : styles.viewButton
          }
          onClick={() => {
            setActiveView("history");
            setHistoryPage(1);
            setHistoryLoading(true);
            setHistoryError(null);
          }}
          type="button"
        >
          <ListChecks aria-hidden="true" size={15} />
          Riwayat
        </button>
      </nav>

      {activeView === "history" ? (
        <section className={styles.historyPanel} aria-labelledby="history-title">
          <div className={styles.historyHeader}>
            <div>
              <span className={styles.eyebrow}>Riwayat Kontribusi</span>
              <h2 id="history-title">Kontribusi Anda</h2>
            </div>
            <button
              className={styles.secondaryButton}
              onClick={() => setActiveView("create")}
              type="button"
            >
              <Plus aria-hidden="true" size={15} />
              Buat Kontribusi
            </button>
          </div>

          <div className={styles.summaryGrid} aria-label="Ringkasan kontribusi">
            <div>
              <span>Contribution Points</span>
              <strong>{history?.summary.contributionPoints ?? 0}</strong>
            </div>
            <div>
              <span>Trust Score</span>
              <strong>{history?.summary.trustScore ?? 50}/100</strong>
            </div>
            <div>
              <span>Kontribusi</span>
              <strong>{history?.summary.totalContributions ?? 0}</strong>
            </div>
            <div>
              <span>Menunggu</span>
              <strong>{history?.summary.pendingCount ?? 0}</strong>
            </div>
            <div>
              <span>Diterima</span>
              <strong>{history?.summary.approvedCount ?? 0}</strong>
            </div>
            <div>
              <span>Ditolak</span>
              <strong>{history?.summary.rejectedCount ?? 0}</strong>
            </div>
          </div>

          <p className={styles.trustExplanation}>
            Trust Score mencerminkan konsistensi kontribusi yang telah selesai
            diperiksa. Kontribusi yang masih menunggu pemeriksaan belum
            memengaruhi skor.
          </p>

          <CommunityContributionMapLayer />

          <div className={styles.filterBar}>
            <label>
              <span>Status</span>
              <select
                aria-label="Filter status riwayat"
                onChange={(event) =>
                  updateHistoryFilters({
                    ...historyFilters,
                    status:
                      event.target.value === ""
                        ? undefined
                        : (event.target.value as CommunityContributionStatus),
                  })
                }
                value={historyFilters.status ?? ""}
              >
                <option value="">Semua</option>
                <option value="PENDING">Menunggu</option>
                <option value="APPROVED">Diterima</option>
                <option value="REJECTED">Ditolak</option>
              </select>
            </label>
            <label>
              <span>Jenis laporan</span>
              <select
                aria-label="Filter jenis laporan"
                onChange={(event) =>
                  updateHistoryFilters({
                    ...historyFilters,
                    reportType:
                      event.target.value === ""
                        ? undefined
                        : (event.target.value as CommunityContributionReportType),
                  })
                }
                value={historyFilters.reportType ?? ""}
              >
                <option value="">Semua jenis</option>
                {CONTRIBUTION_REPORT_OPTIONS.map((option) => (
                  <option key={option.type} value={option.type}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {historyError ? (
            <div className={styles.historyError} role="alert">
              <span>{historyError}</span>
              <button
                className={styles.secondaryButton}
                onClick={() => {
                  setHistoryPage(1);
                  setHistory(null);
                  setHistoryLoading(true);
                  setHistoryError(null);
                  setHistoryFilters({ ...historyFilters });
                }}
                type="button"
              >
                Coba lagi
              </button>
            </div>
          ) : null}

          {!history && historyLoading ? (
            <p className={styles.statusText}>Memuat riwayat kontribusi...</p>
          ) : null}

          {history && history.items.length === 0 && !historyLoading ? (
            <div className={styles.emptyState}>
              <strong>Belum ada kontribusi.</strong>
              <span>
                Laporkan kondisi akses atau perubahan data usaha di sekitar Anda.
              </span>
              <button
                className={styles.primaryButton}
                onClick={() => setActiveView("create")}
                type="button"
              >
                <Plus aria-hidden="true" size={15} />
                Buat Kontribusi
              </button>
            </div>
          ) : null}

          {history && history.items.length > 0 ? (
            <div className={styles.historyList}>
              {history.items.map((item) => (
                <article className={styles.historyCard} key={item.id}>
                  <div className={styles.historyCardHeader}>
                    <div>
                      <h3>{CONTRIBUTION_REPORT_LABELS[item.reportType]}</h3>
                      <span className={styles.statusBadge}>
                        {STATUS_LABELS[item.status]}
                      </span>
                    </div>
                    <strong>
                      {item.pointsAwarded > 0
                        ? `${item.pointsAwarded} poin`
                        : "Belum ada poin"}
                    </strong>
                  </div>
                  <dl className={styles.historyMeta}>
                    <div>
                      <dt>Dikirim</dt>
                      <dd>{formatDateTime(item.submittedAt)}</dd>
                    </div>
                    <div>
                      <dt>Diamati</dt>
                      <dd>{formatDateTime(item.observedAt)}</dd>
                    </div>
                    <div>
                      <dt>Lokasi</dt>
                      <dd>{item.locationSummary}</dd>
                    </div>
                    <div>
                      <dt>Target</dt>
                      <dd>{item.targetName ?? "Tidak ada target usaha"}</dd>
                    </div>
                    {item.status === "REJECTED" && item.reviewReason ? (
                      <div>
                        <dt>Alasan</dt>
                        <dd>
                          {CONTRIBUTION_REJECTION_REASON_LABELS[item.reviewReason]}
                        </dd>
                      </div>
                    ) : null}
                    {item.reviewedAt ? (
                      <div>
                        <dt>Direview</dt>
                        <dd>{formatDateTime(item.reviewedAt)}</dd>
                      </div>
                    ) : null}
                  </dl>
                </article>
              ))}
            </div>
          ) : null}

          {history?.pagination.hasMore ? (
            <button
              className={styles.secondaryButton}
              disabled={historyLoading}
              onClick={() => {
                setHistoryLoading(true);
                setHistoryError(null);
                setHistoryPage((current) => current + 1);
              }}
              type="button"
            >
              {historyLoading ? "Memuat..." : "Muat lebih banyak"}
            </button>
          ) : null}
        </section>
      ) : (
      <div className={styles.layout}>
        <aside className={styles.panel}>
          <ReportTypeSelector
            onChange={changeReportType}
            value={state.reportType}
          />
        </aside>

        <section className={styles.panel} aria-labelledby="contribution-form-title">
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <div>
              <span className={styles.eyebrow}>Form Laporan</span>
              <h2 id="contribution-form-title">{selectedLabel}</h2>
              <p>
                Backend tetap menjadi otoritas untuk validasi dan penyimpanan
                PostGIS.
              </p>
            </div>

            {created ? (
              <section className={styles.success} aria-live="polite">
                <strong>Laporan berhasil dikirim.</strong>
                <span>Status: Menunggu pemeriksaan.</span>
                <span>
                  Referensi: {created.id} · {CONTRIBUTION_REPORT_LABELS[created.reportType]}
                </span>
                <div className={styles.actions}>
                  <button
                    className={styles.secondaryButton}
                    onClick={resetForAnotherReport}
                    type="button"
                  >
                    <RotateCcw aria-hidden="true" size={15} />
                    Kirim laporan lain
                  </button>
                  <Link className={styles.backLink} href="/community">
                    Kembali ke Community
                  </Link>
                </div>
              </section>
            ) : null}

            <div className={styles.grid}>
              <label className={styles.field}>
                <span>Waktu kondisi ini diamati</span>
                <input
                  aria-describedby={errors.observedAt ? "observed-at-error" : undefined}
                  onChange={(event) =>
                    updateState({ observedAtLocal: event.target.value })
                  }
                  type="datetime-local"
                  value={state.observedAtLocal}
                />
                {errors.observedAt ? (
                  <p className={styles.errorText} id="observed-at-error">
                    {errors.observedAt}
                  </p>
                ) : null}
              </label>

              {state.reportType === "RAMP_OR_GUIDING_BLOCK" ? (
                <label className={styles.field}>
                  <span>Jenis fasilitas</span>
                  <select
                    onChange={(event) =>
                      updateState({
                        facilityType:
                          event.target.value === "GUIDING_BLOCK"
                            ? "GUIDING_BLOCK"
                            : "RAMP",
                      })
                    }
                    value={state.facilityType}
                  >
                    <option value="RAMP">Ramp</option>
                    <option value="GUIDING_BLOCK">Guiding block</option>
                  </select>
                </label>
              ) : null}

              {isMerchantReport(state.reportType) ? (
                <div className={styles.fullField}>
                  <MerchantSearchField
                    error={errors.targetMerchant}
                    onChange={(targetMerchant) => updateState({ targetMerchant })}
                    value={state.targetMerchant}
                  />
                </div>
              ) : null}

              {state.reportType === "MERCHANT_PRICE_CHANGED" ? (
                <label className={styles.fullField}>
                  <span>Harga yang diamati</span>
                  <textarea
                    onChange={(event) =>
                      updateState({ reportedPriceLevel: event.target.value })
                    }
                    placeholder="Contoh: Rp15.000-Rp25.000 untuk menu makan siang"
                    value={state.reportedPriceLevel}
                  />
                  {errors.reportedPriceLevel ? (
                    <p className={styles.errorText}>{errors.reportedPriceLevel}</p>
                  ) : null}
                </label>
              ) : null}

              {state.reportType === "MERCHANT_HOURS_CHANGED" ? (
                <div className={styles.fullField}>
                  <span>Jam buka yang dilaporkan</span>
                  <div className={styles.hoursGrid}>
                    {OPENING_HOUR_DAY_OPTIONS.map((day) => (
                      <label className={styles.hourRow} key={day.key}>
                        <span>{day.label}</span>
                        <input
                          onChange={(event) =>
                            updateState({
                              reportedOpeningHours: {
                                ...state.reportedOpeningHours,
                                [day.key]: event.target.value,
                              },
                            })
                          }
                          placeholder="Contoh: 08:00-17:00"
                          value={state.reportedOpeningHours[day.key] ?? ""}
                        />
                      </label>
                    ))}
                  </div>
                  {errors.reportedOpeningHours ? (
                    <p className={styles.errorText}>{errors.reportedOpeningHours}</p>
                  ) : null}
                </div>
              ) : null}

              {state.reportType !== "MERCHANT_HOURS_CHANGED" &&
              state.reportType !== "MERCHANT_PRICE_CHANGED" ? (
                <label className={styles.fullField}>
                  <span>{noteLabel}</span>
                  <textarea
                    maxLength={CONTRIBUTION_DETAILS_MAX_LENGTH}
                    onChange={(event) =>
                      isMerchantReport(state.reportType)
                        ? updateState({ notes: event.target.value })
                        : updateState({ details: event.target.value })
                    }
                    placeholder={
                      state.reportType === "SIDEWALK_OBSTRUCTION"
                        ? "Contoh: kendaraan parkir menutup jalur kursi roda"
                        : "Tuliskan kondisi yang Anda amati"
                    }
                    value={
                      isMerchantReport(state.reportType)
                        ? state.notes
                        : state.details
                    }
                  />
                  {errors.details ? (
                    <p className={styles.errorText}>{errors.details}</p>
                  ) : null}
                </label>
              ) : null}

              {state.reportType === "MERCHANT_PRICE_CHANGED" ||
              state.reportType === "MERCHANT_HOURS_CHANGED" ? (
                <label className={styles.fullField}>
                  <span>Catatan</span>
                  <textarea
                    maxLength={CONTRIBUTION_DETAILS_MAX_LENGTH}
                    onChange={(event) => updateState({ notes: event.target.value })}
                    placeholder="Catatan tambahan bila ada"
                    value={state.notes}
                  />
                </label>
              ) : null}
            </div>

            <ContributionLocationPicker
              error={errors.location}
              label="Lokasi kejadian"
              onChange={(location: CommunityContributionPoint) =>
                updateState({ location })
              }
              value={state.location}
            />

            {state.reportType === "MERCHANT_LOCATION_CHANGED" ? (
              <ContributionLocationPicker
                error={errors.reportedNewLocation}
                label="Lokasi baru yang dilaporkan"
                onChange={(reportedNewLocation: CommunityContributionPoint) =>
                  updateState({ reportedNewLocation })
                }
                value={state.reportedNewLocation}
              />
            ) : null}

            {submitError ? (
              <p className={styles.errorText} role="alert">
                {submitError}
              </p>
            ) : null}

            <div className={styles.actions}>
              <p className={styles.help}>
                Tidak ada poin, Trust Score, atau pembaruan data usaha langsung
                pada tahap ini.
              </p>
              <button
                className={styles.primaryButton}
                disabled={!canSubmit}
                type="submit"
              >
                <Send aria-hidden="true" size={15} />
                {submitting ? "Mengirim..." : "Kirim laporan"}
              </button>
            </div>
          </form>
        </section>
      </div>
      )}
    </main>
  );
}
