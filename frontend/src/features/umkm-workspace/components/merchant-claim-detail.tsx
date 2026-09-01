"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, BadgeCheck, Clock, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { UmkmWorkspaceService } from "../services/umkm-workspace.service";
import type { MerchantClaimBrief } from "../types/umkm-workspace.types";

export function MerchantClaimDetail({ claimId }: { claimId: string }) {
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

  const pending = claim.status === "PENDING";
  const Icon = pending ? Clock : XCircle;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 text-slate-100 sm:px-6 sm:py-12">
      <Link className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white" href="/umkm">
        <ArrowLeft size={14} /> Kembali ke Workspace UMKM
      </Link>

      <article className="mt-5 rounded-3xl border border-slate-800 bg-slate-950/70 p-5 shadow-2xl shadow-slate-950/30 sm:p-7">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-700 bg-slate-900 text-cyan-200">
              <BadgeCheck size={20} />
            </span>
            <div className="min-w-0">
              <h1 className="break-words text-xl font-bold text-white">{claim.merchant_name}</h1>
              <p className="mt-1 text-sm text-slate-400">Klaim kepemilikan usaha</p>
            </div>
          </div>
          <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold ${pending ? "border-amber-500/30 bg-amber-950/40 text-amber-200" : "border-rose-500/30 bg-rose-950/40 text-rose-200"}`}>
            <Icon className="mr-1.5" size={13} />
            {pending ? "Menunggu Review" : "Ditolak"}
          </span>
        </header>

        <div className="mt-6 grid gap-4 border-y border-slate-800 py-5 sm:grid-cols-2">
          <DetailFact label="Kategori" value={claim.category} />
          <DetailFact label="Lokasi" value={claim.address || "Lokasi tersimpan"} />
          <DetailFact label="Diajukan" value={formatDate(claim.created_at)} />
          <DetailFact label="Diperbarui" value={claim.reviewed_at ? formatDate(claim.reviewed_at) : "Belum ada pembaruan"} />
        </div>

        <section className="mt-5">
          <h2 className="text-sm font-semibold text-white">Status pengajuan</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {pending ? "Pengajuan sedang diperiksa oleh admin GETRA." : "Pengajuan tidak dapat disetujui."}
          </p>
          {claim.note ? (
            <div className="mt-4 flex gap-3 rounded-2xl border border-rose-500/25 bg-rose-950/25 p-4 text-sm leading-6 text-rose-100">
              <AlertTriangle className="mt-0.5 shrink-0" size={17} />
              <div><strong className="block text-xs uppercase tracking-wider text-rose-200">Alasan admin</strong>{claim.note}</div>
            </div>
          ) : null}
        </section>
      </article>
    </div>
  );
}

function DetailFact({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 break-words text-sm text-slate-200">{value}</p></div>;
}

function ClaimState({ error = false, message }: { error?: boolean; message: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center p-6 text-center text-slate-100">
      <div><p className={error ? "text-sm text-rose-300" : "text-sm text-slate-300"}>{message}</p><Link className="mt-4 inline-flex text-xs font-semibold text-cyan-300" href="/umkm">Kembali ke Workspace UMKM</Link></div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value));
}
