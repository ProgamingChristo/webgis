"use client";

import React from "react";
import Link from "next/link";
import { BarChart2, Megaphone, Store } from "lucide-react";

interface EmptyStateProps {
  type: "NO_MERCHANT" | "NO_CAMPAIGN" | "NO_DATA";
}

export function AnalyticsEmptyState({ type }: EmptyStateProps) {
  if (type === "NO_MERCHANT") {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 py-12 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <Store size={24} />
        </div>
        <h3 className="text-sm font-semibold text-slate-900">Belum ada usaha yang Anda kelola.</h3>
        <p className="text-xs text-slate-400 mt-1 mb-5">
          Daftarkan usaha baru atau klaim usaha yang tersedia sebelum melihat statistik promosi.
        </p>
        <Link
          href="/umkm/merchants/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
        >
          Daftarkan / Klaim Usaha
        </Link>
      </div>
    );
  }

  if (type === "NO_CAMPAIGN") {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 py-12 text-center shadow-sm">
        <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mx-auto mb-3">
          <Megaphone size={24} />
        </div>
        <h3 className="text-sm font-semibold text-slate-900">Belum Ada Promosi Spasial</h3>
        <p className="text-xs text-slate-400 mt-1 mb-5">
          Buat promosi untuk menjangkau orang yang berada di area yang sesuai.
        </p>
        <Link
          href="/umkm/advertising"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
        >
          Buat Promosi
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 py-10 text-center shadow-sm">
      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <BarChart2 size={20} />
      </div>
      <h3 className="text-xs font-semibold text-slate-800">Belum Ada Data Interaksi</h3>
      <p className="text-xs text-slate-400 mt-0.5 max-w-sm mx-auto">
        Belum ada interaksi tercatat untuk filter dan periode waktu yang dipilih.
      </p>
    </div>
  );
}
