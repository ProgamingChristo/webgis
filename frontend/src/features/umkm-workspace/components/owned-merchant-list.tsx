"use client";

import React from "react";
import Link from "next/link";
import { Store, ShieldCheck, Megaphone, Plus, SearchCheck } from "lucide-react";
import { OwnedMerchantBrief } from "../types/umkm-workspace.types";

interface OwnedMerchantListProps {
  merchants: OwnedMerchantBrief[];
}

export function OwnedMerchantList({ merchants }: OwnedMerchantListProps) {
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
        <div
          key={merchant.id}
          className="flex min-w-0 flex-col gap-4 rounded-xl border border-slate-700/60 bg-slate-800/50 p-4 transition-all hover:border-slate-600 sm:p-5 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="flex min-w-0 items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
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
              <p className="mt-1 break-words text-xs leading-5 text-slate-400 line-clamp-2">
                {merchant.address || "Lokasi terdaftar pada sistem GETRA"}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                <span>Campaign: <strong className="text-slate-200">{merchant.campaigns_count}</strong></span>
                <span>Status: <span className="text-emerald-400 font-medium">{merchant.publish_status}</span></span>
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
          </div>
        </div>
      ))}
    </div>
  );
}
