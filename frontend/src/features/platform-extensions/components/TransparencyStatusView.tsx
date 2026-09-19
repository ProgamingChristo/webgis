"use client";

import { useState } from "react";
import { Activity, CheckCircle2 } from "lucide-react";
import { SYSTEM_SERVICES } from "../data";

export function TransparencyStatusView() {
  const [services] = useState(SYSTEM_SERVICES);

  const allOperational = services.every((s) => s.status === "OPERATIONAL");

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Intro Banner */}
      <section className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-slate-900 to-emerald-950 p-6 text-white shadow-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300">
              <Activity size={14} /> Keandalan Infrastruktur & Transparansi Layanan
            </span>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Status Sistem & Ketersediaan Layanan GETRA
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-300">
              Pantauan operasional waktu-nyata terhadap engine spasial PostGIS, routing pedestrian Valhalla, orkestrasi AI, dan gateway pembayaran Midtrans.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/30 border border-emerald-400/50 px-4 py-2.5 text-sm font-bold text-emerald-200">
              <CheckCircle2 size={16} /> {allOperational ? "Semua Layanan Beroperasi Normal" : "Sebagian Layanan Dalam Pemeliharaan"}
            </span>
          </div>
        </div>
      </section>

      {/* SLA Metric Overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Uptime Rata-rata 90 Hari</span>
          <p className="text-3xl font-black text-emerald-600 mt-1">99.96%</p>
          <span className="text-xs text-slate-500 mt-1 block">Toleransi *Zero-Day* & pemulihan otomatis</span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Latensi Rute Pedestrian</span>
          <p className="text-3xl font-black text-slate-900 mt-1">~38 ms</p>
          <span className="text-xs text-slate-500 mt-1 block">Engine lokal Valhalla terisolasi di VM</span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Insiden Kritis Terbuka</span>
          <p className="text-3xl font-black text-emerald-600 mt-1">0 Kasus</p>
          <span className="text-xs text-slate-500 mt-1 block">Sistem dalam pemantauan 24/7</span>
        </div>
      </div>

      {/* Services Breakdown List */}
      <div className="space-y-4">
        <h2 className="text-base font-black text-slate-900">
          Status Komponen Platform Inti ({services.length})
        </h2>

        <div className="space-y-3">
          {services.map((svc) => (
            <div
              key={svc.name}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs md:flex-row md:items-center gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-sm">{svc.name}</h3>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 uppercase">
                    {svc.serviceType}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{svc.description}</p>
              </div>

              <div className="flex items-center gap-6 text-xs shrink-0">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Latensi</span>
                  <span className="font-black text-slate-800">{svc.latencyMs} ms</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">90d Uptime</span>
                  <span className="font-black text-emerald-600">{svc.uptime90d}%</span>
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 font-bold text-emerald-700 border border-emerald-200">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Operasional
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
