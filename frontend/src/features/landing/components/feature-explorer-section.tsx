"use client";

import { useState } from "react";

import { FEATURE_EXPLORER } from "../data/landing-content";
import type { LandingFeatureId } from "../types/landing.types";
import { SectionShell } from "./section-shell";

function FeatureVisual({ activeId }: { activeId: LandingFeatureId }) {
  if (activeId === "pedestrian-routing") {
    return (
      <div className="grid gap-4">
        <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            <span>Transit</span>
            <span>Merchant</span>
          </div>
          <div className="mt-8 grid grid-cols-[40px_1fr_40px] items-center gap-3">
            <span className="size-8 rounded-full border-4 border-getra-cyan bg-white" />
            <span className="h-1 rounded-full bg-slate-600" />
            <span className="size-8 rounded-full border-4 border-getra-green bg-lime-200" />
          </div>
          <div className="mt-6 rounded-2xl border border-getra-green/30 bg-getra-green/10 p-4 text-sm text-lime-100">
            Network route: illustrative 670 m · walking time illustrative.
          </div>
        </div>
      </div>
    );
  }

  if (activeId === "service-area") {
    return (
      <div className="relative min-h-72 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 p-6">
        <div className="absolute left-1/2 top-1/2 h-48 w-64 -translate-x-1/2 -translate-y-1/2 rounded-[45%_55%_42%_58%] border-2 border-getra-green/80 bg-getra-green/10" />
        <div className="absolute left-[30%] top-[34%] h-32 w-44 rounded-[55%_45%_60%_40%] border-2 border-getra-cyan/70 bg-getra-cyan/10" />
        <div className="absolute left-[42%] top-[42%] h-20 w-28 rounded-[45%_55%_35%_65%] border-2 border-getra-amber/70 bg-getra-amber/10" />
        <span className="relative text-xs font-black uppercase tracking-[0.16em] text-slate-300">
          Irregular network-like catchment · illustrative
        </span>
      </div>
    );
  }

  if (activeId === "fair-discovery") {
    return (
      <div className="grid gap-3">
        {["Original", "Hidden Gem", "Sponsored"].map((label) => (
          <div
            key={label}
            className={`rounded-2xl border p-4 ${
              label === "Sponsored"
                ? "border-getra-amber/50 bg-getra-amber/10"
                : "border-white/10 bg-slate-950/70"
            }`}
          >
            <span className="text-xs font-black uppercase tracking-[0.16em] text-getra-cyan">
              {label}
            </span>
            <p className="mt-2 text-sm text-slate-300">
              {label === "Sponsored"
                ? "Paid placement, clearly labeled, still constrained."
                : "Eligible result based on contextual relevance."}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/75 p-5">
      <p className="rounded-2xl border border-getra-cyan/25 bg-getra-cyan/10 p-4 text-lg font-black text-white">
        “Makan ≤ Rp30.000 maksimal 10 menit berjalan”
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {["Food", "≤ Rp30k", "≤ 10 min", "Open Now"].map((chip) => (
          <span
            key={chip}
            className="rounded-full border border-getra-green/25 bg-getra-green/10 px-3 py-1 text-xs font-black text-lime-200"
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
      eyebrow="Interactive feature experience"
      title="Layer GETRA bekerja bersama, bukan sebagai gimmick terpisah."
      description="Feature explorer ini adalah demonstrasi ringan. Tidak ada backend call, AI call, payment call, atau campaign event."
    >
      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-4">
          <span className="px-2 text-xs font-black uppercase tracking-[0.18em] text-getra-cyan">
            GETRA Layers
          </span>
          <div className="mt-4 grid gap-2" role="tablist" aria-label="GETRA feature layers">
            {FEATURE_EXPLORER.map((feature) => (
              <button
                key={feature.id}
                type="button"
                role="tab"
                aria-selected={feature.id === activeId}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  feature.id === activeId
                    ? "border-getra-cyan bg-getra-cyan/12 text-white"
                    : "border-white/10 bg-slate-950/50 text-slate-400 hover:border-getra-cyan/40 hover:text-white"
                }`}
                onClick={() => setActiveId(feature.id)}
              >
                <span className="block text-sm font-black">{feature.label}</span>
                <span className="mt-1 block text-xs">{feature.eyebrow}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="getra-layer-card rounded-[2rem] border border-white/10 bg-white/[0.035] p-5">
          <span className="text-xs font-black uppercase tracking-[0.18em] text-getra-green">
            {active.eyebrow}
          </span>
          <h3 className="mt-3 text-2xl font-black text-white">
            {active.title}
          </h3>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            {active.description}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {active.chips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-xs font-bold text-slate-300"
              >
                {chip}
              </span>
            ))}
          </div>
          <div className="getra-feature-visual mt-6">
            <FeatureVisual activeId={activeId} />
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
