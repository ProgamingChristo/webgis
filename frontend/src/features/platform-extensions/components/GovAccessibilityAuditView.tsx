"use client";

import Link from "next/link";
import { CheckSquare, ShieldCheck } from "lucide-react";
import { INCLUSIVITY_METRICS } from "../data";

export function GovAccessibilityAuditView() {
  const compliantCount = INCLUSIVITY_METRICS.filter((m) => m.pupCompliant).length;
  const overallAvgScore = Math.round(
    INCLUSIVITY_METRICS.reduce((acc, m) => acc + m.score, 0) / INCLUSIVITY_METRICS.length
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Intro Banner */}
      <section className="rounded-2xl border border-teal-100 bg-gradient-to-r from-teal-950 to-slate-900 p-6 text-white shadow-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-teal-300">
              <CheckSquare size={14} /> Kepatuhan Standar Aksesibilitas Nasional
            </span>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Audit Inklusivitas Ruang Publik & Desain Universal
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-teal-100">
              Evaluasi kepatuhan infrastruktur jalan dan fasilitas umum terhadap Peraturan Menteri PUPR No. 14/PRT/M/2017 tentang Kemudahan Bangunan Gedung dan Lingkungan.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/accessibility"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-teal-400 transition"
            >
              <ShieldCheck size={16} /> Buka Panduan Difabel
            </Link>
          </div>
        </div>
      </section>

      {/* Aggregate Score Header */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Indeks Inklusivitas Rata-rata</span>
          <p className="text-3xl font-black text-teal-700 mt-1">{overallAvgScore}/100</p>
          <span className="text-xs text-slate-500 mt-1 block">Status: Memenuhi Standar Baik</span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Kepatuhan Regulasi PUPR</span>
          <p className="text-3xl font-black text-slate-900 mt-1">
            {compliantCount} dari {INCLUSIVITY_METRICS.length} Kriteria
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Telah melampaui batas ambang minimum</span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Fokus Prioritas Perbaikan</span>
          <p className="text-sm font-black text-amber-700 mt-2">Sinyal Audio Penyeberangan Pelican</p>
          <span className="text-xs text-slate-500 mt-1 block">Perlu penambahan di halte sekunder</span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="space-y-4">
        <h2 className="text-base font-black text-slate-900">
          Rincian Parameter Kepatuhan Audit
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          {INCLUSIVITY_METRICS.map((m, idx) => (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-slate-900 text-sm">{m.category}</h3>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-black uppercase ${
                      m.pupCompliant
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {m.pupCompliant ? "Patuh PUPR" : "Perlu Peningkatan"}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Skor Aktual:</span>
                    <span className="text-teal-700 font-bold">{m.score}/100 (Target: {m.benchmarkTarget})</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${m.score >= m.benchmarkTarget ? "bg-teal-600" : "bg-amber-500"}`}
                      style={{ width: `${m.score}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-100">
                  <strong className="font-bold text-slate-800">Tindakan Lanjut: </strong>
                  {m.recommendation}
                </div>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-3 flex justify-between items-center text-xs text-slate-400">
                <span>Diperbarui berkala oleh Auditor Independen</span>
                <Link href="/reports/new" className="font-bold text-teal-600 hover:text-teal-700">
                  Laporkan Temuan &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
