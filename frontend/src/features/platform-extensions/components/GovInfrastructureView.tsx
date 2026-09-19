"use client";

import { useState } from "react";
import Link from "next/link";
import { Hammer, Navigation, FileSpreadsheet } from "lucide-react";
import { SIDEWALK_ASSET_SEGMENTS } from "../data";

export function GovInfrastructureView() {
  const [filterCondition, setFilterCondition] = useState<string>("ALL");

  const segments = filterCondition === "ALL"
    ? SIDEWALK_ASSET_SEGMENTS
    : SIDEWALK_ASSET_SEGMENTS.filter((s) => s.condition === filterCondition);

  const totalMeters = SIDEWALK_ASSET_SEGMENTS.reduce((acc, s) => acc + s.lengthMeters, 0);
  const goodMeters = SIDEWALK_ASSET_SEGMENTS.filter(s => s.condition === "Baik").reduce((acc, s) => acc + s.lengthMeters, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Intro Banner */}
      <section className="rounded-2xl border border-cyan-100 bg-gradient-to-r from-cyan-950 to-slate-900 p-6 text-white shadow-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-300">
              <Hammer size={14} /> Inventarisasi Aset Bina Marga
            </span>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Audit Aset Pedestrian & Kondisi Trotoar Kota
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-cyan-100">
              Basis data spasial panjang segmen trotoar, lebar efektif, keteduhan pohon pelindung, ubin pemandu difabel, dan fasilitas penyeberangan pejalan kaki.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/developers/open-data"
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-cyan-400 transition"
            >
              <FileSpreadsheet size={16} /> Ekspor Data Spasial
            </Link>
          </div>
        </div>
      </section>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Total Segmen Terinventarisasi</span>
          <p className="text-xl font-black text-slate-900">{SIDEWALK_ASSET_SEGMENTS.length} koridor</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Total Panjang Trotoar</span>
          <p className="text-xl font-black text-slate-900">{(totalMeters / 1000).toFixed(2)} km</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Kondisi Baik</span>
          <p className="text-xl font-black text-emerald-600">
            {((goodMeters / totalMeters) * 100).toFixed(0)}%
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Fasilitas Penyeberangan</span>
          <p className="text-xl font-black text-sky-600">
            {SIDEWALK_ASSET_SEGMENTS.reduce((acc, s) => acc + s.crosswalkCount, 0)} titik
          </p>
        </div>
      </div>

      {/* Condition Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex flex-wrap gap-2">
          {["ALL", "Baik", "Rusak Ringan", "Rusak Berat"].map((cond) => (
            <button
              key={cond}
              type="button"
              onClick={() => setFilterCondition(cond)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                filterCondition === cond
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cond === "ALL" ? "Semua Kondisi" : cond}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Menampilkan {segments.length} segmen trotoar
        </span>
      </div>

      {/* Segments List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {segments.map((seg) => (
          <div
            key={seg.segmentId}
            className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
                  {seg.segmentId}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-black uppercase ${
                    seg.condition === "Baik"
                      ? "bg-emerald-50 text-emerald-700"
                      : seg.condition === "Rusak Ringan"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {seg.condition}
                </span>
              </div>

              <h3 className="text-base font-black text-slate-900 mt-1">{seg.streetName}</h3>

              <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Panjang & Lebar:</span>
                  <span className="font-bold text-slate-800">
                    {seg.lengthMeters}m · Lebar {seg.widthMeters}m
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Ubin Pemandu (Guiding Block):</span>
                  <span className={`font-bold ${seg.tactilePaving ? "text-emerald-600" : "text-rose-600"}`}>
                    {seg.tactilePaving ? "Tersedia" : "Belum Ada"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Indeks Keteduhan Pohon:</span>
                  <span className="font-bold text-slate-800">
                    {(seg.treeShadingRatio * 100).toFixed(0)}% kanopi
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Zebra Cross / Pelican:</span>
                  <span className="font-bold text-slate-800">{seg.crosswalkCount} titik</span>
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-3 flex justify-between items-center text-xs">
              <Link href="/app" className="font-bold text-cyan-600 hover:text-cyan-700 flex items-center gap-1">
                <Navigation size={12} /> Buka di Peta
              </Link>
              <Link href="/reports/new" className="text-slate-400 hover:text-slate-700">
                Laporkan Kerusakan
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
