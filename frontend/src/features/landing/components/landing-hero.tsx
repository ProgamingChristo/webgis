import Link from "next/link";
import { ArrowUpRight, MapPinned, Route, Store } from "lucide-react";

import { WebgisHeroMap } from "./webgis-hero-map";

export function LandingHero() {
  return (
    <section className="getra-landing-hero getra-landing-hero--figma relative isolate overflow-hidden pt-[112px]">
      <div className="getra-landing-container getra-landing-hero__frame relative min-h-[688px]">
        <div className="getra-landing-hero__map" aria-hidden="true"><WebgisHeroMap /></div>
        <div className="getra-landing-hero__map-fade" aria-hidden="true" />
        <div className="getra-landing-hero__content relative z-10 max-w-[672px] pt-16 lg:pt-[66px]">
          <h1 className="getra-landing-headline getra-hero-step">
            <span className="getra-landing-headline__line getra-landing-headline__line--ink">Jelajahi Kota Lebih</span>
            <span className="getra-landing-headline__line"><b>Mudah.</b> Temukan Tempat,</span>
            <span className="getra-landing-headline__line">Rute, dan Usaha Lokal.</span>
          </h1>
          <p className="getra-landing-body getra-hero-step mt-6 max-w-[512px]">GETRA membantu Anda mencari tempat, melihat rute, memahami akses sekitar, dan menemukan usaha lokal melalui satu peta.</p>
          <div className="getra-hero-step mt-8 pb-8">
            <Link href="/login" className="getra-landing-button getra-landing-button--primary">Buka GETRA <ArrowUpRight size={16} aria-hidden="true" /></Link>
          </div>
          <div className="getra-landing-hero__pillars mt-6 grid max-w-[672px] gap-4 border-t pt-[17px] sm:grid-cols-3 sm:gap-6">
            <HeroPillar icon={MapPinned} label="Cari tempat sesuai kebutuhan" />
            <HeroPillar icon={Route} label="Rute pejalan kaki" />
            <HeroPillar icon={Store} label="Temukan usaha lokal" />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroPillar({ icon: Icon, label }: { icon: typeof MapPinned; label: string }) {
  return <div className="flex items-center gap-[14px]"><span className="grid size-10 place-items-center text-[var(--getra-landing-primary)]"><Icon size={24} strokeWidth={1.8} aria-hidden="true" /></span><span className="font-[family-name:var(--getra-landing-font-ui)] text-[13px] font-medium leading-[18px] text-[var(--getra-landing-ink)]">{label}</span></div>;
}
