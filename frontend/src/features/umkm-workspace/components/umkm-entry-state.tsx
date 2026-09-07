import Link from "next/link";
import { Store } from "lucide-react";
import { getLatestDraft } from "../model/umkm-workspace-state";
import type { UmkmWorkspaceSummary } from "../types/umkm-workspace.types";
import { SubmissionSummary } from "./submission-summary";

export function UmkmEntryState({ summary }: { summary: UmkmWorkspaceSummary }) {
  const draft = getLatestDraft(summary);
  return <div className="mx-auto max-w-3xl space-y-6" data-workspace-state={draft ? "HAS_DRAFT" : "NO_MERCHANT"}>
    <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6 sm:p-10">
      <Store aria-hidden className="mb-5 text-emerald-400" size={32} />
      <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{draft ? "Lanjutkan pendaftaran usaha Anda" : "Mulai kelola usaha Anda di GETRA"}</h1>
      <p className="mt-3 text-sm leading-6 text-slate-300">{draft ? `Pendaftaran ${draft.name} tersimpan sebagai draft dan belum dikirim untuk diperiksa.` : "Cari usaha yang sudah tersedia terlebih dahulu. Jika belum ada, daftarkan usaha baru."}</p>
      <Link className="mt-6 inline-flex w-full justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-500 sm:w-auto" href={draft ? `/umkm/merchants/new?edit=${encodeURIComponent(draft.id)}` : "/umkm/merchants/new"}>
        {draft ? "Lanjutkan Pendaftaran" : "Daftarkan / Klaim Usaha"}
      </Link>
      {draft ? <Link className="mt-4 block text-sm text-slate-300 underline underline-offset-4 hover:text-white" href="/umkm/merchants/new">Daftarkan / Klaim Usaha Lain</Link> : <ul className="mt-6 space-y-2 border-t border-slate-800 pt-5 text-sm leading-6 text-slate-400">
        <li>Usaha sudah ada di GETRA/MAPID/Menu Go → klaim usaha tersebut.</li>
        <li>Belum ada → daftarkan usaha baru.</li>
      </ul>}
    </section>
    {summary.recent_submissions.length + summary.recent_claims.length > 0 ? <details className="rounded-xl border border-slate-800 p-4">
      <summary className="cursor-pointer text-sm text-slate-300">Riwayat pendaftaran dan klaim</summary>
      <div className="mt-4"><SubmissionSummary submissions={summary.recent_submissions} claims={summary.recent_claims} /></div>
    </details> : null}
  </div>;
}
