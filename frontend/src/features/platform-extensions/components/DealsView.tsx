"use client";

import { useState } from "react";
import Link from "next/link";
import { Tag, Clock, Copy, Check, Navigation, ArrowRight } from "lucide-react";
import { FLASH_DEALS } from "../data";

export function DealsView() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Intro Banner */}
      <section className="rounded-2xl border border-rose-100 bg-gradient-to-r from-rose-900 to-amber-950 p-6 text-white shadow-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-rose-300">
              <Tag size={14} /> Promo Kilat & Diskon Pejalan Kaki
            </span>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Voucher & Penawaran Spesial UMKM Dekat Transit
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-rose-100">
              Dukung usaha lokal di sekitar rute jalan kaki Anda dengan diskon eksklusif dan voucher belanja hemat harian.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-rose-400 transition"
            >
              <Navigation size={16} /> Cari Promo Terdekat di Peta
            </Link>
          </div>
        </div>
      </section>

      {/* Deals Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {FLASH_DEALS.map((deal) => (
          <div
            key={deal.id}
            className="flex flex-col justify-between rounded-2xl border border-rose-100 bg-white p-5 shadow-xs transition hover:shadow-md relative overflow-hidden"
          >
            {/* Top Ribbon */}
            <div className="absolute top-0 right-0 rounded-bl-xl bg-rose-600 px-3 py-1 text-[10px] font-black uppercase text-white tracking-wider">
              Flash Deal
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {deal.merchantName}
              </span>
              <h3 className="text-base font-black text-slate-900 leading-snug mt-1">
                {deal.title}
              </h3>
              <p className="mt-2 text-xs text-rose-700 font-semibold bg-rose-50/80 p-2.5 rounded-xl border border-rose-100">
                {deal.discountDescription}
              </p>

              <div className="mt-4 space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Min. Pembelian:</span>
                  <span className="font-bold text-slate-800">
                    Rp {deal.minSpend.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Lokasi Dekat:</span>
                  <span className="font-semibold text-slate-800">
                    {deal.stationNear} ({deal.distanceMeters}m)
                  </span>
                </div>
                <div className="flex justify-between items-center text-amber-700 font-bold">
                  <span className="flex items-center gap-1">
                    <Clock size={13} /> Sisa Waktu:
                  </span>
                  <span>{deal.expiresInHours} jam lagi</span>
                </div>
              </div>
            </div>

            {/* Voucher Code Box & Claim Action */}
            <div className="mt-5 border-t border-slate-100 pt-4 space-y-2.5">
              <div className="flex items-center justify-between rounded-xl border border-dashed border-rose-300 bg-rose-50/40 px-3 py-2">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Kode Voucher</span>
                  <span className="text-sm font-black tracking-widest text-slate-900">{deal.code}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(deal.code)}
                  className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-rose-600 shadow-xs hover:bg-rose-50 border border-rose-200"
                >
                  {copiedCode === deal.code ? (
                    <>
                      <Check size={12} className="text-emerald-600" /> Tersalin!
                    </>
                  ) : (
                    <>
                      <Copy size={12} /> Salin
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400">
                  Tersisa {deal.remainingVouchers} kupon
                </span>
                <Link
                  href="/app"
                  className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700"
                >
                  Tunjukkan di Toko <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
