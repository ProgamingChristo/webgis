"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { INITIAL_HAZARD_REPORTS } from "../data";
import type { PedestrianHazardReport } from "../types";

export function HazardReportView() {
  const [reports, setReports] = useState<PedestrianHazardReport[]>(INITIAL_HAZARD_REPORTS);
  const [category, setCategory] = useState<PedestrianHazardReport["category"]>("Trotoar Rusak");
  const [locationName, setLocationName] = useState<string>("");
  const [severity, setSeverity] = useState<PedestrianHazardReport["severity"]>("Sedang");
  const [description, setDescription] = useState<string>("");
  const [submittedSuccess, setSubmittedSuccess] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationName || !description) return;

    const newReport: PedestrianHazardReport = {
      id: `rep-00${reports.length + 1}`,
      category,
      locationName,
      severity,
      description,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 16),
      status: "Diterima",
    };

    setReports([newReport, ...reports]);
    setSubmittedSuccess(true);
    setLocationName("");
    setDescription("");
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Intro Banner */}
      <section className="rounded-2xl border border-rose-100 bg-gradient-to-r from-rose-950 to-slate-900 p-6 text-white shadow-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-rose-300">
              <AlertTriangle size={14} /> Kanal Pelaporan Warga
            </span>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Lapor Hambatan Trotoar & Fasilitas Pejalan Kaki
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-rose-100">
              Bantu sesama pejalan kaki dan pengguna kursi roda dengan melaporkan trotoar amblas, guiding blocks terputus, atau kendaraan yang parkir sembarangan.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/accessibility"
              className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-rose-400 transition"
            >
              <ShieldAlert size={16} /> Lihat Peta Aksesibilitas
            </Link>
          </div>
        </div>
      </section>

      {/* Main Grid: Form + Live Reports */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left: Wizard Form */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-6 space-y-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
              Formulir Laporan Baru
            </span>
            <h2 className="text-lg font-black text-slate-900 mt-1">Unggah Informasi Temuan Lapangan</h2>
          </div>

          {submittedSuccess && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 flex items-start gap-3">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Laporan Berhasil Diterima!</p>
                <p className="mt-0.5 text-emerald-700">
                  Data telah ditambahkan ke feed publik dan diteruskan ke sistem moderasi kontribusi GETRA.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Kategori Masalah:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as PedestrianHazardReport["category"])}
                className="w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 focus:border-rose-500 focus:outline-none"
              >
                <option value="Trotoar Rusak">Trotoar Rusak / Ubin Amblas</option>
                <option value="Guiding Block Terputus">Guiding Block Difabel Netra Terputus/Terhalang</option>
                <option value="Tutup Manhole Hilang">Tutup Manhole / Saluran Air Hilang/Terbuka</option>
                <option value="Parkir Liar di Trotoar">Parkir Liar Sepeda Motor / Mobil di Trotoar</option>
                <option value="Lampu Jalan Padam">Penerangan / Lampu Trotoar Padam</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Nama Lokasi / Patokan:</label>
              <input
                type="text"
                placeholder="Contoh: Jl. Kendal depan terowongan, Dukuh Atas..."
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Tingkat Bahaya / Urgensi:</label>
              <div className="flex gap-3">
                {(["Rendah", "Sedang", "Kritis"] as const).map((sev) => (
                  <label key={sev} className="flex items-center gap-1.5 cursor-pointer font-semibold">
                    <input
                      type="radio"
                      name="severity"
                      value={sev}
                      checked={severity === sev}
                      onChange={() => setSeverity(sev)}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span>{sev}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Deskripsi Hambatan:</label>
              <textarea
                rows={3}
                placeholder="Jelaskan kendala yang dialami pejalan kaki atau pengguna kursi roda..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 focus:border-rose-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-rose-600 py-3 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition"
            >
              Kirim Laporan Lapangan
            </button>
          </form>
        </div>

        {/* Right: Live Reports Feed */}
        <div className="space-y-4 lg:col-span-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900">
              Laporan Warga Terkini ({reports.length})
            </h3>
            <span className="text-xs text-slate-500">Pembaruan langsung dari lapangan</span>
          </div>

          <div className="space-y-3">
            {reports.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">
                      {r.category}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm mt-0.5">{r.locationName}</h4>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-black uppercase ${
                      r.severity === "Kritis"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {r.severity}
                  </span>
                </div>

                <p className="text-xs text-slate-600">{r.description}</p>

                <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400">
                  <span>Waktu: {r.timestamp} WIB</span>
                  <span className="font-bold text-sky-600">Status: {r.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
