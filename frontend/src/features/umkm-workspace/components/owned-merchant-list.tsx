"use client";

import React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Loader2,
  Megaphone,
  Plus,
  SearchCheck,
  ShieldCheck,
  Store,
  Trash2,
} from "lucide-react";
import { OwnedMerchantBrief } from "../types/umkm-workspace.types";

interface OwnedMerchantListProps {
  merchants: OwnedMerchantBrief[];
  onArchiveMerchant: (merchant: OwnedMerchantBrief) => Promise<void>;
}

export function OwnedMerchantList({ merchants, onArchiveMerchant }: OwnedMerchantListProps) {
  const [confirmationId, setConfirmationId] = React.useState<string | null>(null);
  const [archivingId, setArchivingId] = React.useState<string | null>(null);
  const [archiveError, setArchiveError] = React.useState<string | null>(null);

  const handleArchive = async (merchant: OwnedMerchantBrief) => {
    setArchivingId(merchant.id);
    setArchiveError(null);
    try {
      await onArchiveMerchant(merchant);
      setConfirmationId(null);
    } catch (error) {
      setArchiveError(
        error instanceof Error ? error.message : "Gagal menghapus usaha dari GETRA.",
      );
    } finally {
      setArchivingId(null);
    }
  };

  if (merchants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-700/60 bg-slate-800/40 px-5 py-9 text-center sm:px-6 sm:py-10">
        <div className="w-14 h-14 rounded-full bg-slate-700/50 flex items-center justify-center text-slate-400 mb-3">
          <Store size={28} />
        </div>
        <h3 className="text-base font-semibold text-slate-200">Belum ada usaha yang Anda kelola.</h3>
        <p className="text-xs text-slate-400 max-w-sm mt-1 mb-5">
          Daftarkan usaha baru atau klaim usaha yang sudah tersedia di GETRA.
        </p>
        <Link
          href="/umkm/merchants/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950/40 transition-colors"
        >
          <Plus size={15} />
          Daftarkan / Klaim Usaha
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {merchants.map((merchant) => (
        <article
          key={merchant.id}
          className="min-w-0 rounded-xl border border-slate-700/60 bg-slate-800/50 p-4 transition-all hover:border-slate-600 sm:p-5"
        >
          <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3.5">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                <Store size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-col items-start gap-1.5 sm:flex-row sm:items-center">
                  <h4 className="min-w-0 break-words text-sm font-semibold leading-5 text-white">{merchant.name}</h4>
                  <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-emerald-500/30 bg-emerald-950/80 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                    <ShieldCheck size={11} />
                    Terverifikasi
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 break-words text-xs leading-5 text-slate-400">
                  {merchant.address || "Lokasi terdaftar pada sistem GETRA"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                  <span>Campaign: <strong className="text-slate-200">{merchant.campaigns_count}</strong></span>
                  <span>Status: <span className="font-medium text-emerald-400">{merchant.publish_status}</span></span>
                </div>
              </div>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:shrink-0 lg:self-center">
              <a
                href="#umkm-intelligence-title"
                className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-emerald-500/40 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/10 sm:flex-none"
              >
                <SearchCheck size={13} />
                Discoverability
              </a>
              <Link
                href={`/umkm/advertising?merchantId=${merchant.id}`}
                className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-600/90 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-600 sm:flex-none"
              >
                <Megaphone size={13} />
                Promosikan
              </Link>
              <button
                aria-expanded={confirmationId === merchant.id}
                className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-400 transition-colors hover:border-rose-500/40 hover:bg-rose-950/20 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                disabled={archivingId !== null}
                onClick={() => {
                  setArchiveError(null);
                  setConfirmationId((current) => current === merchant.id ? null : merchant.id);
                }}
                type="button"
              >
                <Trash2 size={13} />
                Hapus
              </button>
            </div>
          </div>

          {confirmationId === merchant.id ? (
            <div className="mt-4 border-t border-slate-700/70 pt-4" role="region" aria-label={`Konfirmasi hapus ${merchant.name}`}>
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-rose-950/50 text-rose-300">
                  <AlertTriangle size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-xs font-semibold leading-5 text-slate-100">
                    Hapus {merchant.name} dari GETRA?
                  </p>
                  <p className="mt-0.5 break-words text-xs leading-5 text-slate-400">
                    Usaha tidak akan tampil lagi di peta dan pencarian. Riwayat pengajuan tetap tersimpan. Campaign aktif harus diselesaikan atau dibatalkan lebih dulu.
                  </p>
                  {archiveError ? (
                    <p aria-live="polite" className="mt-2 break-words text-xs font-medium leading-5 text-rose-300" role="alert">
                      {archiveError}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      className="min-h-9 rounded-lg border border-slate-700 px-3 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700 disabled:opacity-50"
                      disabled={archivingId === merchant.id}
                      onClick={() => {
                        setArchiveError(null);
                        setConfirmationId(null);
                      }}
                      type="button"
                    >
                      Batal
                    </button>
                    <button
                      className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-rose-500 disabled:cursor-wait disabled:opacity-60"
                      disabled={archivingId === merchant.id}
                      onClick={() => void handleArchive(merchant)}
                      type="button"
                    >
                      {archivingId === merchant.id ? <Loader2 className="animate-spin" size={13} /> : <Trash2 size={13} />}
                      {archivingId === merchant.id ? "Menghapus..." : "Ya, Hapus Usaha"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
