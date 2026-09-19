"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart, Users, Clock, Compass, Lightbulb, Store } from "lucide-react";
import { SAMPLE_MERCHANT_INSIGHT, DIRECTORY_MERCHANTS } from "../data";

export function UmkmInsightsView() {
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>(DIRECTORY_MERCHANTS[0].id);

  const currentMerchant =
    DIRECTORY_MERCHANTS.find((m) => m.id === selectedMerchantId) || DIRECTORY_MERCHANTS[0];

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Intro Banner */}
      <section className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-950 to-slate-900 p-6 text-white shadow-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300">
              <BarChart size={14} /> Wawasan Kunjungan & Daya Saing UMKM
            </span>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Dasbor Inteligensi Operasional & Keramaian Pejalan Kaki
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-emerald-100">
              Analisis profil keramaian untuk <strong>{currentMerchant.name}</strong> ({currentMerchant.nearestStation}): pejalan kaki yang melintas, jam tersibuk, dan radar kompetitor.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/umkm"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-emerald-400 transition"
            >
              <Store size={16} /> Ruang Kelola Usaha
            </Link>
          </div>
        </div>
      </section>

      {/* Merchant Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Pilih Usaha Anda:
          </span>
          <select
            value={selectedMerchantId}
            onChange={(e) => setSelectedMerchantId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-xs focus:border-emerald-500 focus:outline-none"
          >
            {DIRECTORY_MERCHANTS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.nearestStation})
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Dianalisis untuk {currentMerchant.name}
        </span>
      </div>

      {/* Insight Metrics Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase">Potensi Pejalan Kaki / Minggu</span>
            <Users size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {SAMPLE_MERCHANT_INSIGHT.weeklyCatchmentPedestrians.toLocaleString("id-ID")}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Melintas di radius 400m usaha Anda</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase">Jam Kunjungan Tersibuk</span>
            <Clock size={16} className="text-emerald-600" />
          </div>
          <p className="text-base font-black text-slate-900 mt-2">
            {SAMPLE_MERCHANT_INSIGHT.peakHour}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Waktu paling ideal untuk promosi</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase">Radius Jalan Kaki Pembeli</span>
            <Compass size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            ~{SAMPLE_MERCHANT_INSIGHT.avgCustomerWalkDistanceMeters} meter
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Sekitar 4 menit jalan santai</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase">Pesaing di Radius 500m</span>
            <Store size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {SAMPLE_MERCHANT_INSIGHT.competitorsIn500m} usaha
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Tingkat persaingan: Seimbang</span>
        </div>
      </div>

      {/* Strategic Growth Recommendation */}
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-6 space-y-3">
        <h3 className="text-sm font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
          <Lightbulb size={16} /> Rekomendasi Pertumbuhan Omset (AI Growth Advice)
        </h3>
        <p className="text-sm font-semibold text-emerald-950 leading-relaxed">
          {SAMPLE_MERCHANT_INSIGHT.growthOpportunity}
        </p>
        <div className="pt-2">
          <Link
            href="/umkm/advertising"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition"
          >
            Buat Iklan Promosi Jam Sepi &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
