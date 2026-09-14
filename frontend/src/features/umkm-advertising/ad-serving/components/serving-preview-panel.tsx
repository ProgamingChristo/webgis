"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Info,
  Loader2,
  MapPin,
  MousePointer2,
  Play,
  ShieldCheck,
  Sparkles,
  Store,
  XCircle,
} from "lucide-react";
import { useServingPreview } from "../hooks/use-serving-preview";
import { SponsoredPinServingContext } from "../types/ad-serving.types";
import { formatCoordinate, validateManualCoordinates } from "../utils/serving-location";
import { SponsoredPinPreviewMap } from "./sponsored-pin-preview-map";
import { SponsoredPinCard } from "./sponsored-pin-card";

interface ServingPreviewPanelProps {
  merchantId: string;
  campaignId: string;
  merchantLocation: { longitude: number; latitude: number } | null;
  targetGeoJSON?: unknown | null;
  className?: string;
}

const CHECK_LABELS = [
  { key: "lifecycle", title: "Status promosi", pass: "Aktif", fail: "Belum aktif" },
  { key: "merchant", title: "Kesiapan usaha", pass: "Memenuhi syarat", fail: "Belum memenuhi syarat" },
  { key: "creative", title: "Materi promosi", pass: "Materi siap", fail: "Materi belum siap" },
  { key: "targeting", title: "Wilayah sasaran", pass: "Di dalam area", fail: "Di luar area" },
  { key: "payment", title: "Pembayaran", pass: "Terverifikasi", fail: "Belum terverifikasi" },
] as const;

export function ServingPreviewPanel({
  merchantId,
  campaignId,
  merchantLocation,
  targetGeoJSON,
  className = "",
}: ServingPreviewPanelProps) {
  const [context, setContext] = useState<SponsoredPinServingContext | null>(merchantLocation);
  const [manualCoordinates, setManualCoordinates] = useState({
    longitude: merchantLocation ? formatCoordinate(merchantLocation.longitude) : "",
    latitude: merchantLocation ? formatCoordinate(merchantLocation.latitude) : "",
  });
  const [coordinateErrors, setCoordinateErrors] = useState<Partial<Record<"longitude" | "latitude", string>>>({});
  const { result, isLoading, error, evaluateServing, resetResult } = useServingPreview({ merchantId, campaignId });

  const selectContext = (nextContext: SponsoredPinServingContext) => {
    setContext(nextContext);
    setManualCoordinates({
      longitude: formatCoordinate(nextContext.longitude),
      latitude: formatCoordinate(nextContext.latitude),
    });
    setCoordinateErrors({});
    resetResult();
  };

  const handleManualCoordinates = () => {
    const validation = validateManualCoordinates(manualCoordinates);
    setCoordinateErrors(validation.errors);
    if (validation.context) selectContext(validation.context);
  };

  const handleTestServing = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!context) {
      setCoordinateErrors({ longitude: "Pilih titik pada peta atau gunakan lokasi usaha terlebih dahulu." });
      return;
    }
    await evaluateServing(context).catch(() => undefined);
  };

  const blockerMessage = (code: string) => {
    switch (code) {
      case "CAMPAIGN_NOT_ACTIVE": return "Promosi belum aktif atau masa tayangnya belum berlangsung.";
      case "PAYMENT_NOT_VERIFIED": return "Pembayaran belum berstatus PAID yang diverifikasi server.";
      case "MERCHANT_NOT_ELIGIBLE": return "Usaha belum memenuhi ketentuan kepemilikan dan profil.";
      case "MERCHANT_GEOMETRY_INVALID": return "Lokasi usaha belum memiliki koordinat yang valid.";
      case "CREATIVE_NOT_FOUND": return "Materi promosi belum dibuat.";
      case "WRONG_CREATIVE_TYPE": return "Materi penanda promosi belum tersedia.";
      case "CREATIVE_NOT_READY": return "Materi promosi belum ditandai siap.";
      case "TARGET_NOT_CONFIGURED": return "Wilayah sasaran belum diatur.";
      case "TARGET_INVALID": return "Konfigurasi wilayah sasaran tidak valid.";
      case "OUTSIDE_TARGET": return "Titik uji berada di luar wilayah sasaran.";
      default: return "Promosi belum dapat ditayangkan. Periksa kembali kelengkapannya.";
    }
  };

  return (
    <section className={`space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 ${className}`}>
      <header className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sky-700">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
            <h3 className="text-lg font-bold text-slate-900">Uji Penayangan Promosi</h3>
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Simulasikan apakah promosi Anda memenuhi syarat untuk ditampilkan pada lokasi tertentu.
          </p>
        </div>
        <div className="max-w-md rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
          <div className="flex items-center gap-2 font-bold"><ShieldCheck className="h-4 w-4" /> Mode Uji Teknis</div>
          <p className="mt-1 leading-5 text-sky-800">Tidak membuat tayangan, biaya, atau event iklan produksi.</p>
        </div>
      </header>

      <form onSubmit={handleTestServing} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900"><MapPin className="h-4 w-4 text-sky-600" /> Lokasi simulasi</h4>
            <p className="mt-1 text-xs leading-5 text-slate-600">Gunakan lokasi usaha atau pilih titik langsung pada peta.</p>
          </div>
          <button
            type="button"
            onClick={() => merchantLocation && selectContext(merchantLocation)}
            disabled={!merchantLocation}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-sky-300 bg-white px-4 text-sm font-bold text-sky-700 shadow-xs transition hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
          >
            <Store className="h-4 w-4" /> Gunakan Lokasi Usaha
          </button>
        </div>
        {!merchantLocation && <p className="text-xs font-medium text-amber-700" role="status">Lokasi usaha belum tersedia. Pilih titik uji pada peta atau masukkan koordinat manual.</p>}
        {context ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="font-bold">Titik uji dipilih</span>
            <span>{context.latitude.toFixed(6)}, {context.longitude.toFixed(6)}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-3 text-xs text-slate-600"><MousePointer2 className="h-4 w-4" /> Klik peta untuk menentukan titik uji.</div>
        )}

        <details className="group rounded-xl border border-slate-200 bg-white">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-bold text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600">
            Masukkan koordinat manual
            <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
          </summary>
          <div className="grid grid-cols-1 gap-4 border-t border-slate-100 p-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-700">
              Longitude
              <input aria-describedby="longitude-help longitude-error" inputMode="decimal" value={manualCoordinates.longitude} onChange={(event) => { setManualCoordinates((current) => ({ ...current, longitude: event.target.value })); setCoordinateErrors((current) => ({ ...current, longitude: undefined })); }} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-hidden focus:border-sky-500 focus:ring-2 focus:ring-sky-100" placeholder="Contoh: 106.827153" />
              <span id="longitude-help" className="mt-1 block font-normal text-slate-500">Rentang -180 sampai 180.</span>
              {coordinateErrors.longitude && <span id="longitude-error" role="alert" className="mt-1 block font-normal text-red-600">{coordinateErrors.longitude}</span>}
            </label>
            <label className="text-xs font-bold text-slate-700">
              Latitude
              <input aria-describedby="latitude-help latitude-error" inputMode="decimal" value={manualCoordinates.latitude} onChange={(event) => { setManualCoordinates((current) => ({ ...current, latitude: event.target.value })); setCoordinateErrors((current) => ({ ...current, latitude: undefined })); }} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-hidden focus:border-sky-500 focus:ring-2 focus:ring-sky-100" placeholder="Contoh: -6.175392" />
              <span id="latitude-help" className="mt-1 block font-normal text-slate-500">Rentang -90 sampai 90.</span>
              {coordinateErrors.latitude && <span id="latitude-error" role="alert" className="mt-1 block font-normal text-red-600">{coordinateErrors.latitude}</span>}
            </label>
            <button type="button" onClick={handleManualCoordinates} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:border-sky-400 hover:text-sky-700 sm:col-span-2 sm:justify-self-start">Gunakan koordinat ini</button>
          </div>
        </details>

        <div className="flex justify-end">
          <button type="submit" disabled={isLoading || !context} style={{ color: context ? "#ffffff" : "#475569" }} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 text-sm font-bold shadow-sm transition hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Uji Penayangan
          </button>
        </div>
      </form>

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

      {result && (
        <section aria-live="polite" className="space-y-3">
          <div className={`flex items-start gap-3 rounded-xl border p-4 ${result.servable ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
            {result.servable ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />}
            <div>
              <h4 className="text-sm font-bold">{result.servable ? "Layak ditayangkan di titik ini" : "Belum layak ditayangkan di titik ini"}</h4>
              {result.servable ? <p className="mt-1 text-xs leading-5">Pemeriksaan status, usaha, materi, wilayah sasaran, dan pembayaran berhasil.</p> : <ul className="mt-2 space-y-1 text-xs leading-5">{result.blockers.map((blocker) => <li key={blocker}>• {blockerMessage(blocker)}</li>)}</ul>}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {CHECK_LABELS.map((item) => {
              const passed = result.checks[item.key];
              return <div key={item.key} className={`rounded-xl border p-3 ${passed ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-slate-50"}`}><span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">{item.title}</span><span className={`mt-1 flex items-center gap-1.5 text-xs font-bold ${passed ? "text-emerald-700" : "text-slate-700"}`}>{passed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Info className="h-3.5 w-3.5" />}{passed ? item.pass : item.fail}</span></div>;
            })}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(17rem,1fr)]">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-bold text-slate-900">Peta simulasi</h4><span className="text-xs text-slate-500">Klik peta atau geser penanda Titik Uji</span></div>
          <SponsoredPinPreviewMap merchantLocation={merchantLocation} contextLocation={context} targetGeoJSON={targetGeoJSON} placement={result?.placement || null} onContextChange={selectContext} />
          <p className="mt-2 text-xs leading-5 text-slate-500">Peta tidak sepenuhnya dapat dioperasikan dengan keyboard. Gunakan bagian koordinat manual sebagai alternatif aksesibel.</p>
        </div>
        <div className="min-w-0">
          <h4 className="mb-2 text-sm font-bold text-slate-900">Pratinjau promosi</h4>
          {result?.placement ? <SponsoredPinCard placement={result.placement} className="w-full" /> : <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"><Store className="h-8 w-8 text-slate-400" /><p className="mt-3 text-sm font-bold text-slate-700">Pratinjau belum tersedia</p><p className="mt-1 text-xs leading-5 text-slate-500">{result && result.blockers.length > 0 ? "Selesaikan alasan ketidaklayakan yang ditampilkan di atas." : "Pilih titik dan jalankan uji penayangan. Materi asli akan tampil jika seluruh syarat terpenuhi."}</p></div>}
        </div>
      </div>
    </section>
  );
}
