"use client";

/**
 * GETRA AI Vision Tab
 *
 * AI ANALYSIS — strictly separated from Live CCTV.
 *
 * Rules:
 * - Label [AI ANALYSIS] is mandatory on every AI metric panel
 * - AI metrics ONLY appear when pipeline_state === "LIVE" from runtime inference
 * - When pipeline is not active: show "DATA UNAVAILABLE" clearly
 * - No fake bounding boxes, no hardcoded counts
 * - User must understand: these numbers come from actual computer vision inference
 */

import { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Bot,
  Bike,
  Bus,
  Car,
  Info,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react";
import { CANONICAL_CAMERA_REGISTRY } from "../../international/cctv-registry";

const AI_OBJECT_CLASSES = [
  { key: "pedestrian_count", label: "Pedestrian", icon: Users, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  { key: "bicycle_count", label: "Sepeda", icon: Bike, color: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-200" },
  { key: "motorcycle_count", label: "Motor", icon: Activity, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  { key: "car_count", label: "Mobil", icon: Car, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200" },
  { key: "bus_count", label: "Bus", icon: Bus, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
  { key: "truck_count", label: "Truk", icon: Truck, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
] as const;

type AiMetricKey = typeof AI_OBJECT_CLASSES[number]["key"];

export function AiVisionTab() {
  // Only cameras that declare AI support
  const aiCameras = useMemo(
    () => CANONICAL_CAMERA_REGISTRY.filter((c) => c.supports_ai && c.ai_capabilities.length > 0),
    [],
  );

  const allCameras = CANONICAL_CAMERA_REGISTRY;
  const [selectedCameraId, setSelectedCameraId] = useState<string>(
    aiCameras[0]?.camera_id ?? allCameras[0]?.camera_id ?? "",
  );
  const [aiOverlay, setAiOverlay] = useState(false);

  const selectedCamera = useMemo(
    () => CANONICAL_CAMERA_REGISTRY.find((c) => c.camera_id === selectedCameraId),
    [selectedCameraId],
  );

  const metrics = selectedCamera?.runtime_metrics;
  const isLive = metrics?.pipeline_state === "LIVE";
  const isDegraded = metrics?.pipeline_state === "DEGRADED";
  const isUnavailable = !metrics || metrics.pipeline_state === "DATA_UNAVAILABLE" || metrics.pipeline_state === "OFFLINE";

  return (
    <div className="flex flex-col gap-4">

      {/* ================================================================== */}
      {/* AI Vision header — with mandatory label                            */}
      {/* ================================================================== */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <Bot size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 border border-blue-200">
                AI ANALYSIS
              </span>
              {isLive && (
                <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                  INFERENCE ACTIVE
                </span>
              )}
              {isDegraded && (
                <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                  DEGRADED
                </span>
              )}
              {isUnavailable && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                  WAITING FOR FRAME
                </span>
              )}
            </div>
            <h2 className="text-base font-black text-blue-900">CCTV AI Vision</h2>
            <p className="mt-0.5 text-xs text-blue-700 leading-relaxed">
              Deteksi objek dari frame kamera menggunakan computer vision (YOLOv8). 
              Metrik hanya ditampilkan jika inference pipeline aktif dan menerima frame kamera nyata. 
              Angka "DATA UNAVAILABLE" berarti tidak ada frame yang diterima — bukan angka nol.
            </p>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* Camera selector for AI                                              */}
      {/* ================================================================== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <label className="mb-2 block text-xs font-bold text-slate-600 uppercase tracking-wider">
          Pilih Kamera untuk Analisis AI
        </label>
        <select
          value={selectedCameraId}
          onChange={(e) => setSelectedCameraId(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-[#118ab2] focus:outline-none"
        >
          <optgroup label="Kamera dengan AI">
            {aiCameras.map((c) => (
              <option key={c.camera_id} value={c.camera_id}>
                {c.camera_name} ({c.district})
              </option>
            ))}
          </optgroup>
          <optgroup label="Kamera tanpa AI">
            {allCameras
              .filter((c) => !c.supports_ai || c.ai_capabilities.length === 0)
              .map((c) => (
                <option key={c.camera_id} value={c.camera_id}>
                  {c.camera_name} — AI tidak tersedia
                </option>
              ))}
          </optgroup>
        </select>

        {/* AI capability chips for selected camera */}
        {selectedCamera && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {selectedCamera.ai_capabilities.length > 0 ? (
              selectedCamera.ai_capabilities.map((cap) => (
                <span
                  key={cap}
                  className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-100"
                >
                  {cap.replace(/_/g, " ")}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-slate-400 italic">
                Kamera ini tidak mendukung AI inference saat ini.
              </span>
            )}
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* AI Overlay toggle (future feature note)                             */}
      {/* ================================================================== */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
        <div>
          <p className="text-xs font-bold text-slate-700">AI Object Overlay</p>
          <p className="text-[11px] text-slate-500">
            Bounding box dari hasil inference aktual
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAiOverlay(!aiOverlay)}
          disabled={isUnavailable}
          className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
            aiOverlay && !isUnavailable
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          }`}
          title={isUnavailable ? "Pipeline AI tidak aktif — tidak ada frame yang tersedia" : ""}
        >
          <Activity size={13} />
          {aiOverlay && !isUnavailable ? "ON" : "OFF"}
        </button>
      </div>

      {/* ================================================================== */}
      {/* AI Metrics Grid                                                      */}
      {/* Shown as DATA UNAVAILABLE when pipeline is not live.               */}
      {/* ================================================================== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 border border-blue-200">
            AI ANALYSIS
          </span>
          <span className="text-xs font-bold text-slate-600">
            Deteksi Objek Real-time
          </span>
          {isUnavailable && (
            <span className="ml-auto flex items-center gap-1 text-[11px] text-slate-400">
              <AlertCircle size={11} />
              Pipeline tidak aktif
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {AI_OBJECT_CLASSES.map(({ key, label, icon: Icon, color, bg, border }) => {
            const value = isLive || isDegraded
              ? (metrics?.[key as AiMetricKey] ?? null)
              : null;

            return (
              <div
                key={key}
                className={`rounded-xl border ${border} ${bg} p-3`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={13} className={color} />
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${color}`}>
                    {label}
                  </span>
                </div>
                <p className={`text-xl font-black ${value !== null ? color : "text-slate-400"}`}>
                  {value !== null ? value : "—"}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {value !== null ? "dari inference" : "DATA UNAVAILABLE"}
                </p>
              </div>
            );
          })}
        </div>

        {/* Confidence & model info */}
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold">Confidence</span>
            <p className="font-bold text-slate-700 mt-0.5">
              {(isLive || isDegraded) && metrics?.confidence !== null && metrics?.confidence !== undefined
                ? `${(metrics.confidence * 100).toFixed(0)}%`
                : "UNAVAILABLE"}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold">Model</span>
            <p className="font-bold text-slate-700 mt-0.5">
              {(isLive || isDegraded) && metrics?.model_version
                ? metrics.model_version
                : "UNAVAILABLE"}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold">Last Inference</span>
            <p className="font-bold text-slate-700 mt-0.5">
              {(isLive || isDegraded) && metrics?.last_inference_at
                ? new Date(metrics.last_inference_at).toLocaleTimeString("id-ID", {
                    timeZone: "Asia/Jakarta",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  }) + " WIB"
                : "UNAVAILABLE"}
            </p>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* Data truth notice                                                    */}
      {/* ================================================================== */}
      <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
        <Info size={14} className="shrink-0 mt-0.5 text-slate-400" />
        <p>
          <strong className="text-slate-600">Kebenaran Data AI:</strong> Angka deteksi di atas hanya valid
          jika pipeline inference YOLOv8 aktif dan menerima frame kamera nyata. Saat ini pipeline tidak
          aktif (DATA_UNAVAILABLE). GETRA tidak menampilkan angka sintetis atau estimasi sebagai data deteksi.
        </p>
      </div>
    </div>
  );
}
