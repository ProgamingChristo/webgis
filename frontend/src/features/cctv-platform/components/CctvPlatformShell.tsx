"use client";

/**
 * GETRA CCTV Platform Shell
 *
 * Tab navigation: LIVE CCTV | AI VISION | SENSORS
 *
 * Design principles:
 * - Light GIS-first interface (not dark surveillance dashboard)
 * - Map is the spatial foundation
 * - Clear separation: REAL CAMERA ≠ AI ANALYTICS ≠ SENSOR
 * - Source provenance always visible
 */

import { useState } from "react";
import {
  Activity,
  Bot,
  Camera,
  ExternalLink,
  Gauge,
  Globe,
  Info,
  ShieldCheck,
} from "lucide-react";
import { LiveCctvTab } from "./LiveCctvTab";
import { AiVisionTab } from "./AiVisionTab";
import { SensorCenterTab } from "./SensorCenterTab";
import type { CctvPlatformTab } from "../types";

const TABS: Array<{
  id: CctvPlatformTab;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  activeColor: string;
  activeBg: string;
  activeBorder: string;
  description: string;
}> = [
  {
    id: "live",
    label: "Live CCTV",
    icon: Camera,
    color: "text-slate-600",
    activeColor: "text-green-700",
    activeBg: "bg-green-50",
    activeBorder: "border-green-300",
    description: "Kamera resmi DKI — REAL CAMERA",
  },
  {
    id: "ai-vision",
    label: "AI Vision",
    icon: Bot,
    color: "text-slate-600",
    activeColor: "text-blue-700",
    activeBg: "bg-blue-50",
    activeBorder: "border-blue-300",
    description: "Analisis computer vision — AI ANALYSIS",
  },
  {
    id: "sensors",
    label: "Sensors",
    icon: Gauge,
    color: "text-slate-600",
    activeColor: "text-purple-700",
    activeBg: "bg-purple-50",
    activeBorder: "border-purple-300",
    description: "Telemetri sensor kota — SENSOR DATA",
  },
];

export function CctvPlatformShell() {
  const [activeTab, setActiveTab] = useState<CctvPlatformTab>("live");

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">

      {/* ================================================================== */}
      {/* Platform Header                                                      */}
      {/* ================================================================== */}
      <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Subtle background accent */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 rounded-3xl" />

        <div className="relative z-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full border border-[#118ab2]/20 bg-[#118ab2]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#118ab2]">
                  <Globe size={12} />
                  GETRA Urban Intelligence
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                  v2.0 — GIS First
                </span>
              </div>

              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                Global CCTV &amp; Urban Sensors
              </h1>

              <p className="max-w-2xl text-sm text-slate-600 leading-relaxed">
                Pantau kamera publik, analisis AI, dan sensor kota Jakarta dengan sumber serta 
                waktu pembaruan yang jelas.{" "}
                <strong className="text-slate-700">
                  REAL CAMERA ≠ AI ANALYTICS ≠ SENSOR.
                </strong>
              </p>

              {/* Primary source citation */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <ShieldCheck size={13} className="text-green-500" />
                  <span>Sumber utama:</span>
                  <a
                    href="https://jakcctv.jakarta.go.id/publik"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-semibold text-[#118ab2] underline hover:text-[#0d7495]"
                  >
                    jakcctv.jakarta.go.id/publik
                    <ExternalLink size={10} />
                  </a>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Info size={13} className="text-slate-400" />
                  <span>Portal resmi CCTV Publik DKI Jakarta</span>
                </div>
              </div>
            </div>

            {/* Principle badges */}
            <div className="flex flex-col gap-2 shrink-0">
              <span className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-bold text-green-700">
                <Camera size={13} />
                REAL CAMERA FIRST
              </span>
              <span className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
                <Bot size={13} />
                AI SECOND
              </span>
              <span className="flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-bold text-purple-700">
                <Gauge size={13} />
                SENSOR THIRD
              </span>
              <span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                <Globe size={13} />
                GIS AS FOUNDATION
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ================================================================== */}
      {/* Tab Navigation                                                       */}
      {/* ================================================================== */}
      <nav
        className="flex overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xs gap-1"
        role="tablist"
        aria-label="CCTV Platform tabs"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 min-w-[100px] items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? `${tab.activeBg} ${tab.activeBorder} ${tab.activeColor}`
                  : `border-transparent bg-transparent ${tab.color} hover:bg-slate-50`
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              {isActive && (
                <span className="hidden sm:inline text-[9px] font-normal opacity-60 border border-current rounded px-1">
                  {tab.description.split("—")[1]?.trim()}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ================================================================== */}
      {/* Tab Content                                                          */}
      {/* ================================================================== */}
      <div role="tabpanel" aria-label={`Panel ${activeTab}`}>
        {activeTab === "live" && <LiveCctvTab />}
        {activeTab === "ai-vision" && <AiVisionTab />}
        {activeTab === "sensors" && <SensorCenterTab />}
      </div>

      {/* ================================================================== */}
      {/* Global footer                                                        */}
      {/* ================================================================== */}
      <footer className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-[11px] text-slate-500">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="font-bold text-slate-600">Ketentuan Penggunaan Data</p>
            <p>
              GETRA mengintegrasikan hanya sumber kamera publik yang diotorisasi. Tidak ada scraping
              ilegal, tidak ada stream privat, tidak ada bypass autentikasi. Data AI hanya ditampilkan
              dari hasil inference runtime aktual. Data sensor hanya dari sumber resmi pemerintah DKI.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ShieldCheck size={16} className="text-green-500" />
            <span className="font-semibold text-slate-600">Privacy masking enabled</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
