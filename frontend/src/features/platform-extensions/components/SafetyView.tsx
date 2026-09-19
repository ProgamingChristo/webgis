"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, Moon, Lightbulb, Eye, PhoneCall, Navigation } from "lucide-react";
import { SAFETY_CORRIDORS } from "../data";

export function SafetyView() {
  const [filterLightOnly, setFilterLightOnly] = useState<boolean>(false);

  const corridors = filterLightOnly
    ? SAFETY_CORRIDORS.filter((c) => c.lightingIndex.includes("Terang"))
    : SAFETY_CORRIDORS;

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Intro Banner */}
      <section className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white shadow-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-300">
              <Moon size={14} /> Keamanan Malam & Koridor Berpenerangan
            </span>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Peta Keamanan Pejalan Kaki & Jalur Malam Jakarta
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-300">
              Informasi indeks pencahayaan jalan (lighting index), aktivitas usaha malam (eyes on the street), kedekatan pos pengamanan, dan jangkauan kamera pengawas (CCTV).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-indigo-400 transition"
            >
              <Navigation size={16} /> Buka Peta Rute Malam
            </Link>
          </div>
        </div>
      </section>

      {/* Filter and Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterLightOnly}
              onChange={(e) => setFilterLightOnly(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Hanya tampilkan koridor dengan pencahayaan terang/sangat terang
          </label>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
          <span className="flex items-center gap-1 text-emerald-700">
            <ShieldCheck size={14} /> Skor &gt; 90: Sangat Aman
          </span>
          <span className="flex items-center gap-1 text-sky-700">
            <Lightbulb size={14} /> CCTV & Pos Jaga Aktif
          </span>
        </div>
      </div>

      {/* Safety Corridor Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {corridors.map((c) => (
          <div
            key={c.id}
            className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                    {c.zone}
                  </span>
                  <h3 className="text-base font-black text-slate-900 leading-snug mt-0.5">
                    {c.name}
                  </h3>
                </div>
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black text-sm ${
                    c.safetyScore >= 90
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-sky-100 text-sky-800"
                  }`}
                >
                  {c.safetyScore}
                </div>
              </div>

              {/* Metrics */}
              <div className="mt-4 space-y-2.5 text-xs text-slate-600">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="flex items-center gap-1 text-slate-500">
                    <Lightbulb size={13} /> Indeks Pencahayaan:
                  </span>
                  <span className="font-bold text-slate-900">{c.lightingIndex}</span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="flex items-center gap-1 text-slate-500">
                    <Eye size={13} /> Aktivitas Usaha / Eyes on Street:
                  </span>
                  <span className={`font-bold ${c.nightCommerceActive ? "text-emerald-600" : "text-slate-400"}`}>
                    {c.nightCommerceActive ? "Ramai Hingga Malam" : "Minim Usaha Malam"}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="flex items-center gap-1 text-slate-500">
                    <PhoneCall size={13} /> Jarak ke Pos Keamanan / Polisi:
                  </span>
                  <span className="font-semibold text-slate-900">~{c.policePostDistanceMeters} meter</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-500">Pengawasan CCTV Publik:</span>
                  <span className={`font-bold ${c.cctvCoverage ? "text-emerald-600" : "text-amber-600"}`}>
                    {c.cctvCoverage ? "Terhubung Command Center" : "Belum Terintegrasi"}
                  </span>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-100">
                <strong className="font-bold text-slate-800">Catatan Keamanan: </strong>
                {c.recommendation}
              </div>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4 flex items-center justify-between">
              <Link
                href="/app"
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
              >
                Pilih Rute Malam Ini
              </Link>
              <span className="text-[11px] text-slate-400">Update berkala warga & petugas</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
