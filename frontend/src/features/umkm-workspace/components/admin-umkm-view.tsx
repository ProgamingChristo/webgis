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
  claims: AdminMerchantClaimRecord[];
  submissions: MerchantSubmissionRecord[];
  actionId?: string | null;
  onRefresh?: () => void;
  onApprove?: (item: ReviewItem) => void;
  onReject?: (item: ReviewItem) => void;
}

export function AdminUmkmView({
  isAdmin,
  loading,
  refreshing = false,
  error,
  claims,
  submissions,
  actionId = null,
  onRefresh,
  onApprove,
  onReject,
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
      evidenceLabel: [
        claim.evidence.relationship,
        claim.evidence.contact_name,
        claim.evidence.contact_phone,
        claim.evidence.statement,
      ].filter(Boolean).join(" · ") || "Bukti klaim belum tersedia pada record lama.",
      raw: claim,
    }));

    const registrationItems: ReviewItem[] = submissions.map((submission) => ({
      kind: "REGISTRATION",
      id: submission.id,
      merchantName: submission.name,
      typeLabel: "Pendaftaran usaha baru",
      status: submission.status,
      context: `${submission.category} / ${submission.address || "Lokasi tersimpan"}`,
      owner: submission.submitted_by,
      createdAt: submission.created_at,
      detailHref: `/umkm/submissions/${submission.id}`,
      riskLabel: submission.status === "PENDING_REVIEW" ? "Rendah" : "Perlu pemeriksaan",
      riskTone: submission.status === "PENDING_REVIEW" ? "LOW" : "REVIEW",
      validationLabel:
        submission.status === "PENDING_REVIEW"
          ? "Pemeriksaan dasar siap dilanjutkan."
          : "Status pengajuan perlu dicek sebelum keputusan.",
      sourceLabel: "GETRA user",
      evidenceLabel: submission.image_url ? "Foto utama pengajuan tersedia." : "Foto utama belum tersedia.",
      raw: submission,
    }));

    return [...claimItems, ...registrationItems].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
  }, [claims, submissions]);

  const pendingCount = items.filter((item) =>
    item.status === "PENDING" || item.status === "PENDING_REVIEW",
  ).length;
  const lowRiskCount = items.filter((item) => item.riskTone === "LOW").length;
  const needsReviewCount = items.filter((item) => item.riskTone === "REVIEW").length;
  const ownershipConflictCount = items.filter((item) => item.riskTone === "CONFLICT").length;
  const rejectedCount = items.filter((item) => item.status === "REJECTED").length;

  if (!isAdmin) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#050a10] p-6 text-slate-100">
        <section className="w-full max-w-md rounded-3xl border border-cyan-400/15 bg-slate-950/80 p-8 text-center shadow-2xl shadow-cyan-950/20">
          <ShieldCheck className="mx-auto mb-5 text-cyan-300" size={34} />
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Khusus admin</p>
          <h1 className="mt-3 text-2xl font-semibold">Akses admin dibutuhkan</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Halaman pemeriksaan UMKM hanya tersedia untuk akun admin.
          </p>
        </section>
      </main>
    );
  }

  return (
    <GetraAppShell
      actions={
        <button
          aria-label="Muat ulang pemeriksaan UMKM"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
          disabled={refreshing}
          onClick={onRefresh}
          type="button"
        >
          <RefreshCw className={refreshing ? "animate-spin" : undefined} size={17} />
        </button>
      }
      eyebrow="Admin UMKM"
      title="Pemeriksaan UMKM"
      description="Kelola pendaftaran usaha baru dan klaim kepemilikan dari satu antrean pemeriksaan."
      tone="admin"
    >
      <section className="grid gap-5">
        <div className="grid gap-3 md:grid-cols-4">
          <MetricCard icon={ClipboardCheck} label="Menunggu" value={error ? "—" : pendingCount} />
          <MetricCard icon={CheckCircle2} label="Risiko rendah" value={error ? "—" : lowRiskCount} />
          <MetricCard icon={AlertTriangle} label="Perlu pemeriksaan" value={error ? "—" : needsReviewCount} />
          <MetricCard icon={BadgeCheck} label="Konflik kepemilikan" value={error ? "—" : ownershipConflictCount} />
        </div>

        {error ? (
          <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
            <AlertTriangle size={16} className="text-rose-600" />
            <span>{error}</span>
          </div>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Antrean pemeriksaan UMKM</h2>
              <p className="text-sm text-slate-600">Prioritaskan konflik kepemilikan, duplikasi, dan kasus yang perlu diperiksa manual.</p>
            </div>
            <p className="text-xs text-slate-500">
              {rejectedCount} rejected tetap ditampilkan sebagai audit trail ringkas.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
              <LoaderCircle className="animate-spin text-sky-600" size={16} />
              Memuat antrean pemeriksaan...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center" data-testid="queue-error-state">
              <AlertTriangle className="mx-auto text-rose-600" size={28} />
              <p className="mt-3 text-sm font-bold text-rose-900">Antrean pemeriksaan belum dapat dimuat</p>
              <p className="mt-1 text-xs text-rose-700">{error}</p>
              <button
                type="button"
                onClick={onRefresh}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-800 shadow-sm transition hover:bg-rose-50"
              >
                <RefreshCw size={14} />
                Coba lagi
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center" data-testid="queue-empty-state">
              <CheckCircle2 className="mx-auto text-emerald-600" size={28} />
              <p className="mt-3 text-sm font-bold text-slate-900">Tidak ada pemeriksaan UMKM aktif.</p>
              <p className="mt-1 text-xs text-slate-600">Klaim dan pendaftaran baru akan muncul di sini.</p>
            </div>
          ) : (
            <div className="grid gap-3">
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
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 sm:p-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">{item.typeLabel}</span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500">{item.sourceLabel}</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900">{item.merchantName}</h3>
          <p className="text-xs text-slate-600">{item.context}</p>
        </div>

        <StatusBadge status={item.status} />
      </header>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <ReviewFact label="Pengaju" value={item.owner} />
        <ReviewFact label="Tanggal Masuk" value={formatDate(item.createdAt)} />
        <ReviewFact label="Indikator Risiko" tone={item.riskTone} value={item.riskLabel} />
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
        <p className="font-bold text-slate-900">{item.validationLabel}</p>
        <p className="mt-1 text-slate-600">{item.evidenceLabel}</p>
      </div>

      <footer className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-slate-500">
          {getStateDescription(item.status)}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {item.detailHref ? (
            <Link
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
              href={item.detailHref}
            >
              Lihat detail
            </Link>
          ) : null}

          {isPending ? (
            <>
              <button
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                disabled={rejecting || approving}
                onClick={onReject}
                type="button"
              >
                <XCircle size={14} />
                Reject
              </button>
              <button
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
                disabled={approving || rejecting}
                onClick={onApprove}
                type="button"
              >
                <CheckCircle2 size={14} />
                Approve
              </button>
            </>
          ) : null}
        </div>
      </footer>
    </article>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Store; label: string; value: number | string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
          <strong className="mt-2 block text-2xl font-bold text-slate-900">{value}</strong>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-sky-100 bg-sky-50 text-sky-700">
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
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : tone === "REVIEW"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : tone === "LOW"
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-slate-200 bg-white text-slate-700";

  return (
    <div className={`min-w-0 rounded-xl border px-3 py-2 ${toneClass}`}>
      <p className="break-words text-[10px] font-bold uppercase leading-4 tracking-[0.12em] opacity-80">{label}</p>
      <p className="mt-1 break-words text-xs font-semibold leading-5">{value}</p>
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
          ? "border-slate-200 bg-slate-100 text-slate-700"
          : "border-amber-200 bg-amber-50 text-amber-800";

  return (
    <span className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>
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
