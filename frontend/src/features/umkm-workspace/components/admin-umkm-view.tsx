"use client";

import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Store,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import React, { useMemo } from "react";

import { GetraAppShell } from "@/src/components/getra-ui";
import type { MerchantSubmissionRecord } from "@/src/features/merchant-submission";
import type { AdminMerchantClaimRecord } from "@/src/services/admin-umkm-review.service";

export type ReviewItem =
  | {
      kind: "CLAIM";
      id: string;
      merchantName: string;
      typeLabel: string;
      status: AdminMerchantClaimRecord["status"];
      context: string;
      owner: string;
      createdAt: string;
      detailHref: null;
      riskLabel: string;
      riskTone: "LOW" | "REVIEW" | "CONFLICT";
      validationLabel: string;
      sourceLabel: string;
      evidenceLabel: string;
      raw: AdminMerchantClaimRecord;
    }
  | {
      kind: "REGISTRATION";
      id: string;
      merchantName: string;
      typeLabel: string;
      status: MerchantSubmissionRecord["status"];
      context: string;
      owner: string;
      createdAt: string;
      detailHref: string;
      riskLabel: string;
      riskTone: "LOW" | "REVIEW" | "CONFLICT";
      validationLabel: string;
      sourceLabel: string;
      evidenceLabel: string;
      raw: MerchantSubmissionRecord;
    };

export interface AdminUmkmViewProps {
  isAdmin: boolean;
  loading: boolean;
  refreshing?: boolean;
  error: string | null;
  warning?: string | null;
  actionError?: string | null;
  actionSuccess?: string | null;
  claims: AdminMerchantClaimRecord[];
  submissions: MerchantSubmissionRecord[];
  actionId?: string | null;
  onRefresh?: () => void;
  onApprove?: (item: ReviewItem) => void;
  onReject?: (item: ReviewItem) => void;
  onDismissActionError?: () => void;
  onDismissActionSuccess?: () => void;
  onDismissWarning?: () => void;
}

export function AdminUmkmView({
  isAdmin,
  loading,
  refreshing = false,
  error,
  warning = null,
  actionError,
  actionSuccess,
  claims,
  submissions,
  actionId = null,
  onRefresh,
  onApprove,
  onReject,
  onDismissActionError,
  onDismissActionSuccess,
  onDismissWarning,
}: AdminUmkmViewProps) {
  const items = useMemo<ReviewItem[]>(() => {
    const claimItems: ReviewItem[] = claims.map((claim) => ({
      kind: "CLAIM",
      id: claim.id,
      merchantName: claim.merchant_name,
      typeLabel: "Klaim kepemilikan usaha",
      status: claim.status,
      context: `Usaha terdaftar / ${claim.merchant_category} / ${claim.merchant_address || "Lokasi tersimpan"}`,
      owner: claim.submitted_by_name,
      createdAt: claim.created_at,
      detailHref: null,
      riskLabel: claim.has_ownership_conflict
        ? "Konflik kepemilikan"
        : claim.status === "PENDING"
          ? "Perlu pemeriksaan"
          : "Rendah",
      riskTone: claim.has_ownership_conflict
        ? "CONFLICT"
        : claim.status === "PENDING"
          ? "REVIEW"
          : "LOW",
      validationLabel: claim.has_ownership_conflict
        ? "Usaha sudah memiliki pemilik terverifikasi."
        : "Klaim kepemilikan menunggu pemeriksaan admin.",
      sourceLabel: claim.merchant_publish_status || "Usaha terdaftar",
      evidenceLabel:
        [
          claim.evidence.relationship,
          claim.evidence.contact_name,
          claim.evidence.contact_phone,
          claim.evidence.statement,
        ]
          .filter(Boolean)
          .join(" · ") || "Bukti klaim belum tersedia pada record lama.",
      raw: claim,
    }));

    const registrationItems: ReviewItem[] = submissions.map((submission) => ({
      kind: "REGISTRATION",
      id: submission.id,
      merchantName: submission.name,
      typeLabel: "Pendaftaran usaha baru",
      status: submission.status,
      context: `${submission.category} / ${submission.address || "Lokasi tersimpan"}`,
      owner: submission.submitted_by ? `User ${submission.submitted_by.slice(0, 8)}...` : "Pemilik UMKM",
      createdAt: submission.created_at,
      detailHref: `/umkm/submissions/${submission.id}`,
      riskLabel: submission.status === "PENDING_REVIEW" ? "Rendah" : "Perlu pemeriksaan",
      riskTone: submission.status === "PENDING_REVIEW" ? "LOW" : "REVIEW",
      validationLabel:
        submission.status === "PENDING_REVIEW"
          ? "Pemeriksaan data & lokasi siap dilanjutkan."
          : "Status pengajuan perlu diperiksa sebelum verifikasi.",
      sourceLabel: "GETRA Pendaftar",
      evidenceLabel: submission.image_url
        ? "Foto utama pengajuan tersedia & terunggah."
        : "Foto utama belum dilampirkan.",
      raw: submission,
    }));

    return [...claimItems, ...registrationItems].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    );
  }, [claims, submissions]);

  const pendingCount = items.filter(
    (item) => item.status === "PENDING" || item.status === "PENDING_REVIEW"
  ).length;
  const lowRiskCount = items.filter((item) => item.riskTone === "LOW").length;
  const needsReviewCount = items.filter((item) => item.riskTone === "REVIEW").length;
  const ownershipConflictCount = items.filter((item) => item.riskTone === "CONFLICT").length;
  const rejectedCount = items.filter((item) => item.status === "REJECTED").length;

  if (!isAdmin) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
        <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg">
          <ShieldCheck className="mx-auto mb-4 text-sky-600" size={36} />
          <p className="text-[11px] font-bold uppercase tracking-widest text-sky-700">Khusus Admin</p>
          <h1 className="mt-2 text-xl font-bold text-slate-900">Akses admin dibutuhkan</h1>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Halaman pemeriksaan UMKM hanya tersedia untuk akun admin.
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <GetraAppShell
      actions={
        <button
          aria-label="Muat ulang pemeriksaan UMKM"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
          disabled={refreshing}
          onClick={onRefresh}
          type="button"
        >
          <RefreshCw className={refreshing ? "animate-spin text-sky-600" : undefined} size={15} />
        </button>
      }
      eyebrow="Admin Operasional"
      title="Pemeriksaan UMKM"
      description="Kelola pendaftaran usaha baru dan klaim kepemilikan dari satu antrean pemeriksaan terpusat."
      tone="admin"
    >
      <section className="grid gap-5">
        {/* Metric cards */}
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={ClipboardCheck}
            label="Menunggu"
            value={error ? "—" : pendingCount}
            accent="amber"
          />
          <MetricCard
            icon={CheckCircle2}
            label="Risiko Rendah"
            value={error ? "—" : lowRiskCount}
            accent="emerald"
          />
          <MetricCard
            icon={AlertTriangle}
            label="Perlu Pemeriksaan"
            value={error ? "—" : needsReviewCount}
            accent="orange"
          />
          <MetricCard
            icon={BadgeCheck}
            label="Konflik Kepemilikan"
            value={error ? "—" : ownershipConflictCount}
            accent="rose"
          />
        </div>

        {/* Global Action Error Banner (e.g. mutate failure) - queue remains visible! */}
        {actionError ? (
          <div
            className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800 shadow-sm"
            role="alert"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="flex-shrink-0 text-rose-600" />
              <span>{actionError}</span>
            </div>
            {onDismissActionError ? (
              <button
                type="button"
                onClick={onDismissActionError}
                className="rounded-lg p-1 text-rose-600 hover:bg-rose-100 transition"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
        ) : null}

        {/* Scoped Partial Warning Banner (non-critical enrichment failed, queue remains fully functional) */}
        {warning ? (
          <div
            className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900 shadow-sm"
            role="status"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="flex-shrink-0 text-amber-600" />
              <span>{warning}</span>
            </div>
            {onDismissWarning ? (
              <button
                type="button"
                onClick={onDismissWarning}
                className="rounded-lg p-1 text-amber-700 hover:bg-amber-100 transition"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
        ) : null}

        {/* Global Action Success Banner */}
        {actionSuccess ? (
          <div
            className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="flex-shrink-0 text-emerald-600" />
              <span>{actionSuccess}</span>
            </div>
            {onDismissActionSuccess ? (
              <button
                type="button"
                onClick={onDismissActionSuccess}
                className="rounded-lg p-1 text-emerald-600 hover:bg-emerald-100 transition"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
        ) : null}

        {/* Review queue section */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-950">Antrean Pemeriksaan UMKM</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Prioritaskan verifikasi lokasi, kelengkapan berkas, dan kasus klaim kepemilikan.
              </p>
            </div>
            <p className="whitespace-nowrap text-xs font-medium text-slate-500">
              {rejectedCount} riwayat penolakan tersimpan sebagai audit trail.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-xs font-medium text-slate-600">
              <LoaderCircle className="animate-spin text-sky-600" size={18} />
              <span>Memuat antrean pemeriksaan UMKM dari database...</span>
            </div>
          ) : error ? (
            <div
              className="rounded-2xl border border-rose-200 bg-rose-50/80 p-8 text-center"
              data-testid="queue-error-state"
              role="alert"
            >
              <AlertTriangle className="mx-auto text-rose-500" size={32} />
              <p className="mt-3 text-sm font-bold text-rose-950">Antrean pemeriksaan belum dapat dimuat</p>
              <p className="mt-1 text-xs text-rose-700/90">{error}</p>
              <button
                type="button"
                onClick={onRefresh}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-700 shadow-sm transition hover:bg-rose-50"
              >
                <RefreshCw size={13} />
                Coba lagi
              </button>
            </div>
          ) : items.length === 0 ? (
            <div
              className="rounded-2xl border border-slate-200 bg-slate-50/60 p-8 text-center"
              data-testid="queue-empty-state"
            >
              <CheckCircle2 className="mx-auto text-emerald-600" size={32} />
              <p className="mt-3 text-sm font-bold text-slate-900">Tidak ada pemeriksaan UMKM aktif.</p>
              <p className="mt-1 text-xs text-slate-500">Klaim dan pendaftaran baru akan muncul di sini.</p>
            </div>
          ) : (
            <div className="grid gap-3.5">
              {items.map((item) => (
                <ReviewCard
                  actionId={actionId}
                  item={item}
                  key={`${item.kind}-${item.id}`}
                  onApprove={() => onApprove?.(item)}
                  onReject={() => onReject?.(item)}
                />
              ))}
            </div>
          )}
        </section>
      </section>
    </GetraAppShell>
  );
}

function ReviewCard({
  actionId,
  item,
  onApprove,
  onReject,
}: {
  actionId: string | null;
  item: ReviewItem;
  onApprove: () => void;
  onReject: () => void;
}) {
  const isPending = item.status === "PENDING" || item.status === "PENDING_REVIEW";
  const approving = actionId === `${item.kind}:${item.id}:approve`;
  const rejecting = actionId === `${item.kind}:${item.id}:reject`;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-300 hover:shadow-md sm:p-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-sky-100 bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700">
              {item.typeLabel}
            </span>
            <span className="text-xs text-slate-300">•</span>
            <span className="text-xs text-slate-500">{item.sourceLabel}</span>
          </div>
          <h3 className="text-base font-bold text-slate-950 sm:text-lg">{item.merchantName}</h3>
          <p className="text-xs leading-5 text-slate-600">{item.context}</p>
        </div>

        <StatusBadge status={item.status} />
      </header>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <ReviewFact label="Pengaju" value={item.owner} />
        <ReviewFact label="Tanggal Masuk" value={formatDate(item.createdAt)} />
        <ReviewFact label="Indikator Risiko" tone={item.riskTone} value={item.riskLabel} />
      </div>

      <div className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50 p-3 text-xs">
        <p className="font-bold text-slate-900">{item.validationLabel}</p>
        <p className="mt-1 leading-relaxed text-slate-600">{item.evidenceLabel}</p>
      </div>

      <footer className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs font-medium text-slate-500">
          {getStateDescription(item.status)}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {item.detailHref ? (
            <Link
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
              href={item.detailHref}
            >
              Lihat detail
            </Link>
          ) : null}

          {isPending ? (
            <>
              <button
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-40"
                disabled={rejecting || approving}
                onClick={onReject}
                type="button"
              >
                {rejecting ? (
                  <LoaderCircle size={13} className="animate-spin" />
                ) : (
                  <XCircle size={13} />
                )}
                Tolak
              </button>
              <button
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-40"
                disabled={approving || rejecting}
                onClick={onApprove}
                type="button"
              >
                {approving ? (
                  <LoaderCircle size={13} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={13} />
                )}
                Setujui
              </button>
            </>
          ) : null}
        </div>
      </footer>
    </article>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  accent = "amber",
}: {
  icon: typeof Store;
  label: string;
  value: number | string;
  accent?: "amber" | "emerald" | "orange" | "rose";
}) {
  const accentMap = {
    amber: {
      icon: "border-amber-200 bg-amber-50 text-amber-700",
      value: "text-amber-800",
    },
    emerald: {
      icon: "border-emerald-200 bg-emerald-50 text-emerald-700",
      value: "text-emerald-800",
    },
    orange: {
      icon: "border-orange-200 bg-orange-50 text-orange-700",
      value: "text-orange-800",
    },
    rose: {
      icon: "border-rose-200 bg-rose-50 text-rose-700",
      value: "text-rose-800",
    },
  };

  const colors = accentMap[accent];

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <strong className={`mt-1.5 block text-2xl font-bold ${colors.value}`}>{value}</strong>
        </div>
        <span className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl border ${colors.icon}`}>
          <Icon size={18} />
        </span>
      </div>
    </article>
  );
}

function ReviewFact({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: ReviewItem["riskTone"];
}) {
  const toneClass =
    tone === "CONFLICT"
      ? "border-rose-200 bg-rose-50/70 text-rose-900"
      : tone === "REVIEW"
        ? "border-amber-200 bg-amber-50/70 text-amber-900"
        : tone === "LOW"
          ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
          : "border-slate-200 bg-slate-50 text-slate-800";

  return (
    <div className={`min-w-0 rounded-xl border px-3 py-2 ${toneClass}`}>
      <p className="break-words text-[10px] font-bold uppercase tracking-wider opacity-75">{label}</p>
      <p className="mt-0.5 break-words text-xs font-semibold leading-5">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: ReviewItem["status"] }) {
  const label = getStatusLabel(status);
  const tone =
    status === "APPROVED"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : status === "REJECTED"
        ? "border-rose-200 bg-rose-50 text-rose-800"
        : status === "DRAFT"
          ? "border-slate-200 bg-slate-100 text-slate-600"
          : "border-amber-200 bg-amber-50 text-amber-800";

  return (
    <span
      className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-bold tracking-wide ${tone}`}
    >
      {label}
    </span>
  );
}

function getStatusLabel(status: ReviewItem["status"]) {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "PENDING":
    case "PENDING_REVIEW":
      return "Menunggu pemeriksaan";
    case "APPROVED":
      return "Terverifikasi";
    case "REJECTED":
      return "Ditolak";
    case "CANCELLED":
      return "Dibatalkan";
  }
}

function getStateDescription(status: ReviewItem["status"]) {
  switch (status) {
    case "DRAFT":
      return "Pengajuan belum dikirim.";
    case "PENDING":
    case "PENDING_REVIEW":
      return "Pengajuan sedang diperiksa.";
    case "APPROVED":
      return "Pengajuan sudah disetujui.";
    case "REJECTED":
      return "Pengajuan ditolak dan menunggu tindak lanjut user.";
    case "CANCELLED":
      return "Pengajuan sudah dibatalkan.";
  }
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}
