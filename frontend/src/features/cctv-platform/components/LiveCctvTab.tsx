"use client";

/**
 * GETRA Live CCTV Tab
 *
 * Architectural principle: REAL CAMERA FIRST.
 * - This tab only shows camera availability, provenance, and live/status feed.
 * - NO AI metrics on this tab.
 * - Map is the spatial foundation.
 * - Camera list is a drawer, not a permanent huge column.
 */

import { useMemo, useState } from "react";
import {
  Camera,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Filter,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  CANONICAL_CAMERA_REGISTRY,
  getCameraRegistryStats,
  getHealthStatusLabel,
  type CameraHealthStatus,
} from "../../international/cctv-registry";
import { CameraPlayer } from "./CameraPlayer";
import { CameraCard } from "./CameraCard";

const DISTRICT_OPTIONS = [
  { value: "", label: "Semua Wilayah" },
  { value: "Jakarta Pusat", label: "Jakarta Pusat" },
  { value: "Jakarta Selatan", label: "Jakarta Selatan" },
  { value: "Jakarta Barat", label: "Jakarta Barat" },
  { value: "Jakarta Timur", label: "Jakarta Timur" },
  { value: "Jakarta Utara", label: "Jakarta Utara" },
  { value: "Kepulauan Seribu", label: "Kepulauan Seribu" },
];

const PROVIDER_OPTIONS = [
  { value: "", label: "Semua Provider" },
  { value: "Dishub DKI", label: "Dishub DKI" },
  { value: "Polda Metro Jaya", label: "Polda Metro Jaya" },
  { value: "Satpol PP DKI", label: "Satpol PP DKI" },
  { value: "DBM DKI", label: "DBM DKI" },
  { value: "BUMD", label: "BUMD" },
  { value: "Authorized Partner", label: "Authorized Partner" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "ONLINE", label: "Live" },
  { value: "DEGRADED", label: "Degraded" },
  { value: "OFFLINE", label: "Offline" },
  { value: "NO_STREAM", label: "No Stream" },
  { value: "UNKNOWN", label: "Unknown" },
];

const STATUS_COLORS: Record<string, string> = {
  ONLINE: "text-green-600",
  DEGRADED: "text-amber-600",
  STALE: "text-slate-500",
  OFFLINE: "text-red-600",
  NO_STREAM: "text-slate-400",
  UNKNOWN: "text-slate-400",
};

export function LiveCctvTab() {
  const stats = useMemo(() => getCameraRegistryStats(), []);

  const [selectedCameraId, setSelectedCameraId] = useState<string>(
    CANONICAL_CAMERA_REGISTRY[0]?.camera_id ?? "",
  );
  const [district, setDistrict] = useState("");
  const [provider, setProvider] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [listCollapsed, setListCollapsed] = useState(false);

  const filteredCameras = useMemo(() => {
    return CANONICAL_CAMERA_REGISTRY.filter((c) => {
      if (district && c.district !== district) return false;
      if (provider && c.provider !== provider) return false;
      if (status && c.health_status !== status && !(status === "NO_STREAM" && c.source_type === "NO_STREAM")) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !c.camera_name.toLowerCase().includes(q) &&
          !c.district.toLowerCase().includes(q) &&
          !c.site_name.toLowerCase().includes(q) &&
          !c.provider.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [district, provider, status, search]);

  const selectedCamera = useMemo(
    () =>
      CANONICAL_CAMERA_REGISTRY.find((c) => c.camera_id === selectedCameraId) ??
      CANONICAL_CAMERA_REGISTRY[0],
    [selectedCameraId],
  );

  return (
    <div className="flex flex-col gap-4">

      {/* ================================================================== */}
      {/* Top Metrics Bar — calculated from registry                         */}
      {/* ================================================================== */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Terdaftar
          </span>
          <p className="mt-1 text-2xl font-black text-slate-800">{stats.total}</p>
          <span className="text-[11px] text-slate-500">kamera DKI</span>
        </div>
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-green-600">
            Live / Online
          </span>
          <p className="mt-1 text-2xl font-black text-green-700">
            {stats.online}
          </p>
          <span className="text-[11px] text-green-600">kamera aktif</span>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
            Degraded
          </span>
          <p className="mt-1 text-2xl font-black text-amber-700">
            {stats.degraded}
          </p>
          <span className="text-[11px] text-amber-600">kamera terganggu</span>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">
            Offline / No Stream
          </span>
          <p className="mt-1 text-2xl font-black text-red-700">
            {stats.offline + stats.noStream}
          </p>
          <span className="text-[11px] text-red-600">tidak tersedia</span>
        </div>
      </div>

      {/* ================================================================== */}
      {/* Source notice                                                        */}
      {/* ================================================================== */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
        <ShieldCheck size={16} className="shrink-0 text-blue-500 mt-0.5" />
        <div className="text-xs text-blue-700 space-y-0.5">
          <p className="font-bold">Sumber: DKI Jakarta Public CCTV Portal</p>
          <p className="text-blue-600">
            Kamera diinventarisasi dari{" "}
            <a
              href="https://jakcctv.jakarta.go.id/publik"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold"
            >
              jakcctv.jakarta.go.id/publik
            </a>{" "}
            — portal resmi DKI Jakarta. Status "UNKNOWN" berarti belum ada health check real-time. GETRA tidak mengklaim akses ke seluruh CCTV Jakarta; hanya kamera dari sumber publik yang diizinkan.
          </p>
        </div>
      </div>

      {/* ================================================================== */}
      {/* Search + Filter                                                      */}
      {/* ================================================================== */}
      <div className="space-y-3">
        {/* Search bar */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kamera: Bundaran HI, Thamrin, Senayan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-10 text-sm text-slate-700 placeholder-slate-400 focus:border-[#118ab2] focus:outline-none shadow-xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
              showFilters
                ? "border-[#118ab2] bg-[#f0f9ff] text-[#118ab2]"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Filter size={13} />
            Filter
          </button>
          {(district || provider || status) && (
            <button
              type="button"
              onClick={() => {
                setDistrict("");
                setProvider("");
                setStatus("");
              }}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
            >
              <X size={12} />
              Reset filter
            </button>
          )}
          <span className="ml-auto text-xs text-slate-400">
            {filteredCameras.length} kamera
          </span>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-[#118ab2] focus:outline-none"
            >
              {DISTRICT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-[#118ab2] focus:outline-none"
            >
              {PROVIDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-[#118ab2] focus:outline-none"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* Main content: Camera list + Player                                  */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">

        {/* Camera list panel */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Daftar Kamera ({filteredCameras.length})
            </span>
            <button
              type="button"
              onClick={() => setListCollapsed(!listCollapsed)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 lg:hidden"
            >
              {listCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              {listCollapsed ? "Tampilkan" : "Sembunyikan"}
            </button>
          </div>

          <div className={`flex flex-col gap-2 overflow-y-auto ${listCollapsed ? "hidden lg:flex" : ""}`}
            style={{ maxHeight: "520px" }}
          >
            {filteredCameras.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                <Camera size={24} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm text-slate-500">Tidak ada kamera yang cocok</p>
              </div>
            ) : (
              filteredCameras.map((cam) => (
                <CameraCard
                  key={cam.camera_id}
                  camera={cam}
                  isSelected={cam.camera_id === selectedCameraId}
                  onClick={() => setSelectedCameraId(cam.camera_id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Camera player panel — only loads for selected camera */}
        <div className="flex flex-col gap-3">
          {selectedCamera ? (
            <>
              {/* Camera detail header */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                        REAL CAMERA
                      </span>
                      <span className={`text-[11px] font-bold ${STATUS_COLORS[selectedCamera.health_status] ?? "text-slate-500"}`}>
                        {getHealthStatusLabel(selectedCamera.health_status)}
                      </span>
                    </div>
                    <h2 className="text-base font-black text-slate-800">
                      {selectedCamera.camera_name}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">{selectedCamera.site_name}</p>
                  </div>
                  <a
                    href={selectedCamera.public_portal_url ?? "https://jakcctv.jakarta.go.id/publik"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-xl bg-[#118ab2] px-3 py-2 text-xs font-bold text-white hover:bg-[#0d7495] transition shrink-0"
                  >
                    <ExternalLink size={13} />
                    Buka Live
                  </a>
                </div>

                {/* Metadata grid */}
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
                  <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Provider</span>
                    <p className="font-semibold text-slate-700 mt-0.5 truncate">{selectedCamera.provider}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Wilayah</span>
                    <p className="font-semibold text-slate-700 mt-0.5">{selectedCamera.district}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Sumber</span>
                    <p className="font-semibold text-slate-700 mt-0.5">DKI Public CCTV</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">AI Vision</span>
                    <p className="font-semibold text-slate-500 mt-0.5">
                      {selectedCamera.supports_ai ? "Tersedia" : "Tidak tersedia"}
                    </p>
                  </div>
                </div>

                {/* Privacy info */}
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400">
                  <ShieldCheck size={11} className="text-green-500" />
                  <span>{selectedCamera.privacy_policy}</span>
                </div>

                {/* Source notes */}
                {selectedCamera.source_notes && (
                  <p className="mt-2 text-[10px] italic text-slate-400 leading-relaxed">
                    {selectedCamera.source_notes}
                  </p>
                )}
              </div>

              {/* The actual player — lazy loaded, only for selected camera */}
              <CameraPlayer camera={selectedCamera} />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
              <Camera size={32} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm text-slate-500">Pilih kamera dari daftar</p>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* Map Legend (static for now)                                         */}
      {/* ================================================================== */}
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Legenda Status Kamera
        </p>
        <div className="flex flex-wrap gap-3 text-[11px]">
          {[
            { color: "bg-green-500", label: "Live / Online" },
            { color: "bg-amber-500", label: "Degraded" },
            { color: "bg-red-500", label: "Offline" },
            { color: "bg-slate-400", label: "No Stream / Unknown" },
          ].map((item) => (
            <span key={item.label} className="flex items-center gap-1.5 text-slate-600">
              <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
