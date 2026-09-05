"use client";

import {
  Activity,
  Building2,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  ReceiptText,
  RefreshCw,
  Store,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { GetraAppShell } from "@/src/components/getra-ui";
import { useAuth } from "@/src/components/providers/AuthProvider";
import {
  adminMissionSyncService,
  MISSION_SOURCES,
  type MissionSource,
  type MissionSyncStatus,
  type MissionSyncSummary,
} from "@/src/services/admin-mission-sync.service";

import styles from "./mission-data.module.css";

const SOURCE_DETAILS = {
  MENU_GO: {
    label: "Menu Go",
    domain: "Observasi merchant lapangan",
    icon: Store,
  },
  STRUK_GO: {
    label: "Struk Go",
    domain: "Observasi transaksi",
    icon: ReceiptText,
  },
  PROPERTI_GO: {
    label: "Properti Go",
    domain: "Observasi properti",
    icon: Building2,
  },
  ACTIVITIES: {
    label: "Activities",
    domain: "Observasi lapangan dan konteks",
    icon: Activity,
  },
} satisfies Record<MissionSource, { label: string; domain: string; icon: typeof Store }>;

const STATUS_LABELS: Record<MissionSyncStatus | "UNKNOWN" | "ERROR", string> = {
  UNKNOWN: "Belum diketahui",
  ERROR: "Status tidak tersedia",
  NEVER_SYNCED: "Belum disinkronkan",
  RUNNING: "Sinkronisasi",
  COMPLETED: "Berhasil",
  PARTIAL: "Peringatan",
  FAILED: "Gagal",
  BLOCKED: "Terblokir",
};

function emptySummary(source: MissionSource): MissionSyncSummary {
  return {
    duration_ms: null,
    error_summary: null,
    failed: null,
    fetched: null,
    finished_at: null,
    inserted: null,
    invalid: null,
    pages_fetched: null,
    skipped: null,
    source,
    started_at: null,
    status: "NEVER_SYNCED",
    updated: null,
  };
}

export default function AdminMissionDataPage() {
  const { context } = useAuth();
  const [summaries, setSummaries] = useState<MissionSyncSummary[]>(() =>
    MISSION_SOURCES.map(emptySummary),
  );
  const [syncing, setSyncing] = useState<Set<MissionSource>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [sourceErrors, setSourceErrors] = useState<Partial<Record<MissionSource, string>>>({});

  const isAdmin = context?.profile?.account_role === "ADMIN";

  const summaryBySource = useMemo(
    () => new Map(summaries.map((summary) => [summary.source, summary])),
    [summaries],
  );

  const loadLatest = useCallback(async (showRefreshState = false) => {
    if (showRefreshState) setRefreshing(true);
    try {
      const latest = await adminMissionSyncService.getLatest();
      setSummaries(latest);
      setPageError(null);
    } catch (error) {
      setPageError(getSafeUiError(error, "Status sinkronisasi tidak dapat dimuat."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) void loadLatest();
  }, [isAdmin, loadLatest]);

  async function syncSource(source: MissionSource) {
    if (syncing.has(source)) return;

    setSyncing((current) => new Set(current).add(source));
    setSourceErrors((current) => ({ ...current, [source]: undefined }));

    try {
      const result = await adminMissionSyncService.sync(source);
      setSummaries((current) =>
        current.map((summary) => (summary.source === source ? result : summary)),
      );
      if (result.status === "FAILED" || result.status === "BLOCKED") {
        setSourceErrors((current) => ({
          ...current,
          [source]: result.error_summary ?? "Sinkronisasi tidak dapat diselesaikan.",
        }));
      }
      await loadLatest();
    } catch (error) {
      setSourceErrors((current) => ({
        ...current,
        [source]: getSafeUiError(error, "Sinkronisasi tidak dapat diselesaikan."),
      }));
    } finally {
      setSyncing((current) => {
        const next = new Set(current);
        next.delete(source);
        return next;
      });
    }
  }

  if (!isAdmin) return null;

  return (
    <GetraAppShell
      actions={
        <button
          aria-label="Muat ulang status sinkronisasi"
          className={styles.refreshButton}
          disabled={refreshing}
          onClick={() => void loadLatest(true)}
          title="Muat ulang status"
          type="button"
        >
          <RefreshCw className={refreshing ? styles.spinning : undefined} size={17} />
        </button>
      }
      eyebrow="Admin"
      title="Mission Data"
      tone="admin"
    >
      <section aria-busy={loading} className={styles.workspace}>
        <div className={styles.summaryBar}>
          <div>
            <span>Sumber</span>
            <strong>4</strong>
          </div>
          <div>
            <span>Aktif</span>
            <strong>{syncing.size}</strong>
          </div>
          <div>
            <span>Sinkron terakhir</span>
            <strong>{pageError ? "Tidak tersedia" : loading || refreshing ? "Memuat..." : formatLatestDate(summaries)}</strong>
          </div>
        </div>

        {pageError ? (
          <div className={styles.pageError} role="alert">
            <TriangleAlert size={17} />
            <span>{pageError}</span>
          </div>
        ) : null}

        <div className={styles.sourceGrid}>
          {MISSION_SOURCES.map((source) => {
            const details = SOURCE_DETAILS[source];
            const summary = summaryBySource.get(source) ?? emptySummary(source);
            const isSyncing = syncing.has(source);
            const status = isSyncing ? "RUNNING" : loading || refreshing ? "UNKNOWN" : pageError ? "ERROR" : summary.status;
            const unavailable = status === "UNKNOWN" || status === "ERROR";
            const Icon = details.icon;

            return (
              <article className={styles.sourceCard} key={source}>
                <header className={styles.cardHeader}>
                  <div className={styles.sourceIdentity}>
                    <span className={styles.sourceIcon}>
                      <Icon size={19} />
                    </span>
                    <div>
                      <h2>{details.label}</h2>
                      <p>{details.domain}</p>
                    </div>
                  </div>
                  <span className={`${styles.status} ${styles[`status${status}`]}`}>
                    {status === "RUNNING" ? (
                      <LoaderCircle className={styles.spinning} size={14} />
                    ) : status === "COMPLETED" ? (
                      <CheckCircle2 size={14} />
                    ) : status === "FAILED" || status === "BLOCKED" || status === "ERROR" ? (
                      <TriangleAlert size={14} />
                    ) : (
                      <Clock3 size={14} />
                    )}
                    {STATUS_LABELS[status]}
                  </span>
                </header>

                <div className={styles.lastSync}>
                  <span>Sinkron terakhir</span>
                  <strong>{unavailable ? "Tidak tersedia" : formatDate(summary.finished_at)}</strong>
                  {!unavailable && summary.duration_ms !== null ? (
                    <small>{formatDuration(summary.duration_ms)}</small>
                  ) : null}
                </div>

                {!unavailable && summary.fetched !== null ? (
                  <dl className={styles.metrics}>
                    <Metric label="Diambil" value={summary.fetched} />
                    <Metric label="Baru" value={summary.inserted} />
                    <Metric label="Diperbarui" value={summary.updated} />
                    <Metric label="Dilewati" value={summary.skipped} />
                    <Metric label="Invalid" value={summary.invalid} tone="warning" />
                    <Metric label="Gagal" value={summary.failed} tone="danger" />
                  </dl>
                ) : (
                  <div className={styles.emptyMetrics}>{unavailable ? "Status belum dapat dipastikan." : "Belum ada hasil sinkronisasi."}</div>
                )}

                {sourceErrors[source] ? (
                  <div className={styles.sourceError} role="alert">
                    {sourceErrors[source]}
                  </div>
                ) : null}

                <button
                  className={styles.syncButton}
                  disabled={isSyncing || unavailable}
                  onClick={() => void syncSource(source)}
                  type="button"
                >
                  {isSyncing ? (
                    <LoaderCircle className={styles.spinning} size={16} />
                  ) : (
                    <RefreshCw size={16} />
                  )}
                  {isSyncing ? "Menyinkronkan" : `Sync ${details.label}`}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </GetraAppShell>
  );
}

function Metric({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: "warning" | "danger";
  value: number | null;
}) {
  if (value === null) return null;
  return (
    <div className={tone ? styles[tone] : undefined}>
      <dt>{label}</dt>
      <dd>{value.toLocaleString("id-ID")}</dd>
    </div>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "Belum pernah";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function formatLatestDate(summaries: MissionSyncSummary[]): string {
  const latest = summaries
    .map((summary) => summary.finished_at)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
  return latest ? formatDate(latest) : "Belum ada";
}

function formatDuration(milliseconds: number): string {
  if (milliseconds < 1_000) return `${milliseconds} ms`;
  return `${(milliseconds / 1_000).toFixed(1)} dtk`;
}

function getSafeUiError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  if (
    error.message === "Failed to fetch" ||
    error.message === "Internal server error" ||
    error.message === "Request GETRA gagal."
  ) {
    return "Server GETRA tidak dapat menyelesaikan sinkronisasi.";
  }
  return error.message;
}
