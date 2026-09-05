import Link from "next/link";
import { Clock3 } from "lucide-react";
import type { UmkmWorkspaceSummary } from "../types/umkm-workspace.types";
import { getLatestDraft } from "../model/umkm-workspace-state";
import { SubmissionSummary } from "./submission-summary";

export function UmkmPendingState({ summary }: { summary: UmkmWorkspaceSummary }) {
  const draft = getLatestDraft(summary);
  return <div className="mx-auto max-w-3xl space-y-6" data-workspace-state="PENDING_VERIFICATION">
    <header className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6 sm:p-8">
      <Clock3 aria-hidden className="mb-4 text-emerald-300" size={28} />
      <h1 className="text-2xl font-semibold text-white">Pengajuan Anda sedang diperiksa</h1>
      <p className="mt-3 text-sm leading-6 text-slate-300">Kami akan mengaktifkan fitur pengelolaan usaha setelah kepemilikan diverifikasi.</p>
      <p className="mt-3 text-sm leading-6 text-slate-400">Langkah berikutnya: pantau detail pengajuan untuk melihat hasil pemeriksaan atau catatan admin. Segarkan halaman setelah pengajuan disetujui.</p>
    </header>
    <section aria-label="Pengajuan yang menunggu verifikasi">
      <SubmissionSummary submissions={summary.recent_submissions.filter((item) => item.status === "PENDING_REVIEW")} claims={summary.recent_claims.filter((item) => item.status === "PENDING")} />
    </section>
    <div className="flex flex-col gap-3 text-sm sm:flex-row sm:justify-between">
      {draft ? <Link className="text-emerald-300 underline underline-offset-4" href={`/umkm/merchants/new?edit=${encodeURIComponent(draft.id)}`}>Lanjutkan Pendaftaran {draft.name}</Link> : null}
      <Link className="text-slate-300 underline underline-offset-4" href="/umkm/merchants/new">Daftarkan / Klaim Usaha Lain</Link>
    </div>
  </div>;
}
