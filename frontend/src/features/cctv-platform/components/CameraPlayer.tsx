"use client";

/**
 * GETRA CameraPlayer
 *
 * ARCHITECTURAL RULES:
 * - NO fake canvas animation
 * - NO synthetic dark backgrounds pretending to be camera feeds
 * - NO fake bounding boxes
 * - If a camera has a verified embed_url → render iframe labeled [REAL CAMERA]
 * - If a camera is SNAPSHOT type → render <img> with refresh
 * - Otherwise → render truthful fallback with "Buka Sumber Resmi" link
 *
 * Labels are MANDATORY and non-negotiable:
 * - [REAL CAMERA] for actual streams/iframes
 * - Fallback clearly says "Preview tidak tersedia"
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  ExternalLink,
  Maximize2,
  Minimize2,
  RefreshCw,
  WifiOff,
  Lock,
  Clock,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import type { CanonicalCamera } from "../../international/cctv-registry";

interface CameraPlayerProps {
  camera: CanonicalCamera;
  className?: string;
}

export function CameraPlayer({ camera, className = "" }: CameraPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [imgKey, setImgKey] = useState(0); // force img re-fetch
  const [iframeError, setIframeError] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>(
    new Date().toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" }),
  );

  const isOnline = camera.health_status === "ONLINE";
  const isDegraded = camera.health_status === "DEGRADED";
  const isOffline = camera.health_status === "OFFLINE";
  const isNoStream =
    camera.health_status === "NO_STREAM" ||
    camera.source_type === "NO_STREAM";
  const isStale = camera.health_status === "STALE";
  const isUnknown = camera.health_status === "UNKNOWN";

  const hasEmbed = camera.embed_url !== null && !iframeError;
  const hasSnapshot =
    camera.source_type === "SNAPSHOT_POLLING" && camera.stream_url !== null;

  // Determine what to render
  const renderMode: "iframe" | "snapshot" | "fallback" = (() => {
    if (hasEmbed) return "iframe";
    if (hasSnapshot) return "snapshot";
    return "fallback";
  })();

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Snapshot auto-refresh every 5 seconds
  useEffect(() => {
    if (renderMode !== "snapshot") return;
    const interval = setInterval(() => {
      setImgKey((k) => k + 1);
      setLastRefreshed(
        new Date().toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" }),
      );
    }, 5000);
    return () => clearInterval(interval);
  }, [renderMode]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setImgKey((k) => k + 1);
    setLastRefreshed(
      new Date().toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" }),
    );
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const openOfficialSource = () => {
    const url = camera.public_portal_url ?? "https://jakcctv.jakarta.go.id/publik";
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${isFullscreen ? "h-screen w-screen rounded-none" : ""} ${className}`}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Header Bar — always shows [REAL CAMERA] or [PREVIEW UNAVAILABLE]   */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        <div className="flex items-center gap-2">
          {/* Camera type label — mandatory, non-negotiable */}
          {renderMode === "iframe" || renderMode === "snapshot" ? (
            <span className="flex items-center gap-1.5 rounded-md bg-green-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-green-700 border border-green-200">
              <Camera size={11} />
              REAL CAMERA
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 border border-slate-200">
              <AlertCircle size={11} />
              PREVIEW TIDAK TERSEDIA
            </span>
          )}

          {/* Source label */}
          <span className="hidden sm:inline text-[11px] font-semibold text-slate-500">
            {camera.source_type === "DKI_PUBLIC_IFRAME"
              ? "DKI PUBLIC CCTV"
              : camera.source_type === "SNAPSHOT_POLLING"
                ? "SNAPSHOT"
                : camera.source_type === "HLS_STREAM"
                  ? "HLS STREAM"
                  : "REGISTRY ONLY"}
          </span>
        </div>

        {/* Status chip */}
        <div className="flex items-center gap-2">
          {isOnline && (
            <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
              LIVE
            </span>
          )}
          {isDegraded && (
            <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              DEGRADED
            </span>
          )}
          {isStale && (
            <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
              <Clock size={10} />
              STALE
            </span>
          )}
          {isOffline && (
            <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
              <WifiOff size={10} />
              OFFLINE
            </span>
          )}
          {isNoStream && (
            <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
              <Lock size={10} />
              NO STREAM
            </span>
          )}
          {isUnknown && (
            <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
              UNKNOWN
            </span>
          )}

          {/* Fullscreen */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            aria-label={isFullscreen ? "Keluar layar penuh" : "Layar penuh"}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Main Content Area — 16:9 aspect ratio                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative aspect-video w-full bg-slate-100 flex items-center justify-center overflow-hidden">

        {/* ── MODE A: DKI Public Portal iframe ── */}
        {renderMode === "iframe" && camera.embed_url && (
          <iframe
            key={camera.camera_id}
            src={camera.embed_url}
            title={`Kamera CCTV: ${camera.camera_name}`}
            className="h-full w-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms"
            loading="lazy"
            onError={() => setIframeError(true)}
            aria-label={`Live stream kamera ${camera.camera_name}`}
          />
        )}

        {/* ── MODE B: Snapshot polling ── */}
        {renderMode === "snapshot" && camera.stream_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={imgKey}
            src={`${camera.stream_url}?t=${imgKey}`}
            alt={`Snapshot kamera ${camera.camera_name}`}
            className="h-full w-full object-contain"
            onError={() => {
              /* snapshot error handled gracefully */
            }}
          />
        )}

        {/* ── MODE C: Truthful Fallback ── */}
        {renderMode === "fallback" && (
          <div className="flex flex-col items-center justify-center gap-4 p-6 text-center max-w-sm">
            {/* Offline icon */}
            {isOffline ? (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-400 border border-red-100">
                <WifiOff size={28} />
              </div>
            ) : isNoStream ? (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 border border-slate-200">
                <Lock size={28} />
              </div>
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 border border-slate-200">
                <Camera size={28} />
              </div>
            )}

            {/* Message */}
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-700">
                Preview kamera tidak dapat disematkan
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                {isOffline
                  ? `Kamera ${camera.camera_name} sedang offline. Periksa sumber resmi untuk status terkini.`
                  : isNoStream
                    ? `Stream kamera ini tidak tersedia untuk publik. Metadata lokasi tercatat dalam registry.`
                    : isUnknown
                      ? `Status kamera belum diverifikasi. Lihat portal resmi DKI untuk informasi aktual.`
                      : `Embed tidak tersedia. Gunakan link sumber resmi untuk mengakses kamera ini.`}
              </p>
            </div>

            {/* Source info box */}
            <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-left space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Sumber</span>
                <span className="font-semibold text-slate-700">DKI Public CCTV</span>
              </div>
              {camera.last_verified_at && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Terverifikasi</span>
                  <span className="font-mono text-slate-600">
                    {new Date(camera.last_verified_at).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      timeZone: "Asia/Jakarta",
                    })}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className={`font-bold ${
                  isOffline ? "text-red-600" :
                  isNoStream ? "text-slate-500" :
                  "text-slate-600"
                }`}>
                  {isOffline ? "OFFLINE" : isNoStream ? "NO_STREAM" : isUnknown ? "UNKNOWN" : camera.health_status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Provider</span>
                <span className="font-semibold text-slate-700">{camera.provider}</span>
              </div>
            </div>

            {/* Official source button */}
            <button
              type="button"
              onClick={openOfficialSource}
              className="flex items-center gap-2 rounded-xl bg-[#118ab2] px-4 py-2 text-xs font-bold text-white hover:bg-[#0d7495] transition"
            >
              <ExternalLink size={13} />
              Lihat di Sumber Resmi
            </button>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Bottom Controls Bar                                                 */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-4 py-2">
        {/* Left: camera info */}
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-slate-700">{camera.camera_name}</p>
          <p className="text-[10px] text-slate-500 truncate">
            {camera.provider} · {camera.district}
          </p>
        </div>

        {/* Right: actions */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Refresh — only for snapshot mode */}
          {renderMode === "snapshot" && (
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition disabled:opacity-50"
            >
              <RefreshCw size={11} className={isRefreshing ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}

          {/* Open official source — always available */}
          <button
            type="button"
            onClick={openOfficialSource}
            className="flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            <ExternalLink size={11} />
            <span className="hidden sm:inline">Sumber Resmi</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Privacy & License Footer                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center gap-2 border-t border-slate-100 bg-white px-4 py-1.5 text-[10px] text-slate-400">
        <ShieldCheck size={11} className="shrink-0 text-green-500" />
        <span className="truncate">{camera.privacy_policy}</span>
        {lastRefreshed && renderMode === "snapshot" && (
          <span className="ml-auto shrink-0 font-mono">
            Diperbarui {lastRefreshed} WIB
          </span>
        )}
      </div>
    </div>
  );
}
