"use client";

import {
  Camera,
  Clock,
  ExternalLink,
  Lock,
  MapPin,
  ShieldCheck,
  WifiOff,
} from "lucide-react";
import type { CanonicalCamera, CameraHealthStatus } from "../../international/cctv-registry";
import { getHealthStatusLabel } from "../../international/cctv-registry";

interface CameraCardProps {
  camera: CanonicalCamera;
  isSelected: boolean;
  onClick: () => void;
}

function StatusChip({ status }: { status: CameraHealthStatus }) {
  const cfg = {
    ONLINE: { bg: "bg-green-100", text: "text-green-700", border: "border-green-200", dot: "bg-green-500", pulse: true },
    DEGRADED: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500", pulse: false },
    STALE: { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200", dot: "bg-slate-400", pulse: false },
    OFFLINE: { bg: "bg-red-100", text: "text-red-700", border: "border-red-200", dot: "bg-red-500", pulse: false },
    NO_STREAM: { bg: "bg-slate-100", text: "text-slate-500", border: "border-slate-200", dot: "bg-slate-300", pulse: false },
    UNKNOWN: { bg: "bg-slate-100", text: "text-slate-500", border: "border-slate-200", dot: "bg-slate-300", pulse: false },
  }[status] ?? { bg: "bg-slate-100", text: "text-slate-500", border: "border-slate-200", dot: "bg-slate-300", pulse: false };

  return (
    <span
      className={`flex items-center gap-1 rounded-full ${cfg.bg} ${cfg.text} border ${cfg.border} px-2 py-0.5 text-[10px] font-bold`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot} ${cfg.pulse ? "animate-pulse" : ""}`} />
      {getHealthStatusLabel(status)}
    </span>
  );
}

export function CameraCard({ camera, isSelected, onClick }: CameraCardProps) {
  const openOfficialSource = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(
      camera.public_portal_url ?? "https://jakcctv.jakarta.go.id/publik",
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-3 transition-all ${
        isSelected
          ? "border-[#118ab2] bg-[#f0f9ff] shadow-sm ring-1 ring-[#118ab2]/20"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        {/* Left: camera info */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-800 leading-snug">
            {camera.camera_name}
          </p>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            <MapPin size={10} className="shrink-0" />
            <span className="truncate">{camera.district}</span>
          </div>
        </div>

        {/* Right: status */}
        <StatusChip status={camera.health_status} />
      </div>

      {/* Provider & source row */}
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <ShieldCheck size={10} className="text-slate-400" />
          <span>{camera.provider}</span>
        </div>

        {/* Embed/stream indicator */}
        <div className="flex items-center gap-1 text-[10px]">
          {camera.embed_url ? (
            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-600 font-semibold border border-blue-100">
              EMBED
            </span>
          ) : camera.source_type === "SNAPSHOT_POLLING" ? (
            <span className="rounded bg-purple-50 px-1.5 py-0.5 text-purple-600 font-semibold border border-purple-100">
              SNAPSHOT
            </span>
          ) : (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-400 font-semibold border border-slate-200">
              NO STREAM
            </span>
          )}
        </div>
      </div>

      {/* Verified timestamp */}
      {camera.last_verified_at && (
        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400">
          <Clock size={9} />
          <span>
            Diverifikasi{" "}
            {new Date(camera.last_verified_at).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
              timeZone: "Asia/Jakarta",
            })}
          </span>
        </div>
      )}

      {/* Actions row */}
      <div className="mt-2 flex items-center gap-2">
        {/* Open camera in selected state */}
        {isSelected && (
          <span className="text-[10px] font-semibold text-[#118ab2]">
            ● Dipilih
          </span>
        )}

        <button
          type="button"
          onClick={openOfficialSource}
          className="ml-auto flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 transition"
          aria-label={`Buka ${camera.camera_name} di sumber resmi`}
        >
          <ExternalLink size={10} />
          Sumber Resmi
        </button>
      </div>
    </button>
  );
}
