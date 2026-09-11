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
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-200 transition hover:border-cyan-400/50 hover:text-cyan-200 disabled:opacity-50"
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
          <div className="flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-950/30 p-4 text-sm text-rose-200" role="alert">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        ) : null}

        <section className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4 sm:p-5">
          <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Antrean pemeriksaan UMKM</h2>
              <p className="text-sm text-slate-400">Prioritaskan konflik kepemilikan, duplikasi, dan kasus yang perlu diperiksa manual.</p>
            </div>
            <p className="text-xs text-slate-500">
              {rejectedCount} rejected tetap ditampilkan sebagai audit trail ringkas.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-300">
              <LoaderCircle className="animate-spin" size={16} />
              Memuat antrean pemeriksaan...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-950/20 p-8 text-center" data-testid="queue-error-state">
              <AlertTriangle className="mx-auto text-rose-400" size={28} />
              <p className="mt-3 text-sm font-semibold text-white">Antrean pemeriksaan belum dapat dimuat</p>
              <p className="mt-1 text-xs text-slate-400">{error}</p>
              <button
                type="button"
                onClick={onRefresh}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
              >
                <RefreshCw size={14} />
                Coba lagi
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center" data-testid="queue-empty-state">
              <CheckCircle2 className="mx-auto text-emerald-300" size={28} />
              <p className="mt-3 text-sm font-semibold text-white">Tidak ada pemeriksaan UMKM aktif.</p>
              <p className="mt-1 text-xs text-slate-400">Klaim dan pendaftaran baru akan muncul di sini.</p>
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
    <article className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 transition hover:border-slate-700 sm:p-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-300">{item.typeLabel}</span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400">{item.sourceLabel}</span>
          </div>
          <h3 className="text-lg font-bold text-white">{item.merchantName}</h3>
          <p className="text-xs text-slate-400">{item.context}</p>
        </div>

        <StatusBadge status={item.status} />
      </header>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <ReviewFact label="Pengaju" value={item.owner} />
        <ReviewFact label="Tanggal Masuk" value={formatDate(item.createdAt)} />
        <ReviewFact label="Indikator Risiko" tone={item.riskTone} value={item.riskLabel} />
      </div>

      <div className="mt-3 rounded-xl border border-slate-800/80 bg-slate-950/50 p-3 text-xs text-slate-300">
        <p className="font-semibold text-slate-200">{item.validationLabel}</p>
        <p className="mt-1 text-slate-400">{item.evidenceLabel}</p>
      </div>

      <footer className="mt-4 flex flex-col gap-3 border-t border-slate-800/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-slate-500">
          {getStateDescription(item.status)}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {item.detailHref ? (
            <Link
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
              href={item.detailHref}
            >
              Lihat detail
            </Link>
          ) : null}

          {isPending ? (
            <>
              <button
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-900/40 disabled:opacity-50"
                disabled={rejecting || approving}
                onClick={onReject}
                type="button"
              >
                <XCircle size={14} />
                Reject
              </button>
              <button
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-3.5 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-900/50 disabled:opacity-50"
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
    <article className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
          <strong className="mt-2 block text-2xl text-white">{value}</strong>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-400/20 bg-cyan-950/25 text-cyan-200">
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
      ? "border-rose-500/25 bg-rose-950/25 text-rose-100"
      : tone === "REVIEW"
        ? "border-amber-500/25 bg-amber-950/25 text-amber-100"
        : tone === "LOW"
          ? "border-emerald-500/25 bg-emerald-950/25 text-emerald-100"
          : "border-slate-800 bg-slate-950/70 text-slate-300";

  return (
    <div className={`min-w-0 rounded-xl border px-3 py-2 ${toneClass}`}>
      <p className="break-words text-[10px] font-bold uppercase leading-4 tracking-[0.12em] opacity-70">{label}</p>
      <p className="mt-1 break-words leading-5">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: ReviewItem["status"] }) {
  const label = getStatusLabel(status);
  const tone =
    status === "APPROVED"
      ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-200"
      : status === "REJECTED"
        ? "border-rose-500/30 bg-rose-950/40 text-rose-200"
        : status === "DRAFT"
          ? "border-slate-600 bg-slate-800 text-slate-200"
          : "border-amber-500/30 bg-amber-950/40 text-amber-200";

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
