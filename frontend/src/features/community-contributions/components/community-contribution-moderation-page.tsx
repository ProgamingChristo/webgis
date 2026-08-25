"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, RefreshCw, X } from "lucide-react";

import {
  confirmCommunityContribution,
  getCommunityContributionModerationDetail,
  getCommunityContributionModerationQueue,
  rejectCommunityContribution,
} from "../api/community-contributions.api";
import {
  CONTRIBUTION_REJECTION_REASON_LABELS,
  CONTRIBUTION_REJECTION_REASON_OPTIONS,
  CONTRIBUTION_REPORT_LABELS,
  CONTRIBUTION_REPORT_OPTIONS,
} from "../constants";
import type {
  CommunityContributionModerationDetail,
  CommunityContributionModerationFilters,
  CommunityContributionModerationResult,
  CommunityContributionRejectionReason,
  CommunityContributionReportType,
  CommunityContributionStatus,
} from "../types/community-contributions.types";
import styles from "./community-contributions.module.css";

const PAGE_SIZE = 20;

const STATUS_LABELS: Record<CommunityContributionStatus, string> = {
  APPROVED: "Diterima",
  PENDING: "Menunggu",
  REJECTED: "Ditolak",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function stringifyPayload(payload: unknown) {
  return JSON.stringify(payload, null, 2);
}

export function CommunityContributionModerationPage() {
  const [queue, setQueue] =
    useState<CommunityContributionModerationResult | null>(null);
  const [selected, setSelected] =
    useState<CommunityContributionModerationDetail | null>(null);
  const [filters, setFilters] = useState<CommunityContributionModerationFilters>({
    status: "PENDING",
  });
  const [page, setPage] = useState(1);
  const [reason, setReason] =
    useState<CommunityContributionRejectionReason>("INSUFFICIENT_INFORMATION");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [acting, setActing] = useState<"confirm" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    getCommunityContributionModerationQueue(page, PAGE_SIZE, filters)
      .then((result) => {
        if (ignore) {
          return;
        }

        setQueue(result);
      })
      .catch((nextError) => {
        if (!ignore) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Antrean moderasi gagal dimuat.",
          );
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [filters, page]);

  async function selectContribution(contributionId: string) {
    setDetailLoading(true);
    setError(null);

    try {
      setSelected(
        await getCommunityContributionModerationDetail(contributionId),
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Detail kontribusi gagal dimuat.",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  function refreshQueue() {
    setSelected(null);
    setQueue(null);
    setLoading(true);
    setError(null);
    setPage(1);
    setFilters({ ...filters });
  }

  async function confirmSelected() {
    if (!selected || acting) {
      return;
    }

    setActing("confirm");
    setError(null);

    try {
      const reviewed = await confirmCommunityContribution(selected.id);
      setSelected(reviewed);
      refreshQueue();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Konfirmasi kontribusi gagal.",
      );
    } finally {
      setActing(null);
    }
  }

  async function rejectSelected() {
    if (!selected || acting) {
      return;
    }

    setActing("reject");
    setError(null);

    try {
      const reviewed = await rejectCommunityContribution(selected.id, reason);
      setSelected(reviewed);
      refreshQueue();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Penolakan kontribusi gagal.",
      );
    } finally {
      setActing(null);
    }
  }

  function updateFilters(next: CommunityContributionModerationFilters) {
    setSelected(null);
    setQueue(null);
    setLoading(true);
    setError(null);
    setPage(1);
    setFilters(next);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Admin Community</span>
          <h1>Moderasi Kontribusi Akses</h1>
          <p>
            Review laporan PENDING, setujui untuk memberi poin, atau tolak
            dengan alasan aman untuk pengguna.
          </p>
        </div>
        <Link className={styles.backLink} href="/community">
          <ArrowLeft aria-hidden="true" size={16} />
          Kembali
        </Link>
      </header>

      <section className={styles.historyPanel} aria-label="Filter moderasi">
        <div className={styles.filterBar}>
          <label>
            <span>Status</span>
            <select
              onChange={(event) =>
                updateFilters({
                  ...filters,
                  status: event.target.value as CommunityContributionStatus,
                })
              }
              value={filters.status ?? "PENDING"}
            >
              <option value="PENDING">Menunggu</option>
              <option value="APPROVED">Diterima</option>
              <option value="REJECTED">Ditolak</option>
            </select>
          </label>
          <label>
            <span>Jenis laporan</span>
            <select
              onChange={(event) =>
                updateFilters({
                  ...filters,
                  reportType:
                    event.target.value === ""
                      ? undefined
                      : (event.target.value as CommunityContributionReportType),
                })
              }
              value={filters.reportType ?? ""}
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
      </section>

      {error ? (
        <div className={styles.historyError} role="alert">
          <span>{error}</span>
          <button className={styles.secondaryButton} onClick={refreshQueue} type="button">
            <RefreshCw aria-hidden="true" size={15} />
            Muat ulang
          </button>
        </div>
      ) : null}

      <div className={styles.moderationLayout}>
        <section className={styles.historyPanel} aria-label="Antrean kontribusi">
          <div className={styles.historyHeader}>
            <div>
              <span className={styles.eyebrow}>Antrean</span>
              <h2>{queue?.pagination.total ?? 0} kontribusi</h2>
            </div>
            <button className={styles.secondaryButton} onClick={refreshQueue} type="button">
              <RefreshCw aria-hidden="true" size={15} />
              Refresh
            </button>
          </div>

          {loading ? <p className={styles.statusText}>Memuat antrean...</p> : null}

          {!loading && queue?.items.length === 0 ? (
            <div className={styles.emptyState}>
              <strong>Tidak ada kontribusi pada filter ini.</strong>
              <span>Antrean PENDING diurutkan dari laporan tertua.</span>
            </div>
          ) : null}

          <div className={styles.historyList}>
            {queue?.items.map((item) => (
              <button
                className={
                  selected?.id === item.id
                    ? styles.moderationItemActive
                    : styles.moderationItem
                }
                key={item.id}
                onClick={() => void selectContribution(item.id)}
                type="button"
              >
                <strong>{CONTRIBUTION_REPORT_LABELS[item.reportType]}</strong>
                <span>{item.authorDisplayName}</span>
                <span>
                  {STATUS_LABELS[item.status]} | {formatDateTime(item.createdAt)}
                </span>
                <span>{item.locationSummary}</span>
              </button>
            ))}
          </div>

          {queue && queue.pagination.totalPages > 1 ? (
            <div className={styles.actions}>
              <button
                className={styles.secondaryButton}
                disabled={page <= 1 || loading}
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  setPage((current) => Math.max(1, current - 1));
                }}
                type="button"
              >
                Sebelumnya
              </button>
              <span className={styles.statusText}>
                Halaman {queue.pagination.page} / {queue.pagination.totalPages}
              </span>
              <button
                className={styles.secondaryButton}
                disabled={!queue.pagination.hasMore || loading}
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  setPage((current) => current + 1);
                }}
                type="button"
              >
                Berikutnya
              </button>
            </div>
          ) : null}
        </section>

        <section className={styles.historyPanel} aria-label="Detail kontribusi">
          {detailLoading ? (
            <p className={styles.statusText}>Memuat detail...</p>
          ) : null}

          {!selected && !detailLoading ? (
            <div className={styles.emptyState}>
              <strong>Pilih kontribusi.</strong>
              <span>Detail aman akan tampil tanpa email, nomor telepon, atau metadata auth.</span>
            </div>
          ) : null}

          {selected ? (
            <>
              <div className={styles.historyHeader}>
                <div>
                  <span className={styles.eyebrow}>Detail</span>
                  <h2>{CONTRIBUTION_REPORT_LABELS[selected.reportType]}</h2>
                </div>
                <span className={styles.statusBadge}>
                  {STATUS_LABELS[selected.status]}
                </span>
              </div>

              <dl className={styles.historyMeta}>
                <div>
                  <dt>Kontributor</dt>
                  <dd>{selected.authorDisplayName}</dd>
                </div>
                <div>
                  <dt>Dikirim</dt>
                  <dd>{formatDateTime(selected.submittedAt)}</dd>
                </div>
                <div>
                  <dt>Diamati</dt>
                  <dd>{formatDateTime(selected.observedAt)}</dd>
                </div>
                <div>
                  <dt>Target</dt>
                  <dd>{selected.targetName ?? "Tidak ada target usaha"}</dd>
                </div>
                <div>
                  <dt>Lokasi</dt>
                  <dd>
                    {selected.location.latitude.toFixed(6)},{" "}
                    {selected.location.longitude.toFixed(6)}
                  </dd>
                </div>
                <div>
                  <dt>Poin</dt>
                  <dd>{selected.pointsAwarded}</dd>
                </div>
                {selected.reviewReason ? (
                  <div>
                    <dt>Alasan</dt>
                    <dd>
                      {CONTRIBUTION_REJECTION_REASON_LABELS[selected.reviewReason]}
                    </dd>
                  </div>
                ) : null}
              </dl>

              <pre className={styles.payloadBlock}>
                {stringifyPayload(selected.reportData)}
              </pre>

              {selected.status === "PENDING" ? (
                <div className={styles.moderationActions}>
                  <button
                    className={styles.primaryButton}
                    disabled={acting !== null}
                    onClick={() => void confirmSelected()}
                    type="button"
                  >
                    <Check aria-hidden="true" size={15} />
                    {acting === "confirm" ? "Menyetujui..." : "Setujui"}
                  </button>
                  <label className={styles.reasonField}>
                    <span>Alasan penolakan</span>
                    <select
                      onChange={(event) =>
                        setReason(
                          event.target.value as CommunityContributionRejectionReason,
                        )
                      }
                      value={reason}
                    >
                      {CONTRIBUTION_REJECTION_REASON_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className={styles.secondaryButton}
                    disabled={acting !== null}
                    onClick={() => void rejectSelected()}
                    type="button"
                  >
                    <X aria-hidden="true" size={15} />
                    {acting === "reject" ? "Menolak..." : "Tolak"}
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}
