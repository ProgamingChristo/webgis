"use client";

import { useState } from "react";
import { CircleDot, Navigation, Search, Sparkles } from "lucide-react";

import { FEATURE_EXPLORER } from "../data/landing-content";
import type { LandingFeatureId } from "../types/landing.types";
import { SectionShell } from "./section-shell";

function FeatureVisual({ activeId }: { activeId: LandingFeatureId }) {
  if (activeId === "pedestrian-routing") {
    return (
      <div className="rounded-2xl border border-[#464b71]/10 bg-[#f6fbfb] p-5">
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.14em] text-[#66708d]">
          <span>Transit</span>
          <span>Tujuan</span>
        </div>
        <div className="mt-7 grid grid-cols-[40px_1fr_40px] items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full border-4 border-[#118ab2] bg-white text-[#118ab2]">
            <Navigation size={15} aria-hidden="true" />
          </span>
          <span className="h-1 rounded-full border-t-2 border-dashed border-[#118ab2]" />
          <span className="grid size-9 place-items-center rounded-full border-4 border-[#62d6c8] bg-white text-[#367e77]">
            <CircleDot size={15} aria-hidden="true" />
          </span>
        </div>
        <div className="mt-6 rounded-xl border border-[#62d6c8]/25 bg-white p-3 text-sm font-bold text-[#464b71]">
          Contoh rute jalan: 670 m · waktu berjalan menyesuaikan jaringan.
        </div>
      </div>
    );
  }

  if (activeId === "service-area") {
    return (
      <div className="relative min-h-[15.5rem] overflow-hidden rounded-2xl border border-[#464b71]/10 bg-[#f6fbfb] p-5">
        <div className="absolute left-1/2 top-1/2 h-44 w-56 -translate-x-1/2 -translate-y-1/2 rounded-[45%_55%_42%_58%] border-2 border-[#62d6c8] bg-[#62d6c8]/14" />
        <div className="absolute left-[28%] top-[32%] h-28 w-40 rounded-[55%_45%_60%_40%] border-2 border-[#118ab2] bg-[#118ab2]/10" />
        <div className="absolute left-[42%] top-[44%] h-16 w-24 rounded-[45%_55%_35%_65%] border-2 border-[#d8a519] bg-[#d8a519]/10" />
        <span className="relative text-xs font-black uppercase tracking-[0.16em] text-[#464b71]">
          Contoh area terjangkau yang mengikuti jaringan jalan
        </span>
      </div>
    );
  }

  if (activeId === "fair-discovery") {
    return (
      <div className="grid gap-3">
        {["Hasil biasa", "Pilihan lokal", "Promosi"].map((label, index) => (
          <div
            key={label}
            className={`rounded-2xl border p-4 ${
              index === 2
                ? "border-[#d8a519]/35 bg-[#fffaf0]"
                : "border-[#464b71]/10 bg-[#f6fbfb]"
            }`}
          >
            <span className="text-xs font-black uppercase tracking-[0.16em] text-[#118ab2]">
              {label}
            </span>
            <p className="mt-2 text-sm text-[#66708d]">
              {index === 2
                ? "Promosi berbayar diberi tanda jelas dan tetap harus sesuai dengan pencarian."
                : "Tempat ditampilkan berdasarkan kesesuaian dengan kebutuhan dan lokasi."}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#464b71]/10 bg-[#f6fbfb] p-5">
      <div className="flex min-h-12 items-center gap-3 rounded-xl border border-[#464b71]/10 bg-white px-4 text-sm text-[#66708d]">
        <Search size={17} className="shrink-0 text-[#118ab2]" aria-hidden="true" />
        <span>Kopi ramah kursi roda dekat stasiun…</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {["Makanan", "≤ Rp30 ribu", "≤ 10 menit", "Buka sekarang"].map((chip) => (
          <span
            key={chip}
            className="rounded-full border border-[#62d6c8]/30 bg-white px-3 py-1 text-xs font-bold text-[#464b71]"
          >
            {chip}
          </span>
        ))}
      </div>
    </div>
  );
}

export function FeatureExplorerSection() {
  const [activeId, setActiveId] = useState<LandingFeatureId>("smart-search");
  const active = FEATURE_EXPLORER.find((feature) => feature.id === activeId)!;

  return (
    <SectionShell
      id="fitur"
      eyebrow="Apa yang bisa dilakukan GETRA"
      title="Lebih dari sekadar melihat peta."
      description="Lihat bagaimana pencarian, rute, area terjangkau, dan penelusuran adil membantu menjawab kebutuhan berbasis lokasi."
    >
      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="rounded-[1.75rem] border border-[#464b71]/12 bg-[#f6fbfb] p-4 shadow-[0_12px_30px_rgba(70,75,113,0.055)]">
          <span className="px-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#118ab2]">
            Fitur GETRA
          </span>
          <div className="mt-4 grid gap-2" role="tablist" aria-label="Daftar fitur GETRA">
            {FEATURE_EXPLORER.map((feature, index) => (
              <button
                key={feature.id}
                id={`feature-tab-${feature.id}`}
                type="button"
                role="tab"
                aria-controls="feature-panel"
                aria-selected={feature.id === activeId}
                className={`rounded-2xl border px-4 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#118ab2] ${
                  feature.id === activeId
                    ? "border-[#118ab2]/25 bg-white text-[#464b71] shadow-[0_6px_16px_rgba(70,75,113,0.06)]"
                    : "border-transparent text-[#66708d] hover:border-[#118ab2]/18 hover:bg-white hover:text-[#464b71]"
                }`}
                onClick={() => setActiveId(feature.id)}
              >
                <span className="flex items-center justify-between gap-3 text-sm font-black">
                  {feature.label}
                  <span className="text-[10px] text-[#118ab2]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </span>
                <span className="mt-1 block text-xs leading-5">{feature.eyebrow}</span>
              </button>
            ))}
          </div>
        </div>

        <div
          id="feature-panel"
          role="tabpanel"
          aria-labelledby={`feature-tab-${activeId}`}
          className="rounded-[1.75rem] border border-[#464b71]/12 bg-white p-5 shadow-[0_12px_30px_rgba(70,75,113,0.055)] sm:p-6"
        >
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-[#118ab2]/8 text-[#118ab2]">
              <Sparkles size={16} aria-hidden="true" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#118ab2]">
              {active.eyebrow}
            </span>
          </div>
          <h3 className="mt-5 text-2xl font-black tracking-[-0.04em] text-[#464b71]">
            {active.title}
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#66708d]">
            {active.description}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {active.chips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-[#464b71]/12 bg-[#f6fbfb] px-3 py-1 text-xs font-bold text-[#464b71]"
              >
                {chip}
              </span>
            ))}
          </div>
          <div className="mt-6">
            <FeatureVisual activeId={activeId} />
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
