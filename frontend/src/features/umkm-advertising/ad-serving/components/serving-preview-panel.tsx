"use client";

import React, { useState, useEffect } from "react";
import { useServingPreview } from "../hooks/use-serving-preview";
import { SponsoredPinServingContext } from "../types/ad-serving.types";
import { SponsoredPinPreviewMap } from "./sponsored-pin-preview-map";
import { SponsoredPinCard } from "./sponsored-pin-card";
import { 
  Play, 
  MapPin, 
  Store, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Sparkles, 
  Loader2 
} from "lucide-react";

interface ServingPreviewPanelProps {
  merchantId: string;
  campaignId: string;
  merchantLocation: { longitude: number; latitude: number } | null;
  targetGeoJSON?: any | null;
  className?: string;
}

export function ServingPreviewPanel({
  merchantId,
  campaignId,
  merchantLocation,
  targetGeoJSON,
  className = "",
}: ServingPreviewPanelProps) {
  const [context, setContext] = useState<SponsoredPinServingContext>(() => {
    return merchantLocation || { longitude: 107.609, latitude: -6.9175 }; // Default to Bandung Braga
  });

  const { result, isLoading, error, evaluateServing, resetResult } = useServingPreview({
    merchantId,
    campaignId,
  });

  // Sync initial context if merchant location loads late
  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => {
        if (merchantLocation && !result) {
          setContext(merchantLocation);
        }
      },
      0,
    );

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [merchantLocation, result]);

  const handleUseMerchantLocation = () => {
    if (merchantLocation) {
      setContext(merchantLocation);
      resetResult();
    }
  };

  const handleTestServing = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await evaluateServing(context);
  };

  const getBlockerMessage = (code: string) => {
    switch (code) {
      case "CAMPAIGN_NOT_ACTIVE":
        return "Status campaign bukan ACTIVE (sedang Draft, Terjadwal, Dijeda, atau Selesai).";
      case "MERCHANT_NOT_ELIGIBLE":
        return "Toko belum eligible untuk beriklan (periksa klaim kepemilikan dan profil).";
      case "MERCHANT_GEOMETRY_INVALID":
        return "Koordinat lokasi toko UMKM tidak valid.";
      case "CREATIVE_NOT_FOUND":
      case "WRONG_CREATIVE_TYPE":
      case "CREATIVE_NOT_READY":
        return "Belum ada materi iklan tipe SPONSORED_PIN berstatus Siap (Ready).";
      case "TARGET_NOT_CONFIGURED":
      case "TARGET_INVALID":
        return "Targeting wilayah (Radius / Study Area) belum dikonfigurasi.";
      case "OUTSIDE_TARGET":
        return "Titik lokasi uji berada di luar jangkauan target wilayah campaign ini.";
      default:
        return code;
    }
  };

  return (
    <div
      className={`rounded-xl border border-slate-700 bg-slate-900/70 p-5 shadow-xl ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Uji Penayangan Iklan (Ad Serving Preview)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Simulasikan lokasi commuter/pengguna untuk menguji apakah iklan Anda berhak tayang sebagai Sponsored Pin secara real-time.
          </p>
        </div>

        <span className="inline-flex items-center gap-1 self-start sm:self-auto rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-300 border border-slate-700">
          Mode: Uji Teknis (0 Event Tracking)
        </span>
      </div>

      {/* Control Panel: Coordinates & Trigger */}
      <form onSubmit={handleTestServing} className="mb-5 space-y-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-400" />
            Titik Lokasi Konteks Uji (User / Map Context)
          </label>

          {merchantLocation && (
            <button
              type="button"
              onClick={handleUseMerchantLocation}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 hover:underline"
            >
              <Store className="w-3 h-3" />
              Gunakan Titik Toko
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <span className="block text-[10px] text-slate-400 mb-1">Longitude</span>
            <input
              type="number"
              step="any"
              value={context.longitude}
              onChange={(e) => setContext({ ...context, longitude: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white shadow-sm focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <span className="block text-[10px] text-slate-400 mb-1">Latitude</span>
            <input
              type="number"
              step="any"
              value={context.latitude}
              onChange={(e) => setContext({ ...context, latitude: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white shadow-sm focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 transition-all"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            Uji Penayangan
          </button>
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div className="mb-4 flex items-center gap-2 p-3 text-xs text-rose-300 bg-rose-950/50 border border-rose-800 rounded-lg">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Evaluation Results Banner & Checklist */}
      {result && (
        <div className="mb-5 space-y-3">
          {/* Main Outcome Alert */}
          {result.servable ? (
            <div className="flex items-start gap-3 rounded-lg border border-emerald-500/40 bg-emerald-950/40 p-4 text-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-emerald-100">
                  ✨ Campaign Eligible untuk Ditayangkan (Servable)!
                </h4>
                <p className="text-xs text-emerald-300/90 mt-0.5">
                  Iklan Sponsored Pin memenuhi seluruh kriteria status, materi iklan, kelayakan toko, dan berada di dalam jangkauan targeting.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-950/40 p-4 text-amber-200">
              <XCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-100">
                  Campaign Tidak Ditayangkan pada Lokasi Ini
                </h4>
                <div className="text-xs text-amber-300/90 mt-1 space-y-0.5">
                  {result.blockers.map((b) => (
                    <div key={b} className="flex items-center gap-1.5">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                      <span>{getBlockerMessage(b)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 4-Pillar Evaluation Checklist */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className={`p-2.5 rounded-lg border text-center ${result.checks.lifecycle ? "border-emerald-800 bg-emerald-950/30 text-emerald-300" : "border-slate-800 bg-slate-900 text-slate-400"}`}>
              <span className="block text-[10px] uppercase font-bold text-slate-500">1. Status</span>
              <span className="text-xs font-semibold">{result.checks.lifecycle ? "✓ Active" : `✕ ${result.effectiveStatus}`}</span>
            </div>

            <div className={`p-2.5 rounded-lg border text-center ${result.checks.merchant ? "border-emerald-800 bg-emerald-950/30 text-emerald-300" : "border-slate-800 bg-slate-900 text-slate-400"}`}>
              <span className="block text-[10px] uppercase font-bold text-slate-500">2. Toko UMKM</span>
              <span className="text-xs font-semibold">{result.checks.merchant ? "✓ Eligible" : "✕ Belum Lolos"}</span>
            </div>

            <div className={`p-2.5 rounded-lg border text-center ${result.checks.creative ? "border-emerald-800 bg-emerald-950/30 text-emerald-300" : "border-slate-800 bg-slate-900 text-slate-400"}`}>
              <span className="block text-[10px] uppercase font-bold text-slate-500">3. Materi Iklan</span>
              <span className="text-xs font-semibold">{result.checks.creative ? "✓ Pin Ready" : "✕ Belum Ready"}</span>
            </div>

            <div className={`p-2.5 rounded-lg border text-center ${result.checks.targeting ? "border-emerald-800 bg-emerald-950/30 text-emerald-300" : "border-slate-800 bg-slate-900 text-slate-400"}`}>
              <span className="block text-[10px] uppercase font-bold text-slate-500">4. Targeting</span>
              <span className="text-xs font-semibold">{result.checks.targeting ? "✓ Didalam Area" : "✕ Diluar Area"}</span>
            </div>
          </div>
        </div>
      )}

      {/* Map & Card Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2">
          <span className="block text-xs font-semibold text-slate-300 mb-2">
            Peta Simulasi & Visualisasi Penayangan
          </span>
          <SponsoredPinPreviewMap
            merchantLocation={merchantLocation}
            contextLocation={context}
            targetGeoJSON={targetGeoJSON}
            placement={result?.placement || null}
            onContextChange={(newCtx) => {
              setContext(newCtx);
              resetResult();
            }}
          />
        </div>

        <div>
          <span className="block text-xs font-semibold text-slate-300 mb-2">
            Pratinjau Kartu Sponsored Pin
          </span>
          {result?.placement ? (
            <SponsoredPinCard placement={result.placement} />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-center text-slate-500 h-80">
              <Store className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-xs font-medium">
                Kartu Sponsored Pin akan muncul di sini jika campaign eligible untuk ditayangkan.
              </p>
              <p className="text-[11px] text-slate-600 mt-1">
                Klik tombol &quot;Uji Penayangan&quot; untuk mengevaluasi.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
