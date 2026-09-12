import Link from "next/link";
import { ArrowRight, Footprints, Search, Store } from "lucide-react";

import { WebgisHeroMap } from "./webgis-hero-map";

const HERO_PILLARS = [
  { icon: Search, label: "Cari tempat sesuai kebutuhan" },
  { icon: Footprints, label: "Rute pejalan kaki" },
  { icon: Store, label: "Temukan usaha lokal" },
] as const;

export function LandingHero() {
  return (
    <section className="relative isolate overflow-hidden px-4 pb-12 pt-28 sm:px-6 sm:pt-32 lg:px-8 lg:pb-16">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[680px] bg-[radial-gradient(circle_at_76%_8%,rgba(98,214,200,0.16),transparent_25%),radial-gradient(circle_at_92%_22%,rgba(17,138,178,0.12),transparent_30%)]"
        aria-hidden="true"
      />

      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[minmax(0,0.88fr)_minmax(460px,1.12fr)] lg:gap-6">
        <div className="max-w-2xl lg:pb-4">
          <p className="getra-hero-step inline-flex rounded-full border border-[#118ab2]/15 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#118ab2] shadow-[0_6px_16px_rgba(70,75,113,0.06)]">
            WebGIS untuk mobilitas dan UMKM
          </p>

          <h1 className="getra-hero-step mt-6 text-[clamp(2.7rem,5.2vw,4.4rem)] font-black leading-[0.98] tracking-[-0.065em] text-[#464b71]">
            Jelajahi Kota Lebih Mudah.
            <span className="block text-[#118ab2]">
              Temukan Tempat, Rute, dan Usaha Lokal.
            </span>
          </h1>

          <p className="getra-hero-step mt-6 max-w-xl text-base leading-8 text-[#66708d] sm:text-lg">
            GETRA membantu Anda mencari tempat, melihat rute, memahami akses
            sekitar, dan menemukan usaha lokal melalui satu peta.
          </p>

          <div className="getra-hero-step mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-[#118ab2] px-6 text-sm font-black text-white shadow-[0_10px_25px_-4px_rgba(17,138,178,0.38),0_4px_6px_-2px_rgba(17,138,178,0.2)] transition hover:bg-[#0d7495] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#118ab2]"
            >
              Buka GETRA
              <ArrowRight size={17} aria-hidden="true" />
            </Link>

            <a
              href="#cara-kerja"
              className="inline-flex min-h-12 items-center justify-center rounded-full px-4 text-sm font-bold text-[#464b71] transition hover:text-[#118ab2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#118ab2]"
            >
              Lihat cara kerja
            </a>
          </div>

          <p className="getra-hero-step mt-5 text-sm text-[#66708d]">
            Belum punya akun?{" "}
            <Link
              href="/signup"
              className="rounded font-bold text-[#118ab2] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#118ab2]"
            >
              Daftar sekarang
            </Link>
          </p>
        </div>

        <div className="getra-hero-step relative min-h-[340px] overflow-hidden rounded-[2rem] border border-white/80 bg-[#e9f5f6] shadow-[0_24px_65px_rgba(17,138,178,0.16)] ring-1 ring-white/80 sm:min-h-[440px] lg:min-h-[560px] lg:rounded-[2.5rem]">
          <WebgisHeroMap className="absolute inset-0 h-full w-full" />
        </div>
      </div>

      <div className="mx-auto mt-9 max-w-7xl lg:mt-12">
        <div className="grid border-t border-[#464b71]/15 pt-5 sm:grid-cols-3 sm:gap-6">
          {HERO_PILLARS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 py-3 sm:py-0">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#118ab2]/8 text-[#118ab2]">
                <Icon size={20} aria-hidden="true" />
              </span>
              <span className="max-w-[180px] text-sm font-bold leading-5 text-[#464b71]">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
