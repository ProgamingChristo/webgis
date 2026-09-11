"use client";

import React from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CheckCircle,
  Clock,
  FileText,
  MapPin,
  Store,
  XCircle,
} from "lucide-react";
import { MerchantClaimBrief, SubmissionBrief } from "../types/umkm-workspace.types";

interface SubmissionSummaryProps {
  submissions: SubmissionBrief[];
  claims?: MerchantClaimBrief[];
}

type SummaryItem = {
  id: string;
  key: string;
  kind: "CLAIM" | "REGISTRATION";
  merchantName: string;
  typeLabel: string;
  status: SubmissionBrief["status"] | MerchantClaimBrief["status"];
  context: string;
  location?: { type: "Point"; coordinates: [number, number] } | null;
  note: string | null;
  createdAt: string;
  updatedAt: string | null;
  href: string | null;
};

export function SubmissionSummary({ submissions, claims = [] }: SubmissionSummaryProps) {
  const items: SummaryItem[] = [
    ...claims.map((claim) => ({
      id: claim.id,
      key: `claim-${claim.id}`,
      kind: "CLAIM" as const,
      merchantName: claim.merchant_name,
      typeLabel: "Klaim kepemilikan usaha",
      status: claim.status,
      context: `${claim.category} / ${claim.address || "Alamat belum tersedia"}`,
      note: claim.note,
      createdAt: claim.created_at,
      updatedAt: claim.reviewed_at,
      href: `/umkm/claims/${claim.id}`,
    })),
    ...submissions.map((submission) => ({
      id: submission.id,
      key: `submission-${submission.id}`,
      kind: "REGISTRATION" as const,
      merchantName: submission.name,
      typeLabel: "Pendaftaran usaha baru",
      status: submission.status,
      context: `${submission.category} / ${submission.address || "Lokasi tersimpan"}`,
      location: submission.location,
      note: null,
      createdAt: submission.created_at,
      updatedAt: submission.updated_at,
      href: submission.status === "DRAFT" ? `/umkm/merchants/new?edit=${encodeURIComponent(submission.id)}` : `/umkm/submissions/${submission.id}`,
    })),
  ].sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/45 p-6 text-center">
        <p className="text-sm font-semibold text-white">Tidak ada pengajuan aktif.</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          Pendaftaran usaha baru dan klaim kepemilikan akan muncul di sini.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <SubmissionCard item={item} key={item.key} />
      ))}
    </div>
  );
}

function SubmissionCard({ item }: { item: SummaryItem }) {
  const status = getStatusPresentation(item.status, item.kind);
  const actionLabel = getActionLabel(item.status);

  return (
    <article className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/55 p-4 shadow-sm shadow-slate-950/30 transition-colors hover:border-slate-700 sm:p-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-700 bg-slate-950 text-emerald-200">
            {item.kind === "CLAIM" ? <BadgeCheck size={18} /> : <Store size={18} />}
          </span>
          <div className="min-w-0">
            <h4 className="break-words text-sm font-bold leading-5 text-white">{item.merchantName}</h4>
            <p className="mt-0.5 break-words text-xs leading-5 text-slate-400">{item.typeLabel}</p>
          </div>
        </div>
        <StatusBadge icon={status.icon} label={status.label} tone={status.tone} />
      </header>

      <div className="mt-4 space-y-2">
        <p className="text-xs leading-5 text-slate-300">
          {item.kind === "CLAIM"
            ? "Klaim kepemilikan usaha yang sudah tersedia di GETRA."
            : "Pendaftaran usaha baru ke katalog GETRA."}
        </p>
        <p className="break-words text-xs leading-5 text-slate-500">{item.context}</p>

        {item.location?.coordinates ? (
          <div
            data-testid="owner-pending-map-preview"
            className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-400"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                <MapPin size={13} />
                Pratinjau Lokasi (Hanya Pemilik)
              </span>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                Belum Publik
              </span>
            </div>
            <p className="mt-1 font-mono text-[11px] text-slate-300">
              Koordinat: {item.location.coordinates[1].toFixed(6)}, {item.location.coordinates[0].toFixed(6)}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Marker ini hanya terlihat di ruang kelola Anda dan tidak muncul di peta umum sebelum disetujui.
            </p>
          </div>
        ) : null}

        {item.note ? (
          <p className="rounded-xl border border-rose-500/20 bg-rose-950/20 px-3 py-2 text-xs leading-5 text-rose-200">
            {item.note}
          </p>
        ) : null}
      </div>

      <footer className="mt-4 flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 break-words text-xs leading-5 text-slate-400">
          <p>{getStateDescription(item.status, item.kind)}</p>
          <p className="text-slate-500">
            {item.status === "DRAFT" ? "Draf dibuat" : "Pengajuan dibuat"} {formatDate(item.createdAt)}
            {item.updatedAt ? ` / Diperbarui ${formatDate(item.updatedAt)}` : ""}
          </p>
        </div>

        {item.href ? (
          <Link
            href={item.href}
            className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-100 transition hover:border-cyan-400/50 hover:text-cyan-200 sm:w-auto"
          >
            {actionLabel}
            <ArrowRight size={13} />
          </Link>
        ) : null}
      </footer>
    </article>
  );
}

function StatusBadge({
  icon: Icon,
  label,
  tone,
}: {
  icon: typeof Clock;
  label: string;
  tone: string;
}) {
  return (
    <span className={`inline-flex shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>
      <Icon className="mr-1.5" size={12} />
      {label}
    </span>
  );
}

function getStatusPresentation(status: SummaryItem["status"], kind: SummaryItem["kind"]) {
  switch (status) {
    case "DRAFT":
      return {
        icon: FileText,
        label: "Draft",
        tone: "border-slate-600 bg-slate-800/80 text-slate-200",
      };
    case "PENDING":
    case "PENDING_REVIEW":
      if (kind === "CLAIM") {
        return {
          icon: Clock,
          label: "Claim sedang diperiksa",
          tone: "border-amber-500/30 bg-amber-950/40 text-amber-200",
        };
      }
      return {
        icon: Clock,
        label: "Menunggu verifikasi",
        tone: "border-amber-500/30 bg-amber-950/40 text-amber-200",
      };
    case "APPROVED":
      return {
        icon: CheckCircle,
        label: "Terverifikasi",
        tone: "border-emerald-500/30 bg-emerald-950/40 text-emerald-200",
      };
    case "REJECTED":
      return {
        icon: XCircle,
        label: "Ditolak",
        tone: "border-rose-500/30 bg-rose-950/40 text-rose-200",
      };
    case "CANCELLED":
      return {
        icon: AlertCircle,
        label: "Dibatalkan",
        tone: "border-slate-700 bg-slate-900 text-slate-400",
      };
  }
}

function getActionLabel(status: SummaryItem["status"]) {
  switch (status) {
    case "DRAFT":
      return "Lanjutkan Pendaftaran";
    case "PENDING":
    case "PENDING_REVIEW":
      return "Lihat Status";
    case "REJECTED":
      return "Lihat Alasan";
    case "APPROVED":
      return "Lihat Detail";
    default:
      return "Lihat Detail";
  }
}

function getStateDescription(status: SummaryItem["status"], kind: SummaryItem["kind"]) {
  switch (status) {
    case "DRAFT":
      return "Pengajuan belum dikirim.";
    case "PENDING":
    case "PENDING_REVIEW":
      if (kind === "CLAIM") {
        return "Permintaan kepemilikan Anda sedang ditinjau GETRA.";
      }
      return "Usaha Anda sudah diajukan dan sedang ditinjau GETRA.";
    case "APPROVED":
      return "Usaha telah berhasil diverifikasi.";
    case "REJECTED":
      return "Pengajuan tidak dapat disetujui.";
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
