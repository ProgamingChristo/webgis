"use client";

import { useState } from "react";
import Link from "next/link";
import { Database, Download, Code, Check, Terminal } from "lucide-react";
import { OPEN_GEO_DATASETS } from "../data";

export function OpenDataView() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleDownloadSimulation = (filename: string) => {
    // Generate a downloadable GeoJSON object for demonstration
    const sampleGeoJson = {
      type: "FeatureCollection",
      name: filename.replace(".geojson", ""),
      crs: { type: "name", properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" } },
      features: [
        {
          type: "Feature",
          properties: { id: 1, name: "Sample Feature", study_area: "Jakarta Central" },
          geometry: { type: "Point", coordinates: [106.8227, -6.2008] },
        },
      ],
    };

    const blob = new Blob([JSON.stringify(sampleGeoJson, null, 2)], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySnippet = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 3000);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Intro Banner */}
      <section className="rounded-2xl border border-sky-100 bg-gradient-to-r from-slate-900 to-sky-950 p-6 text-white shadow-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-300">
              <Database size={14} /> Ekosistem Data Terbuka Spasial & API
            </span>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Portal Data Terbuka GIS & Pengembang
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-300">
              Akses dataset geospasial jaringan pedestrian Jakarta, sebaran titik transit, dan data fasilitas aksesibilitas berformat standar GeoJSON untuk riset akademis, kebijakan publik, dan aplikasi pihak ketiga.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-sky-400 transition"
            >
              <Code size={16} /> Eksplorasi Peta WebGIS
            </Link>
          </div>
        </div>
      </section>

      {/* Dataset Catalog Grid */}
      <div className="space-y-4">
        <h2 className="text-base font-black text-slate-900">
          Katalog Dataset Spasial Terbuka ({OPEN_GEO_DATASETS.length})
        </h2>

        <div className="grid gap-6 md:grid-cols-3">
          {OPEN_GEO_DATASETS.map((ds) => (
            <div
              key={ds.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="rounded bg-sky-50 px-2 py-0.5 text-[10px] font-black text-sky-700 uppercase">
                    {ds.format}
                  </span>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    {ds.featuresCount.toLocaleString("id-ID")} fitur
                  </span>
                </div>

                <h3 className="text-base font-black text-slate-900 leading-snug mt-2">
                  {ds.title}
                </h3>

                <div className="mt-4 space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <div>
                    <span className="text-slate-400 block">Cakupan Wilayah:</span>
                    <span className="font-semibold text-slate-800">{ds.coverageArea}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Pembaruan Terakhir:</span>
                    <span className="font-semibold text-slate-800">{ds.lastUpdated}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Lisensi Data:</span>
                    <span className="font-semibold text-slate-800">{ds.license}</span>
                  </div>
                </div>

                <div className="mt-3 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Atribut Schema:</span>
                  <div className="flex flex-wrap gap-1">
                    {ds.schemaFields.map((f, idx) => (
                      <span
                        key={idx}
                        className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleDownloadSimulation(ds.downloadFilename)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
                >
                  <Download size={13} /> Unduh {ds.format}
                </button>
                <span className="text-[11px] text-slate-400 font-mono">WGS84 (EPSG:4326)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Developer API Sandbox Guide */}
      <div className="rounded-2xl border border-slate-200 bg-slate-900 p-6 text-white shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal size={18} className="text-sky-400" />
            <h3 className="text-base font-black">Contoh Akses API Geospasial GETRA</h3>
          </div>
          <button
            type="button"
            onClick={() =>
              handleCopySnippet(
                "curl",
                "curl -X GET 'https://getra-routing-api.tail0ed517.ts.net/api/transport/nearest?lat=-6.2008&lng=106.8227&limit=5'"
              )
            }
            className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1 text-xs font-bold text-sky-300 hover:bg-slate-700 border border-slate-700"
          >
            {copiedId === "curl" ? (
              <>
                <Check size={12} className="text-emerald-400" /> Tersalin!
              </>
            ) : (
              "Salin cURL"
            )}
          </button>
        </div>

        <pre className="overflow-x-auto rounded-xl bg-black/60 p-4 text-xs font-mono text-emerald-400 border border-slate-800 leading-relaxed">
          {`# Ambil 5 stasiun/halte transit terdekat dari Dukuh Atas (lat: -6.2008, lng: 106.8227)
curl -X GET "https://getra-routing-api.tail0ed517.ts.net/api/transport/nearest?lat=-6.2008&lng=106.8227&limit=5" \\
  -H "Accept: application/json"`}
        </pre>
      </div>
    </div>
  );
}
