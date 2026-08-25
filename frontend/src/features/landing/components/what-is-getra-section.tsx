import { WHAT_IS_GETRA_NODES } from "../data/landing-content";
import { GetraLogo } from "./getra-logo";
import { SectionShell } from "./section-shell";

export function WhatIsGetraSection() {
  return (
    <SectionShell
      id="cara-kerja"
      eyebrow="What is GETRA?"
      title="Spatial Decision Support System untuk membaca kota sebagai jaringan akses."
      description="GETRA menghubungkan transportasi massal, akses pedestrian, UMKM, demand lokal, Community, dan konteks kawasan dalam satu sistem spasial-temporal. A map-powered application layer designed to support spatial collaboration, survey execution, and location-based communities."
    >
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6">
          <div className="grid place-items-center rounded-3xl border border-getra-cyan/20 bg-slate-950/62 p-8 text-center shadow-2xl shadow-cyan-950/20 backdrop-blur">
            <GetraLogo variant="footer" className="w-full max-w-[310px]" />
            <p className="mt-5 max-w-sm text-sm leading-7 text-slate-300">
              A map-powered application layer designed to support spatial collaboration, survey execution, and location-based communities.
            </p>
            <div className="mt-6 grid w-full gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-300 sm:grid-cols-2">
              <span className="rounded-full border border-getra-cyan/30 px-3 py-2">Transit</span>
              <span className="rounded-full border border-getra-green/30 px-3 py-2">Pedestrian</span>
              <span className="rounded-full border border-getra-cyan/30 px-3 py-2">Community</span>
              <span className="rounded-full border border-getra-green/30 px-3 py-2">UMKM</span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {WHAT_IS_GETRA_NODES.map((node) => (
            <article
              key={node.title}
              className="rounded-3xl border border-white/10 bg-slate-900/40 p-5"
            >
              <h3 className="text-base font-black text-white">
                {node.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                {node.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
