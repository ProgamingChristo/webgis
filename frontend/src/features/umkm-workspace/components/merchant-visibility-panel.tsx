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
        <h2 className="text-lg font-bold text-slate-900" id="merchant-visibility-title">Visibilitas Usaha</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">Periksa data yang membantu orang menemukan dan mengenali usaha Anda.</p>
      </header>
      {intelligence.loading ? <p className="text-sm text-slate-500" role="status">Memeriksa kelengkapan usaha...</p> : null}
      {intelligence.error ? <p className="text-sm text-rose-600" role="alert">{intelligence.error}</p> : null}
      {data ? <>
        <div className="grid gap-6 lg:grid-cols-2">
          <ReadinessSection title="Kelengkapan data usaha" description="Lengkapi informasi yang belum tersedia agar orang dapat mengenali usaha Anda." components={data.data_readiness.components.filter((item) => !["LOCATION", "VERIFIED_STATUS"].includes(item.id))}>
            <li className="py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2"><strong className="font-semibold text-slate-800">Metode pembayaran</strong><span className="text-xs text-slate-500">Belum dapat diperiksa</span></div>
              <p className="mt-1 text-xs leading-5 text-slate-600">Pemeriksaan visibilitas belum menyediakan data metode pembayaran.</p>
            </li>
          </ReadinessSection>
          <ReadinessSection title="Kesiapan lokasi" description="Pastikan titik lokasi dan akses usaha dapat dikenali." components={[
            ...data.location_readiness.components,
            ...data.visibility.components.filter((item) => item.id === "PUBLISHED"),
          ]}>
            <li className="py-3 text-xs leading-5 text-slate-500">Data pintu masuk usaha belum tersedia untuk pemeriksaan ini.</li>
          </ReadinessSection>
        </div>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="text-sm font-bold text-slate-900">Kesiapan ditemukan di GETRA</h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">Status berikut menunjukkan kelengkapan untuk pencarian, bukan jumlah orang yang melihat usaha.</p>
          <ul className="mt-3 divide-y divide-slate-100">
            {data.visibility.components.filter((item) => item.id !== "PUBLISHED").map((item) => <ReadinessRow key={item.id} component={item} />)}
          </ul>
        </section>
        {hasLocation ? <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><MapPin size={16} aria-hidden="true" className="text-sky-600" />Periksa lokasi usaha</h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">{data.merchant.address || "Alamat belum lengkap."} {data.merchant.is_mobile ? "Titik ini merupakan pengamatan lokasi usaha bergerak." : "Cocokkan titik pada peta dengan lokasi usaha Anda."}</p>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <UmkmIntelligenceMap data={data} />
          </div>
        </section> : null}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="text-sm font-bold text-slate-900">Kesesuaian dengan kebutuhan sekitar</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{data.market_context.status === "AVAILABLE" && data.market_context.area
            ? `Data kebutuhan dan usaha sejenis tersedia untuk kategori ${data.merchant.category} di ${data.market_context.area.name}. Buka Peluang di Sekitar untuk meninjau data wilayah tersebut.`
            : "Data kebutuhan di wilayah usaha belum cukup untuk menilai kesesuaian pasar. Lengkapi data usaha yang masih kurang terlebih dahulu."}</p>
        </section>
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">Jika data usaha yang sudah diverifikasi perlu diperbarui, hubungi admin GETRA. Pengeditan langsung profil usaha terverifikasi belum tersedia di halaman ini.</p>
      </> : null}
    </section>
  );
}

function ReadinessSection({ title, description, components, children }: { title: string; description: string; components: ReadinessComponent[]; children?: React.ReactNode }) {
  return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <h3 className="text-sm font-bold text-slate-900">{title}</h3>
    <p className="mt-1 text-xs leading-5 text-slate-600">{description}</p>
    <ul className="mt-3 divide-y divide-slate-100">{components.map((item) => <ReadinessRow key={item.id} component={item} />)}{children}</ul>
  </section>;
}

function ReadinessRow({ component }: { component: ReadinessComponent }) {
  const presentation = getReadinessPresentation(component);
  const Icon = presentation.ready ? CircleCheck : CircleAlert;
  return <li className="flex items-start gap-3 py-3" data-readiness-status={component.status}>
    <Icon className={`mt-0.5 shrink-0 ${presentation.ready ? "text-emerald-600" : "text-amber-500"}`} size={16} aria-hidden="true" />
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm font-semibold text-slate-900">{presentation.label}</strong><span className="text-xs font-medium text-slate-500">{presentation.status}</span></div>
      <p className="mt-1 text-xs leading-5 text-slate-600">{presentation.detail}</p>
      {presentation.action ? <p className="mt-1 text-xs font-semibold text-sky-700">{presentation.action}</p> : null}
    </div>
  </li>;
}
