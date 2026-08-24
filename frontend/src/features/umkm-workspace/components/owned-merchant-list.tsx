"use client";

import React from "react";
import Link from "next/link";
import { Store, ShieldCheck, Megaphone, Plus } from "lucide-react";
import { OwnedMerchantBrief } from "../types/umkm-workspace.types";

interface OwnedMerchantListProps {
  merchants: OwnedMerchantBrief[];
}

export function OwnedMerchantList({ merchants }: OwnedMerchantListProps) {
  if (merchants.length === 0) {
    return (
      <div className="p-6 rounded-xl border border-slate-700/60 bg-slate-800/40 text-center flex flex-col items-center justify-center py-10">
        <div className="w-14 h-14 rounded-full bg-slate-700/50 flex items-center justify-center text-slate-400 mb-3">
          <Store size={28} />
        </div>
        <h3 className="text-base font-semibold text-slate-200">Belum Ada Merchant Terverifikasi</h3>
        <p className="text-xs text-slate-400 max-w-sm mt-1 mb-5">
          Daftarkan usaha UMKM Anda agar tercatat di GETRA dan dapat memanfaatkan fitur promosi transit.
        </p>
        <Link
          href="/umkm/merchants/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950/40 transition-colors"
        >
          <Plus size={15} />
          Tambah UMKM ke GETRA
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {merchants.map((merchant) => (
        <div
          key={merchant.id}
          className="p-4 rounded-xl border border-slate-700/60 bg-slate-800/50 hover:border-slate-600 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
              <Store size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-white">{merchant.name}</h4>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/80 border border-emerald-500/30 text-emerald-300">
                  <ShieldCheck size={11} />
                  Terverifikasi
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                {merchant.address || "Lokasi terdaftar pada sistem GETRA"}
              </p>
              <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400">
                <span>Campaign: <strong className="text-slate-200">{merchant.campaigns_count}</strong></span>
                <span>Status: <span className="text-emerald-400 font-medium">{merchant.publish_status}</span></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <Link
              href={`/umkm/advertising?merchantId=${merchant.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/90 hover:bg-blue-600 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Megaphone size={13} />
              Kelola Iklan
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
