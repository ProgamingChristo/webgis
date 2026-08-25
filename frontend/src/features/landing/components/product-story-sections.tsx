import Link from "next/link";

import {
  ADD_UMKM_STEPS,
  ADVERTISING_ITEMS,
  ANALYTICS_METRICS,
  COMMUTER_FEATURES,
  COMMUNITY_SIGNALS,
} from "../data/landing-content";
import { LANDING_TECHNOLOGY } from "../data/technology.data";
import { SectionShell } from "./section-shell";

export function FairDiscoverySection() {
  return (
    <SectionShell
      eyebrow="Fair Discovery"
      title="Promosi boleh terlihat. Relevansi tidak boleh dibeli."
      description="GETRA memisahkan hasil Original, Hidden Gem, dan Sponsored. Sponsored harus tetap lolos constraint lokasi, kategori, harga, open now, dan walking limit sebelum tampil."
    >
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[2rem] border border-getra-cyan/20 bg-getra-cyan/8 p-5">
          <h3 className="text-lg font-black text-white">Search constraints</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {["Location", "Category", "Price", "Open Now", "Walking Limit"].map((item) => (
              <span key={item} className="rounded-full border border-getra-cyan/25 bg-slate-950/60 px-3 py-1 text-xs font-black text-getra-cyan">
                {item}
              </span>
            ))}
          </div>
          <p className="mt-5 text-sm leading-7 text-slate-400">
            Hard constraints selalu mendahului placement. Payment tidak menjadi input organic rank.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["Original", "Organic discovery result based on canonical relevance rules."],
            ["Hidden Gem", "Relevant merchant with less conventional popularity exposure."],
            ["Sponsored", "Paid promotion, clearly labeled, still contextually eligible."],
          ].map(([label, copy]) => (
            <article
              key={label}
              className={`rounded-3xl border p-5 ${
                label === "Sponsored"
                  ? "border-getra-amber/50 bg-getra-amber/10"
                  : "border-white/10 bg-white/[0.035]"
              }`}
            >
              <span className="text-xs font-black uppercase tracking-[0.18em] text-getra-cyan">
                {label}
              </span>
              <p className="mt-4 text-sm leading-6 text-slate-300">{copy}</p>
            </article>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

export function CommuterSection() {
  return (
    <SectionShell
      eyebrow="GETRA for commuters"
      title="Dari stasiun menuju pilihan yang benar-benar bisa dicapai."
      description="General/Commuter adalah pengalaman dasar untuk semua user. Ini bukan authorization role dan tidak disimpan sebagai stakeholder mode."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {COMMUTER_FEATURES.map((feature) => (
          <div key={feature} className="rounded-2xl border border-white/10 bg-slate-900/45 p-4 text-sm font-black text-white">
            {feature}
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function CommunitySection() {
  return (
    <SectionShell
      eyebrow="GETRA Community"
      title="Peta yang hidup membutuhkan orang-orang yang hidup di dalamnya."
      description="Community memperkaya peta dengan temuan komuter, cultural map, permintaan lokal, replies, media, location context, moderation, dan reputation."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {COMMUNITY_SIGNALS.map(([title, status, meta]) => (
          <article key={title} className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-getra-green">
              {status}
            </span>
            <h3 className="mt-3 text-lg font-black text-white">{title}</h3>
            <p className="mt-2 text-sm text-slate-400">{meta}</p>
          </article>
        ))}
      </div>
      <p className="mt-5 rounded-2xl border border-getra-amber/25 bg-getra-amber/10 p-4 text-sm leading-7 text-slate-300">
        Community contribution tidak otomatis menjadi canonical truth. GETRA tetap menampilkan timestamp/freshness, verification status, provenance, moderation, dan trust mechanism.
      </p>
    </SectionShell>
  );
}

export function UmkmSection() {
  return (
    <SectionShell
      id="umkm"
      eyebrow="GETRA for UMKM"
      title="Bukan sekadar muncul di peta."
      description="GETRA membantu UMKM memahami konteks lokasi, mengelola keberadaan usaha, dan menjangkau komuter secara transparan."
    >
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[2rem] border border-getra-cyan/20 bg-slate-950/70 p-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <strong className="text-white">GETRA UMKM</strong>
            <span className="rounded-full border border-getra-green/30 px-3 py-1 text-xs font-black text-lime-200">
              UMKM stakeholder mode
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {["Merchant Saya", "Tambah UMKM", "Advertising", "Analytics"].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 font-black text-white">
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 text-sm leading-7 text-slate-300">
          <p>
            UMKM adalah stakeholder mode, bukan auth role. Account role tetap USER atau ADMIN.
          </p>
          <p className="mt-4">
            Merchant ownership diverifikasi terpisah. Memiliki UMKM mode tidak otomatis berarti memiliki merchant.
          </p>
        </div>
      </div>
    </SectionShell>
  );
}

export function MerchantSubmissionSection() {
  return (
    <SectionShell
      eyebrow="Add UMKM to GETRA"
      title="Pengajuan lokasi usaha harus melalui review tepercaya."
      description="Landing ini hanya menampilkan workflow ilustratif. Form produksi tetap ada di aplikasi authenticated."
    >
      <ol className="grid gap-3 md:grid-cols-4">
        {ADD_UMKM_STEPS.map((step, index) => (
          <li key={step} className="rounded-2xl border border-white/10 bg-slate-900/45 p-4">
            <span className="text-xs font-black text-getra-cyan">{index + 1}</span>
            <strong className="mt-2 block text-sm text-white">{step}</strong>
          </li>
        ))}
      </ol>
      <p className="mt-5 rounded-2xl border border-getra-amber/25 bg-getra-amber/10 p-4 text-sm text-slate-300">
        Pengajuan tidak otomatis menjadi merchant terverifikasi.
      </p>
    </SectionShell>
  );
}

export function AdvertisingSection() {
  return (
    <SectionShell
      eyebrow="Advertising Manager"
      title="Promosi berbasis konteks spasial, bukan sekadar slot iklan."
      description="Advertising Manager direpresentasikan sebagai campaign, creative, spatial targeting, schedule, sponsored placements, dan analytics preview. Landing tidak membuka checkout dan tidak membuat event campaign."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="grid gap-3 sm:grid-cols-2">
          {ADVERTISING_ITEMS.map((item) => (
            <span key={item} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm font-black text-white">
              {item}
            </span>
          ))}
        </div>
        <div className="rounded-[2rem] border border-getra-cyan/20 bg-slate-950/70 p-5">
          <span className="text-xs font-black uppercase tracking-[0.18em] text-getra-cyan">
            Campaign interaction analytics preview
          </span>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {ANALYTICS_METRICS.map((metric) => (
              <div key={metric} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <strong className="text-sm text-white">{metric}</strong>
                <div className="mt-3 h-2 rounded-full bg-slate-800">
                  <div className="h-2 w-2/3 rounded-full bg-gradient-to-r from-getra-green to-getra-cyan" />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-400">
            Illustrative analytics only. Tidak menampilkan klaim keuangan, profit, atau transaksi.
          </p>
        </div>
      </div>
    </SectionShell>
  );
}

export function BusinessSpaceSection() {
  return (
    <SectionShell
      eyebrow="Business Space Intelligence"
      title="Spatial Screening untuk membaca peluang ruang usaha."
      description="Business Space Intelligence membantu screening konteks akses, demand sekitar, dan kedekatan ke transit. Ini pilot/spatial screening, bukan rekomendasi investasi atau jaminan performa properti."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {["Pilot label", "Spatial Screening", "No investment guarantee"].map((item) => (
          <article key={item} className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
            <h3 className="text-base font-black text-white">{item}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {item === "No investment guarantee"
                ? "GETRA tidak menjanjikan imbal hasil, okupansi, atau kelayakan investasi."
                : "Konteks spasial digunakan sebagai bahan baca awal, bukan klaim final."}
            </p>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}

export function DataTrustSection() {
  return (
    <SectionShell
      eyebrow="Trusted Spatial Data"
      title="Data spasial harus punya sumber, waktu, status, dan jejak."
      description="GETRA menjaga provenance dan freshness agar user paham apakah sebuah titik berasal dari sumber resmi, import, community contribution, atau review."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {["Source", "Timestamp / Freshness", "Verification", "Provenance"].map((item) => (
          <div key={item} className="rounded-2xl border border-getra-cyan/20 bg-getra-cyan/8 p-5">
            <strong className="text-sm text-white">{item}</strong>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function TechnologySection() {
  return (
    <SectionShell
      id="teknologi"
      eyebrow="Technology"
      title="Stack GETRA dirancang untuk komputasi spasial yang grounded."
      description="Teknologi ditampilkan berdasarkan stack yang ada di project. ECharts tidak ditulis sebagai dependency aktif karena belum tersedia di package saat audit Phase 02."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LANDING_TECHNOLOGY.map((item) => (
          <article key={item.name} className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
            <h3 className="text-base font-black text-white">{item.name}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">{item.role}</p>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}

export function FinalCtaSection() {
  return (
    <section className="relative overflow-hidden px-4 py-18 sm:px-6 lg:px-8">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(41,199,216,0.18),transparent_30%),radial-gradient(circle_at_74%_70%,rgba(122,212,59,0.12),transparent_28%)]"
        aria-hidden="true"
      />
      <div className="mx-auto max-w-4xl text-center">
        <span className="text-xs font-black uppercase tracking-[0.2em] text-getra-green">
          Start using GETRA
        </span>
        <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
          Masuk ke WebGIS yang membaca akses, bukan sekadar titik.
        </h2>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-r from-getra-green to-getra-cyan px-6 text-sm font-black text-slate-950">
            Masuk ke GETRA
          </Link>
          <Link href="/signup" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-black text-white">
            Daftar GETRA
          </Link>
        </div>
      </div>
    </section>
  );
}
