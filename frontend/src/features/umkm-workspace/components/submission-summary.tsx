"use client";

import React from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock,
  FileText,
  Store,
  XCircle,
} from "lucide-react";
import { MerchantClaimBrief, SubmissionBrief } from "../types/umkm-workspace.types";
import { PendingLocationPreview } from "./pending-location-preview";

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
      context: `${claim.category} • ${claim.address || "Alamat belum tersedia"}`,
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
      context: `${submission.category} • ${submission.address || "Lokasi tersimpan"}`,
      location: submission.location,
      note: submission.review_note ?? null,
      createdAt: submission.created_at,
      updatedAt: submission.updated_at,
      href:
        submission.status === "DRAFT"
          ? `/umkm/merchants/new?edit=${encodeURIComponent(submission.id)}`
          : `/umkm/submissions/${submission.id}`,
    })),
  ].sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-semibold text-slate-800">Tidak ada pengajuan aktif.</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Pendaftaran usaha baru dan klaim kepemilikan akan muncul di sini.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
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
    <article
      data-testid={item.kind === "CLAIM" ? "claim-pending-card" : "submission-pending-card"}
      className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-50 border border-sky-100 text-sky-700">
            {item.kind === "CLAIM" ? <BadgeCheck size={20} /> : <Store size={20} />}
          </span>
          <div className="min-w-0">
            <h4 className="break-words text-base font-bold text-slate-900">{item.merchantName}</h4>
            <p className="mt-0.5 break-words text-xs text-slate-500">{item.typeLabel}</p>
          </div>
        </div>
        <StatusBadge icon={status.icon} label={status.label} tone={status.tone} />
      </header>

      <div className="mt-4 space-y-3">
        <p className="text-sm text-slate-700 font-medium leading-relaxed">
          {getStateDescription(item.status, item.kind)}
        </p>
        <p className="break-words text-xs text-slate-500">{item.context}</p>

        {/* Real owner-only private MapLibre map preview for pending registrations */}
        {item.location?.coordinates && item.status !== "APPROVED" ? (
          <div className="mt-3">
            <PendingLocationPreview
              coordinates={item.location.coordinates}
              merchantName={item.merchantName}
            />
          </div>
        ) : null}

        {item.note ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50/70 px-3.5 py-2.5 text-xs leading-5 text-rose-800">
            <span className="font-semibold">Catatan Pemeriksa:</span> {item.note}
          </p>
        ) : null}
      </div>

      <footer className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 break-words text-xs text-slate-500">
          <p>
            {item.status === "DRAFT" ? "Draf dibuat" : "Pengajuan dibuat"}: {formatDate(item.createdAt)}
            {item.updatedAt ? ` • Diperiksa ${formatDate(item.updatedAt)}` : ""}
          </p>
        </div>

        {item.href ? (
          <Link
            href={item.href}
            className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 hover:text-slate-900 sm:w-auto"
          >
            <span>{actionLabel}</span>
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
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}
    >
      <Icon size={13} />
      <span>{label}</span>
    </span>
  );
}

function getStatusPresentation(status: SummaryItem["status"], kind: SummaryItem["kind"]) {
  switch (status) {
    case "DRAFT":
      return {
        icon: FileText,
        label: "Draf",
        tone: "border-slate-200 bg-slate-100 text-slate-700",
      };
    case "PENDING":
    case "PENDING_REVIEW":
      if (kind === "CLAIM") {
        return {
          icon: Clock,
          label: "Claim sedang diperiksa",
          tone: "border-amber-200 bg-amber-50 text-amber-800",
        };
      }
      return {
        icon: Clock,
        label: "Menunggu verifikasi",
        tone: "border-amber-200 bg-amber-50 text-amber-800",
      };
    case "APPROVED":
      return {
        icon: CheckCircle2,
        label: "Usaha terverifikasi",
        tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
      };
    case "REJECTED":
      if (kind === "CLAIM") {
        return {
          icon: XCircle,
          label: "Claim tidak disetujui",
          tone: "border-rose-200 bg-rose-50 text-rose-800",
        };
      }
      return {
        icon: XCircle,
        label: "Pendaftaran tidak disetujui",
        tone: "border-rose-200 bg-rose-50 text-rose-800",
      };
    case "CANCELLED":
      return {
        icon: AlertCircle,
        label: "Dibatalkan",
        tone: "border-slate-200 bg-slate-100 text-slate-500",
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
      if (kind === "CLAIM") {
        return "Permintaan klaim kepemilikan tidak disetujui admin.";
      }
      return "Pendaftaran usaha tidak dapat disetujui.";
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
