"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, BadgeCheck, CheckCircle, Clock, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { UmkmWorkspaceService } from "../services/umkm-workspace.service";
import type { MerchantClaimBrief } from "../types/umkm-workspace.types";

export function MerchantClaimDetail({ claimId }: { claimId: string }) {
  return <MerchantClaimRequest key={claimId} claimId={claimId} />;
}

function MerchantClaimRequest({ claimId }: { claimId: string }) {
  const [claim, setClaim] = useState<MerchantClaimBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void UmkmWorkspaceService.getWorkspaceSummary()
      .then((workspace) => {
        if (!active) return;
        const matchingClaim = workspace.recent_claims.find((item) => item.id === claimId) ?? null;
        setClaim(matchingClaim);
        if (!matchingClaim) setError("Klaim tidak ditemukan atau sudah tidak memerlukan tindak lanjut.");
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Gagal memuat detail klaim.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [claimId]);

  if (loading) {
    return <ClaimState message="Memuat detail klaim..." />;
  }

  if (!claim || error) {
    return <ClaimState error message={error ?? "Klaim tidak ditemukan."} />;
  }

  return <MerchantClaimDetailView claim={claim} />;
}

export function MerchantClaimDetailView({ claim }: { claim: MerchantClaimBrief }) {
  const pending = claim.status === "PENDING";
  const approved = claim.status === "APPROVED";
  const Icon = pending ? Clock : approved ? CheckCircle : XCircle;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 text-slate-900 sm:px-6 sm:py-8">
      <Link className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800" href="/umkm">
        <ArrowLeft size={14} /> Kembali ke Ruang Kelola UMKM
      </Link>

      <article className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-sky-100 bg-sky-50 text-sky-600">
              <BadgeCheck size={24} />
            </span>
            <div className="min-w-0">
              <h1 className="break-words text-xl font-bold text-slate-900">{claim.merchant_name}</h1>
              <p className="mt-1 text-xs text-slate-500">Klaim Kepemilikan Usaha</p>
            </div>
          </div>
          <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold ${pending ? "border-amber-200 bg-amber-50 text-amber-800" : approved ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
            <Icon className="mr-1.5" size={14} />
            {pending ? "Klaim Sedang Diperiksa" : approved ? "Klaim Disetujui" : "Klaim Ditolak"}
          </span>
        </header>

        <div className="mt-6 grid gap-4 border-y border-slate-100 py-5 sm:grid-cols-2">
          <DetailFact label="Kategori" value={claim.category} />
          <DetailFact label="Lokasi" value={claim.address || "Lokasi tersimpan"} />
          <DetailFact label="Diajukan" value={formatDate(claim.created_at)} />
          <DetailFact label="Diperbarui" value={claim.reviewed_at ? formatDate(claim.reviewed_at) : "Belum ada pembaruan"} />
        </div>

        <section className="mt-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Status Pemeriksaan</h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            {pending ? "Klaim kepemilikan Anda sedang diperiksa oleh admin GETRA. Tempat usaha tetap dapat ditemukan secara publik di peta, namun fitur kelola baru akan diaktifkan setelah verifikasi disetujui." : approved ? "Klaim kepemilikan telah disetujui. Anda kini dapat mengelola profil, melihat insight area, dan mengaktifkan promosi." : "Pengajuan klaim tidak dapat disetujui. Silakan periksa catatan alasan di bawah sebelum mengajukan kembali."}
          </p>
          {claim.note ? (
            <div className="mt-4 flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs leading-relaxed text-rose-900">
              <AlertTriangle className="mt-0.5 shrink-0 text-rose-600" size={16} />
              <div><strong className="block text-xs uppercase tracking-wider text-rose-700">Catatan Admin</strong>{claim.note}</div>
            </div>
          ) : null}
        </section>
        {approved ? <Link className="mt-6 inline-flex w-full justify-center rounded-xl bg-sky-600 px-5 py-3 text-xs font-semibold text-white shadow-sm hover:bg-sky-500 sm:w-auto" href={`/umkm?merchantId=${encodeURIComponent(claim.merchant_id)}`}>Kelola Usaha</Link> : null}
      </article>
    </div>
  );
}

function DetailFact({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 break-words text-xs font-medium text-slate-800">{value}</p></div>;
}

function ClaimState({ error = false, message }: { error?: boolean; message: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center p-6 text-center text-slate-100">
      <div><p className={error ? "text-sm text-rose-300" : "text-sm text-slate-300"}>{message}</p><Link className="mt-4 inline-flex text-xs font-semibold text-cyan-300" href="/umkm">Kembali ke Ruang Kelola UMKM</Link></div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value));
}
