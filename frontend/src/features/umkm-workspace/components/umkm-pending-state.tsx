import Link from "next/link";
import { Clock3, ArrowRight, Store, ShieldCheck } from "lucide-react";
import type { UmkmWorkspaceSummary } from "../types/umkm-workspace.types";
import { getLatestDraft } from "../model/umkm-workspace-state";
import { SubmissionSummary } from "./submission-summary";

export function UmkmPendingState({ summary }: { summary: UmkmWorkspaceSummary }) {
  const draft = getLatestDraft(summary);
  const pendingSubmissions = summary.recent_submissions.filter((item) => item.status === "PENDING_REVIEW");
  const pendingClaims = summary.recent_claims.filter((item) => item.status === "PENDING");

  return (
    <div className="mx-auto max-w-2xl py-4 sm:py-8 px-4 space-y-6" data-workspace-state="PENDING_VERIFICATION">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm text-center">
        {/* Status Pill */}
        <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1 text-xs font-semibold text-amber-800">
          <Clock3 size={14} className="text-amber-600 shrink-0" aria-hidden="true" />
          Menunggu Verifikasi
        </div>

        {/* Pending Icon */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
          <Store size={30} aria-hidden="true" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Pengajuan Anda sedang diperiksa
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600">
          Kami akan mengaktifkan fitur pengelolaan usaha setelah kepemilikan diverifikasi.
        </p>
        <p className="mx-auto mt-2 max-w-md text-xs text-slate-500">
          Langkah berikutnya: pantau detail pengajuan untuk melihat hasil pemeriksaan atau catatan admin. Segarkan halaman setelah pengajuan disetujui.
        </p>

        {/* Private Guarantee Banner */}
        <div className="my-6 rounded-xl border border-sky-100 bg-sky-50/70 p-4 text-left flex items-start gap-3">
          <ShieldCheck size={18} className="text-sky-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-xs text-slate-700">
            <p className="font-bold text-slate-900">Privasi &amp; Keamanan Data</p>
            <p className="mt-0.5 text-slate-600">
              Pengajuan ini bersifat privat di ruang kelola Anda. Tempat usaha belum tampil di pencarian publik atau rute hingga verifikasi selesai.
            </p>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-6">
          <Link
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-500 active:scale-[0.99]"
            href="/umkm/merchants/new"
          >
            <span>Daftarkan / Klaim Usaha Lain</span>
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <section aria-label="Pengajuan yang menunggu verifikasi" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
          Daftar Pengajuan Menunggu Pemeriksaan
        </h2>
        <SubmissionSummary submissions={pendingSubmissions} claims={pendingClaims} />
      </section>

      {draft ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between gap-3 text-xs">
          <div>
            <p className="font-semibold text-slate-900">Draf tersimpan: {draft.name}</p>
            <p className="text-slate-500">Anda memiliki draf yang belum diajukan.</p>
          </div>
          <Link
            className="font-bold text-sky-600 hover:text-sky-700 underline underline-offset-4 shrink-0"
            href={`/umkm/merchants/new?edit=${encodeURIComponent(draft.id)}`}
          >
            Lanjutkan Pendaftaran
          </Link>
        </div>
      ) : null}
    </div>
  );
}
