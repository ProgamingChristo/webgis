"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Coffee, Footprints, Navigation } from "lucide-react";

import { getPreferredBasemapId } from "../../../../lib/mapid";

type WebgisHeroMapProps = {
  className?: string;
};

export function WebgisHeroMap({ className = "" }: WebgisHeroMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activePin, setActivePin] = useState<string | null>("coffee");
  const basemapId = getPreferredBasemapId();

  return (
    <figure
      data-basemap-id={basemapId}
      className={`getra-onboarding-map group relative isolate block h-full w-full overflow-hidden bg-[#e9f5f6] ${className}`.trim()}
      aria-label="Peta onboarding GETRA dengan transit, rute pejalan kaki, jangkauan, dan usaha lokal"
    >
      {/* 3D WebGIS City Map Visual Artwork */}
      <div className="absolute inset-0 h-full w-full overflow-hidden">
        <Image
          src="/images/landing/getra-hero-smart-map.jpg"
          alt="Peta onboarding GETRA 3D Smart City WebGIS"
          fill
          priority
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 700px"
          className="object-cover object-center transition-transform duration-1000 ease-out group-hover:scale-[1.03]"
        />
        {/* Ambient atmospheric overlay */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#464b71]/25 via-transparent to-white/10"
          aria-hidden="true"
        />
      </div>

      {/* Hidden container ref to maintain DOM compat */}
      <div ref={containerRef} className="sr-only" aria-hidden="true" />

      {/* Interactive Micro Animated Pins */}
      <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
        {/* Transit Station Pin */}
        <div className="absolute left-[38%] top-[42%] -translate-x-1/2 -translate-y-1/2">
          <span className="relative flex size-7 items-center justify-center">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#118ab2] opacity-60" />
            <span className="relative flex size-6 items-center justify-center rounded-full border-2 border-white bg-[#118ab2] text-white shadow-md">
              <Navigation size={11} className="rotate-45" />
            </span>
          </span>
        </div>

        {/* UMKM Cafe Pin */}
        <div className="absolute left-[62%] top-[56%] -translate-x-1/2 -translate-y-1/2">
          <span className="relative flex size-7 items-center justify-center">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#62d6c8] opacity-75 duration-1000" />
            <span className="relative flex size-6 items-center justify-center rounded-full border-2 border-white bg-[#367e77] text-white shadow-md">
              <Coffee size={11} />
            </span>
          </span>
        </div>
      </div>

      {/* Floating HUD Card 1: Top-Left Onboarding Caption */}
      <div className="getra-onboarding-map__caption transition duration-300 hover:shadow-lg">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-1.5 rounded-full bg-[#118ab2] animate-pulse" />
          Peta onboarding GETRA
        </span>
        <strong>Transit, rute, dan usaha lokal</strong>
      </div>

      {/* Floating HUD Card 2: Top-Right Route Stat Pill */}
      <div className="absolute right-3.5 top-3.5 z-20 hidden items-center gap-2.5 rounded-2xl border border-white/85 bg-white/92 px-3.5 py-2 shadow-[0_8px_20px_rgba(70,75,113,0.1)] backdrop-blur-md transition hover:-translate-y-0.5 sm:flex">
        <span className="flex size-7 items-center justify-center rounded-xl bg-[#118ab2]/10 text-[#118ab2]">
          <Footprints size={15} />
        </span>
        <div>
          <span className="block text-[9px] font-black uppercase tracking-wider text-[#118ab2]">
            Rute Berjalan Kaki
          </span>
          <span className="text-xs font-black text-[#464b71]">
            12 Menit · 850m
          </span>
        </div>
      </div>

      {/* Floating HUD Card 3: Bottom-Right UMKM Highlight Pill */}
      <div
        className="absolute bottom-16 right-3.5 z-20 hidden cursor-pointer items-center gap-2.5 rounded-2xl border border-white/85 bg-white/92 px-3.5 py-2.5 shadow-[0_10px_25px_rgba(70,75,113,0.12)] backdrop-blur-md transition duration-200 hover:scale-105 sm:flex"
        onClick={() => setActivePin(activePin === "coffee" ? null : "coffee")}
      >
        <span className="flex size-8 items-center justify-center rounded-xl bg-[#62d6c8]/25 text-[#367e77]">
          <Coffee size={16} />
        </span>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-[#464b71]">Kopi Teman Dekat</span>
            <span className="rounded-full bg-[#62d6c8]/25 px-1.5 py-0.5 text-[9px] font-black text-[#367e77]">
              UMKM
            </span>
          </div>
          <span className="block text-[10px] text-[#66708d]">
            Akses ramah kursi roda · 120m
          </span>
        </div>
      </div>

      {/* Floating HUD Card 4: Bottom-Left Legend */}
      <div className="getra-onboarding-map__legend z-20" aria-hidden="true">
        <span>
          <i className="getra-onboarding-map__legend-dot getra-onboarding-map__legend-dot--transit" />
          Transit
        </span>
        <span>
          <i className="getra-onboarding-map__legend-line" />
          Rute jalan kaki
        </span>
        <span className="hidden sm:inline-flex">
          <i className="getra-onboarding-map__legend-dot getra-onboarding-map__legend-dot--umkm" />
          Usaha lokal
        </span>
      </div>

      <figcaption className="sr-only">
        Peta ini memakai data contoh dan tidak memakai lokasi pribadi atau data usaha produksi.
      </figcaption>
    </figure>
  );
}

