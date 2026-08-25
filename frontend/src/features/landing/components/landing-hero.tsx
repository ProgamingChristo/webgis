import Link from "next/link";

import { HeroMetricStrip } from "./hero-metric-strip";
import { HeroSearchPreview } from "./hero-search-preview";
import { HeroSpatialOverlay } from "./hero-spatial-overlay";
import { WebgisHeroMap } from "./webgis-hero-map";

export function LandingHero() {
  return (
    <section className="relative isolate overflow-hidden px-4 pb-14 pt-28 sm:px-6 lg:min-h-svh lg:px-8 lg:pb-16 lg:pt-32">
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_18%,rgba(41,199,216,0.18),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(122,212,59,0.14),transparent_24%),linear-gradient(135deg,#07111f,#0a1628_48%,#07111f)]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(41,199,216,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(41,199,216,0.055)_1px,transparent_1px)] bg-[size:40px_40px]"
        aria-hidden="true"
      />

      <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[minmax(0,0.88fr)_minmax(560px,1.12fr)]">
        <div className="max-w-2xl">
          <p className="getra-hero-step inline-flex rounded-full border border-getra-cyan/25 bg-getra-cyan/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-getra-cyan">
            GETRA · Spatial Intelligence Platform
          </p>

          <h1 className="getra-hero-step mt-7 text-5xl font-black tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl">
            Geo-Enabled
            <span className="block text-getra-cyan">Transit & Retail</span>
            Analytics
          </h1>

          <p className="getra-hero-step mt-6 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
            Spatial intelligence untuk menghubungkan transportasi massal,
            akses pedestrian, UMKM, dan aktivitas kawasan transit dalam satu
            WebGIS. A map-powered application layer designed to support spatial collaboration, survey execution, and location-based communities.
          </p>

          <div className="getra-hero-step mt-7 grid gap-3 rounded-3xl border border-white/10 bg-white/[0.035] p-4 sm:grid-cols-2">
            <div>
              <span className="text-xs font-black uppercase tracking-[0.18em] text-getra-green">
                GIS menghitung.
              </span>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Distance, walking time, route, service area, containment, dan
                score tetap hasil spatial computation.
              </p>
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-[0.18em] text-getra-cyan">
                AI menginterpretasikan.
              </span>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                AI membaca intent dan menjelaskan output GIS yang sudah
                dihitung—bukan menggantikan komputasi spasial.
              </p>
            </div>
          </div>

          <div className="getra-hero-step mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-r from-getra-green to-getra-cyan px-6 text-sm font-black text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-getra-cyan"
            >
              Masuk ke GETRA
            </Link>

            <a
              href="#tentang"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-black text-white transition hover:border-getra-cyan/55 hover:bg-getra-cyan/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-getra-cyan"
            >
              Lihat Cara Kerja
            </a>
          </div>

          <p className="mt-5 text-sm text-slate-400">
            Belum memiliki akun?{" "}
            <Link
              href="/signup"
              className="inline-flex min-h-8 items-center rounded-md font-bold text-getra-cyan hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-getra-cyan"
            >
              Daftar
            </Link>
          </p>
        </div>

        <div className="getra-hero-map grid gap-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
            <WebgisHeroMap />
            <HeroSpatialOverlay />
          </div>

          <HeroSearchPreview />
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-7xl">
        <HeroMetricStrip />
      </div>
    </section>
  );
}
