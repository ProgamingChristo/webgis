"use client";

import { useState } from "react";
import Link from "next/link";
import { Package, Store, MapPin, ArrowRight } from "lucide-react";
import { B2B_SUPPLIERS } from "../data";

export function SuppliesView() {
  const [filterEcoOnly, setFilterEcoOnly] = useState<boolean>(false);

  const suppliers = filterEcoOnly
    ? B2B_SUPPLIERS.filter((s) => s.ecoDeliveryAvailable)
    : B2B_SUPPLIERS;

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Intro Banner */}
      <section className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-950 to-slate-900 p-6 text-white shadow-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-300">
              <Package size={14} /> Ekosistem Rantai Pasok Mikro
            </span>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Bursa Bahan Baku & Pemasok Grosir Lokal UMKM
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-blue-100">
              Hubungkan usaha kuliner dan kerajinan Anda dengan pasar tradisional dan sentra grosir terdekat di Jakarta untuk efisiensi biaya logistik dan belanja ramah lingkungan.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/umkm"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-blue-400 transition"
            >
              <Store size={16} /> Kelola Usaha Anda
            </Link>
          </div>
        </div>
      </section>

      {/* Filter and Overview */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filterEcoOnly}
            onChange={(e) => setFilterEcoOnly(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          Hanya tampilkan pasar dengan kurir ramah lingkungan (sepeda/gerobak kargo)
        </label>

        <span className="text-xs font-semibold text-slate-500">
          Radius Pasokan: Terkoneksi radius &lt; 3 km dari pusat studi Jakarta
        </span>
      </div>

      {/* Supplier Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {suppliers.map((sup) => (
          <div
            key={sup.id}
            className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                  Sentra Grosir Tradisional
                </span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                  ~{(sup.distanceToStudyCenterMeters / 1000).toFixed(1)} km
                </span>
              </div>

              <h3 className="text-base font-black text-slate-900 leading-snug mt-1">
                {sup.marketName}
              </h3>
              <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                <MapPin size={12} className="shrink-0 text-slate-400" />
                {sup.location}
              </p>

              {/* Commodities list */}
              <div className="mt-4 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase">
                  Komoditas Utama:
                </span>
                <div className="flex flex-wrap gap-1">
                  {sup.specialty.map((spec, idx) => (
                    <span
                      key={idx}
                      className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-800"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Pengiriman Nol Emisi:</span>
                  <span className={`font-bold ${sup.ecoDeliveryAvailable ? "text-emerald-600" : "text-slate-400"}`}>
                    {sup.ecoDeliveryAvailable ? "Tersedia" : "Belum Tersedia"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Diskon Koperasi Grosir:</span>
                  <span className={`font-bold ${sup.bulkDiscountAvailable ? "text-emerald-600" : "text-slate-400"}`}>
                    {sup.bulkDiscountAvailable ? "Tersedia" : "Harga Standar"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">
                Kontak: {sup.contactPerson}
              </span>
              <Link
                href="/app"
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                Cek Rute Logistik <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
