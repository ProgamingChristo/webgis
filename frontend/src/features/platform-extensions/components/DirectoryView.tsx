"use client";

import { useState } from "react";
import Link from "next/link";
import { Store, Search, MapPin, Star, QrCode, Navigation, ArrowRight, ShieldCheck } from "lucide-react";
import { DIRECTORY_MERCHANTS } from "../data";

export function DirectoryView() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedPriceTier, setSelectedPriceTier] = useState<string>("ALL");
  const [onlyOpen, setOnlyOpen] = useState<boolean>(false);

  const filteredMerchants = DIRECTORY_MERCHANTS.filter((m) => {
    const matchesSearch =
      searchQuery === "" ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.cuisine && m.cuisine.toLowerCase().includes(searchQuery.toLowerCase())) ||
      m.nearestStation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.address.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === "ALL" || m.category === selectedCategory;
    const matchesPrice = selectedPriceTier === "ALL" || m.priceTier === selectedPriceTier;
    const matchesOpen = !onlyOpen || m.isOpen;

    return matchesSearch && matchesCategory && matchesPrice && matchesOpen;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Intro Banner */}
      <section className="rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-900 to-slate-900 p-6 text-white shadow-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-300">
              <Store size={14} /> Direktori & Katalog UMKM
            </span>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Direktori UMKM & Pedagang Lokal Terverifikasi
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-amber-100">
              Temukan ribuan kuliner khas, jajanan pasar, kedai kopi, dan usaha lokal terverifikasi dalam jarak berjalan kaki dari stasiun transit Jakarta.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-amber-400 transition"
            >
              <Navigation size={16} /> Buka di Peta
            </Link>
          </div>
        </div>
      </section>

      {/* Search and Filters Bar */}
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama UMKM, jenis masakan, atau stasiun terdekat (cth: soto, kopi, kendal)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyOpen}
                onChange={(e) => setOnlyOpen(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              Buka Sekarang
            </label>
          </div>
        </div>

        {/* Category Pills & Price Tier */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap gap-1.5">
            {["ALL", "Kuliner", "Kopi & Minuman", "Kebutuhan Harian"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  selectedCategory === cat
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat === "ALL" ? "Semua Kategori" : cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <span>Harga:</span>
            {["ALL", "Rp", "RpRp", "RpRpRp"].map((price) => (
              <button
                key={price}
                type="button"
                onClick={() => setSelectedPriceTier(price)}
                className={`rounded-md px-2 py-1 transition ${
                  selectedPriceTier === price
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {price === "ALL" ? "Semua" : price}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-black text-slate-900">
          Menampilkan {filteredMerchants.length} Usaha Terverifikasi
        </h2>
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="text-xs font-bold text-amber-600 hover:text-amber-700"
          >
            Hapus Pencarian
          </button>
        )}
      </div>

      {/* Directory Grid */}
      {filteredMerchants.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <Store size={36} className="mx-auto text-slate-300 mb-2" />
          <h3 className="text-base font-bold text-slate-700">Tidak ada usaha yang cocok</h3>
          <p className="mt-1 text-xs text-slate-500">
            Coba ubah kata kunci pencarian atau reset filter kategori di atas.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredMerchants.map((merchant) => (
            <div
              key={merchant.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 uppercase">
                      {merchant.category}
                    </span>
                    <h3 className="text-base font-black text-slate-900 leading-snug">
                      {merchant.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-800">
                    <Star size={13} className="fill-amber-400 text-amber-400" />
                    {merchant.rating}
                  </div>
                </div>

                <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                  <MapPin size={13} className="text-slate-400 shrink-0" />
                  {merchant.address}
                </p>

                <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Stasiun Terdekat:</span>
                    <span className="font-bold text-slate-800">
                      {merchant.nearestStation} ({merchant.distanceFromStationMeters}m)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Jam Operasional:</span>
                    <span className="font-semibold text-slate-700">{merchant.openingHours}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tingkat Harga:</span>
                    <span className="font-bold text-emerald-700">{merchant.priceTier}</span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {merchant.paymentMethods.map((p, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                    >
                      <QrCode size={10} /> {p}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                  <ShieldCheck size={13} /> Terkurasi
                </span>
                <Link
                  href={`/app?destLat=${merchant.coordinates[1]}&destLng=${merchant.coordinates[0]}&destName=${encodeURIComponent(merchant.name)}`}
                  className="inline-flex items-center gap-1 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition"
                >
                  Rute Jalan Kaki <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
