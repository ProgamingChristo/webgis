"use client";

import { CircleCheck, CircleAlert, MapPin } from "lucide-react";
import type { useUmkmIntelligence } from "@/src/features/umkm-intelligence/hooks/use-umkm-intelligence";
import { UmkmIntelligenceMap } from "@/src/features/umkm-intelligence/components/umkm-intelligence-map";
import type { ReadinessComponent } from "@/src/features/umkm-intelligence/types/umkm-intelligence.types";
import { getReadinessPresentation } from "@/src/features/umkm-intelligence/utils/readiness-presentation";

export interface MerchantInsightPanelProps {
  merchantId: string;
  intelligence: ReturnType<typeof useUmkmIntelligence>;
}

export function MerchantVisibilityPanel({ merchantId, intelligence }: MerchantInsightPanelProps) {
  const data = intelligence.data?.merchant.id === merchantId ? intelligence.data : null;
  const hasLocation = data?.location_readiness.components.some((item) => item.id === "VALID_GEOMETRY" && ["AVAILABLE", "PASS", "LIMITED"].includes(item.status));

  return (
    <section className="space-y-6" aria-labelledby="merchant-visibility-title" data-merchant-id={merchantId}>
      <header>
        <h2 className="text-lg font-semibold text-white" id="merchant-visibility-title">Visibilitas Usaha</h2>
        <p className="mt-1 text-sm leading-6 text-slate-400">Periksa data yang membantu orang menemukan dan mengenali usaha Anda.</p>
      </header>
      {intelligence.loading ? <p className="text-sm text-slate-400" role="status">Memeriksa kelengkapan usaha...</p> : null}
      {intelligence.error ? <p className="text-sm text-rose-300" role="alert">{intelligence.error}</p> : null}
      {data ? <>
        <div className="grid gap-6 lg:grid-cols-2">
          <ReadinessSection title="Kelengkapan data usaha" description="Lengkapi informasi yang belum tersedia agar orang dapat mengenali usaha Anda." components={data.data_readiness.components.filter((item) => !["LOCATION", "VERIFIED_STATUS"].includes(item.id))}>
            <li className="py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2"><strong className="font-medium text-slate-200">Metode pembayaran</strong><span className="text-xs text-slate-400">Belum dapat diperiksa</span></div>
              <p className="mt-1 text-xs leading-5 text-slate-400">Pemeriksaan visibilitas belum menyediakan data metode pembayaran.</p>
            </li>
          </ReadinessSection>
          <ReadinessSection title="Kesiapan lokasi" description="Pastikan titik lokasi dan akses usaha dapat dikenali." components={[
            ...data.location_readiness.components,
            ...data.visibility.components.filter((item) => item.id === "PUBLISHED"),
          ]}>
            <li className="py-3 text-xs leading-5 text-slate-400">Data pintu masuk usaha belum tersedia untuk pemeriksaan ini.</li>
          </ReadinessSection>
        </div>
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-white">Kesiapan ditemukan di GETRA</h3>
          <p className="mt-1 text-xs leading-5 text-slate-400">Status berikut menunjukkan kelengkapan untuk pencarian, bukan jumlah orang yang melihat usaha.</p>
          <ul className="mt-3 divide-y divide-slate-800">
            {data.visibility.components.filter((item) => item.id !== "PUBLISHED").map((item) => <ReadinessRow key={item.id} component={item} />)}
          </ul>
        </section>
        {hasLocation ? <section className="min-w-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><MapPin size={16} aria-hidden="true" />Periksa lokasi usaha</h3>
          <p className="mt-1 text-xs leading-5 text-slate-400">{data.merchant.address || "Alamat belum lengkap."} {data.merchant.is_mobile ? "Titik ini merupakan pengamatan lokasi usaha bergerak." : "Cocokkan titik pada peta dengan lokasi usaha Anda."}</p>
          <UmkmIntelligenceMap data={data} />
        </section> : null}
        <section className="border-t border-slate-800 pt-5">
          <h3 className="text-sm font-semibold text-white">Kesesuaian dengan kebutuhan sekitar</h3>
          <p className="mt-1 text-sm leading-6 text-slate-400">{data.market_context.status === "AVAILABLE" && data.market_context.area
            ? `Data kebutuhan dan usaha sejenis tersedia untuk kategori ${data.merchant.category} di ${data.market_context.area.name}. Buka Peluang di Sekitar untuk meninjau data wilayah tersebut.`
            : "Data kebutuhan di wilayah usaha belum cukup untuk menilai kesesuaian pasar. Lengkapi data usaha yang masih kurang terlebih dahulu."}</p>
        </section>
        <p className="rounded-lg border border-slate-800 px-4 py-3 text-xs leading-5 text-slate-400">Jika data usaha yang sudah diverifikasi perlu diperbarui, hubungi admin GETRA. Pengeditan langsung profil usaha terverifikasi belum tersedia di halaman ini.</p>
      </> : null}
    </section>
  );
}

function ReadinessSection({ title, description, components, children }: { title: string; description: string; components: ReadinessComponent[]; children?: React.ReactNode }) {
  return <section className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
    <h3 className="text-sm font-semibold text-white">{title}</h3>
    <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
    <ul className="mt-3 divide-y divide-slate-800">{components.map((item) => <ReadinessRow key={item.id} component={item} />)}{children}</ul>
  </section>;
}

function ReadinessRow({ component }: { component: ReadinessComponent }) {
  const presentation = getReadinessPresentation(component);
  const Icon = presentation.ready ? CircleCheck : CircleAlert;
  return <li className="flex items-start gap-3 py-3" data-readiness-status={component.status}>
    <Icon className={`mt-0.5 shrink-0 ${presentation.ready ? "text-emerald-400" : "text-slate-400"}`} size={16} aria-hidden="true" />
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm font-medium text-slate-200">{presentation.label}</strong><span className="text-xs text-slate-400">{presentation.status}</span></div>
      <p className="mt-1 text-xs leading-5 text-slate-400">{presentation.detail}</p>
      {presentation.action ? <p className="mt-1 text-xs font-medium text-cyan-200">{presentation.action}</p> : null}
    </div>
  </li>;
}
