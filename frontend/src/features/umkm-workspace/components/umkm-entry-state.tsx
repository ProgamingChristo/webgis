import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, Store } from "lucide-react";
import { getLatestDraft } from "../model/umkm-workspace-state";
import type { UmkmWorkspaceSummary } from "../types/umkm-workspace.types";
import { SubmissionSummary } from "./submission-summary";

export function UmkmEntryState({ summary }: { summary: UmkmWorkspaceSummary }) {
  const draft = getLatestDraft(summary);
  const hasHistory = summary.recent_submissions.length + summary.recent_claims.length > 0;

  return (
    <div
      className="mx-auto max-w-xl py-4 sm:py-8 px-4 space-y-6"
      data-workspace-state={draft ? "HAS_DRAFT" : "NO_MERCHANT"}
    >
      {/* Figma Screen 1: Main Onboarding Card */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-10 shadow-sm text-center">
        {/* Status Pill */}
        <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100/90 px-3.5 py-1 text-xs font-semibold text-slate-600">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          Belum Ada Usaha Terhubung
        </div>

        {/* Store Icon */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
          <Store size={30} aria-hidden="true" />
        </div>

        {/* Heading & Supporting Copy */}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Mulai kelola usaha Anda di GETRA
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600">
          Daftarkan usaha kamu agar lebih mudah ditemukan dan mendapatkan insight dari area sekitar.
        </p>

        {/* Benefits Card */}
        <div className="my-6 rounded-xl border border-slate-200/80 bg-slate-50/80 p-5 text-left">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Yang bisa kamu dapatkan
          </h3>
          <ul className="space-y-2.5 text-xs sm:text-sm font-medium text-slate-700">
            <li className="flex items-center gap-2.5">
              <CheckCircle2 size={16} className="text-sky-600 shrink-0" aria-hidden="true" />
              <span>Tampil di pencarian GETRA</span>
            </li>
            <li className="flex items-center gap-2.5">
              <CheckCircle2 size={16} className="text-sky-600 shrink-0" aria-hidden="true" />
              <span>Lihat permintaan di sekitar</span>
            </li>
            <li className="flex items-center gap-2.5">
              <CheckCircle2 size={16} className="text-sky-600 shrink-0" aria-hidden="true" />
              <span>Dapatkan insight area</span>
            </li>
            <li className="flex items-center gap-2.5">
              <CheckCircle2 size={16} className="text-sky-600 shrink-0" aria-hidden="true" />
              <span>Jangkau lebih banyak pelanggan</span>
            </li>
          </ul>
        </div>

        {/* Draft Notice if any */}
        {draft ? (
          <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50/60 p-3.5 text-left text-xs text-sky-900 flex items-start gap-2.5">
            <FileText size={16} className="text-sky-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Draf tersimpan: {draft.name}</p>
              <p className="text-sky-700 mt-0.5">
                Pendaftaran usaha Anda tersimpan sebagai draf dan belum dikirimkan untuk pemeriksaan.
              </p>
            </div>
          </div>
        ) : null}

        {/* Primary CTA */}
        <Link
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-500 active:scale-[0.99]"
          href={draft ? `/umkm/merchants/new?edit=${encodeURIComponent(draft.id)}` : "/umkm/merchants/new"}
        >
          <span>{draft ? "Lanjutkan Pendaftaran" : "Daftarkan Usaha"}</span>
          <ArrowRight size={16} aria-hidden="true" />
        </Link>

        {/* Secondary Info */}
        <div className="mt-5 border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
          <p>
            Usaha Anda sudah ada di katalog GETRA, MAPID, atau Menu Go? Anda dapat mencari dan mengklaim usaha tersebut saat memulai pendaftaran.
          </p>
        </div>
      </section>

      {/* History section if available */}
      {hasHistory ? (
        <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-slate-600 hover:text-slate-900">
            Riwayat pendaftaran &amp; klaim sebelumnya ({summary.recent_submissions.length + summary.recent_claims.length})
          </summary>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <SubmissionSummary
              submissions={summary.recent_submissions}
              claims={summary.recent_claims}
            />
          </div>
        </details>
      ) : null}
    </div>
  );
}
