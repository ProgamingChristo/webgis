"use client";

import Link from "next/link";
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
import { useCallback, useEffect, useMemo, useState } from "react";

import { GetraAppShell } from "@/src/components/getra-ui";
import { useAuth } from "@/src/components/providers/AuthProvider";
import type { MerchantSubmissionRecord } from "@/src/features/merchant-submission";
import {
  adminUmkmReviewService,
  type AdminMerchantClaimRecord,
} from "@/src/services/admin-umkm-review.service";

type ReviewItem =
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

export default function AdminUmkmPage() {
  const { context } = useAuth();
  const isAdmin = context?.profile?.account_role === "ADMIN";
  const [claims, setClaims] = useState<AdminMerchantClaimRecord[]>([]);
  const [submissions, setSubmissions] = useState<MerchantSubmissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadQueue = useCallback(async (showRefresh = false) => {
    if (!isAdmin) return;
    if (showRefresh) setRefreshing(true);
    try {
      const [nextClaims, nextSubmissions] = await Promise.all([
        adminUmkmReviewService.listMerchantClaims(),
        adminUmkmReviewService.listMerchantSubmissions(),
      ]);
      setClaims(nextClaims);
      setSubmissions(nextSubmissions);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Review UMKM tidak dapat dimuat.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadQueue(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadQueue]);

  const items = useMemo<ReviewItem[]>(() => {
    const claimItems: ReviewItem[] = claims.map((claim) => ({
      kind: "CLAIM",
      id: claim.id,
      merchantName: claim.merchant_name,
      typeLabel: "Klaim kepemilikan usaha",
      status: claim.status,
      context: `Existing merchant / ${claim.merchant_category} / ${claim.merchant_address || "Lokasi tersimpan"}`,
      owner: claim.submitted_by_name,
      createdAt: claim.created_at,
      detailHref: null,
      riskLabel: claim.has_ownership_conflict
        ? "Ownership Conflict"
        : claim.status === "PENDING"
          ? "Perlu Review"
          : "Rendah",
      riskTone: claim.has_ownership_conflict
        ? "CONFLICT"
        : claim.status === "PENDING"
          ? "REVIEW"
          : "LOW",
      validationLabel: claim.has_ownership_conflict
        ? "Merchant sudah memiliki ownership terverifikasi."
        : "Klaim ownership menunggu verifikasi admin.",
      sourceLabel: claim.merchant_publish_status || "Existing merchant",
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
      riskLabel: submission.status === "PENDING_REVIEW" ? "Rendah" : "Perlu Review",
      riskTone: submission.status === "PENDING_REVIEW" ? "LOW" : "REVIEW",
      validationLabel:
        submission.status === "PENDING_REVIEW"
          ? "Pemeriksaan dasar siap untuk review."
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
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Admin only</p>
          <h1 className="mt-3 text-2xl font-semibold">Akses admin dibutuhkan</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Halaman review UMKM hanya tersedia untuk akun dengan account_role ADMIN.
          </p>
        </section>
      </main>
    );
  }

  async function approveItem(item: ReviewItem) {
    setActionId(`${item.kind}:${item.id}:approve`);
    setError(null);
    try {
      if (item.kind === "CLAIM") {
        await adminUmkmReviewService.approveMerchantClaim(item.id);
      } else {
        await adminUmkmReviewService.approveMerchantSubmission(item.id);
      }
      await loadQueue();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Approval gagal.");
    } finally {
      setActionId(null);
    }
  }

  async function rejectItem(item: ReviewItem) {
    const note = window.prompt("Tuliskan alasan penolakan untuk user.");
    if (!note?.trim()) return;

    setActionId(`${item.kind}:${item.id}:reject`);
    setError(null);
    try {
      if (item.kind === "CLAIM") {
        await adminUmkmReviewService.rejectMerchantClaim(item.id, note.trim());
      } else {
        await adminUmkmReviewService.rejectMerchantSubmission(item.id, note.trim());
      }
      await loadQueue();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Penolakan gagal.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <GetraAppShell
      actions={
        <button
          aria-label="Muat ulang review UMKM"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-200 transition hover:border-cyan-400/50 hover:text-cyan-200 disabled:opacity-50"
          disabled={refreshing}
          onClick={() => void loadQueue(true)}
          type="button"
        >
          <RefreshCw className={refreshing ? "animate-spin" : undefined} size={17} />
        </button>
      }
      eyebrow="Admin UMKM"
      title="Merchant Review"
      description="Kelola pendaftaran usaha baru dan klaim ownership existing tanpa mencampur admin flow dengan UMKM Workspace."
      tone="admin"
    >
      <section className="grid gap-5">
        <div className="grid gap-3 md:grid-cols-4">
          <MetricCard icon={ClipboardCheck} label="Pending" value={pendingCount} />
          <MetricCard icon={CheckCircle2} label="Low Risk" value={lowRiskCount} />
          <MetricCard icon={AlertTriangle} label="Needs Review" value={needsReviewCount} />
          <MetricCard icon={BadgeCheck} label="Ownership Conflict" value={ownershipConflictCount} />
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
              <h2 className="text-base font-bold text-white">Queue Review UMKM</h2>
              <p className="text-sm text-slate-400">Prioritaskan konflik ownership, duplikasi, dan kasus yang butuh pemeriksaan manual.</p>
            </div>
            <p className="text-xs text-slate-500">
              {rejectedCount} rejected tetap ditampilkan sebagai audit trail ringkas.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-300">
              <LoaderCircle className="animate-spin" size={16} />
              Memuat queue review...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
              <CheckCircle2 className="mx-auto text-emerald-300" size={28} />
              <p className="mt-3 text-sm font-semibold text-white">Tidak ada review UMKM aktif.</p>
              <p className="mt-1 text-xs text-slate-400">Klaim dan pendaftaran baru akan muncul di sini.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {items.map((item) => (
                <ReviewCard
                  actionId={actionId}
                  item={item}
                  key={`${item.kind}-${item.id}`}
                  onApprove={() => void approveItem(item)}
                  onReject={() => void rejectItem(item)}
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
    <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-700 bg-slate-950 text-cyan-200">
              {item.kind === "CLAIM" ? <BadgeCheck size={18} /> : <Store size={18} />}
            </span>
            <div className="min-w-0">
              <h3 className="break-words text-sm font-bold leading-5 text-white sm:text-base">{item.merchantName}</h3>
              <p className="break-words text-xs leading-5 text-slate-400">{item.typeLabel}</p>
            </div>
          </div>
        </div>
        <StatusBadge status={item.status} />
      </header>

      <div className="mt-4 space-y-2 text-sm text-slate-300">
        <p>
          {item.kind === "CLAIM"
            ? "Klaim kepemilikan merchant yang sudah tersedia di GETRA."
            : "Pendaftaran usaha baru ke katalog GETRA."}
        </p>
        <p className="break-words text-xs leading-5 text-slate-500">{item.context}</p>
        <p className="break-words text-xs leading-5 text-slate-500">Diajukan oleh {item.owner} pada {formatDate(item.createdAt)}.</p>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs leading-5 text-slate-300">
          <strong className="block text-[10px] uppercase tracking-[0.12em] text-slate-500">Bukti review privat</strong>
          <span className="break-words">{item.evidenceLabel}</span>
        </div>
        <div className="grid gap-2 pt-2 text-xs sm:grid-cols-3">
          <ReviewFact label="Source" value={item.sourceLabel} />
          <ReviewFact label="Risk" value={item.riskLabel} tone={item.riskTone} />
          <ReviewFact label="Validation" value={item.validationLabel} />
        </div>
      </div>

      <footer className="mt-5 flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 break-words text-xs leading-5 text-slate-400">{getStateDescription(item.status)}</p>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
          {item.detailHref ? (
            <Link
              className="flex-1 whitespace-nowrap rounded-xl border border-slate-700 px-3 py-2 text-center text-xs font-semibold text-slate-200 transition hover:border-cyan-400/50 hover:text-cyan-200 sm:flex-none"
              href={item.detailHref}
            >
              Lihat Detail
            </Link>
          ) : null}
          {isPending ? (
            <>
              <button
                className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-rose-500/30 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-950/40 disabled:opacity-50 sm:flex-none"
                disabled={Boolean(actionId)}
                onClick={onReject}
                type="button"
              >
                {rejecting ? <LoaderCircle className="animate-spin" size={13} /> : <XCircle size={13} />}
                Reject
              </button>
              <button
                className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50 sm:flex-none"
                disabled={Boolean(actionId)}
                onClick={onApprove}
                type="button"
              >
                {approving ? <LoaderCircle className="animate-spin" size={13} /> : <CheckCircle2 size={13} />}
                Approve
              </button>
            </>
          ) : null}
        </div>
      </footer>
    </article>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Store; label: string; value: number }) {
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
      return "Menunggu Review";
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
