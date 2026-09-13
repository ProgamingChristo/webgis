"use client";

import { BadgeCheck } from "lucide-react";
import type { useUmkmIntelligence } from "@/src/features/umkm-intelligence/hooks/use-umkm-intelligence";
import type { OwnedMerchantBrief } from "../types/umkm-workspace.types";
import { merchantPublishLabel } from "../model/umkm-workspace-state";
import { PromotionReadinessCard } from "./promotion-readiness-card";
import type { UmkmSection } from "./umkm-workspace-navigation";

const ACTIONS: Record<string, string> = {
  NAME: "Lengkapi nama usaha", CATEGORY: "Periksa kategori usaha", LOCATION: "Periksa lokasi", ADDRESS: "Lengkapi alamat usaha",
  OPENING_HOURS: "Lengkapi jam operasional", PRICE: "Lengkapi kisaran harga", PHOTO: "Tambahkan foto usaha", MENU: "Tambahkan foto atau informasi menu",
  PHONE: "Lengkapi kontak usaha", VERIFIED_STATUS: "Periksa status verifikasi", VALID_GEOMETRY: "Periksa lokasi",
};

export function UmkmOverview({ merchant, intelligence, onNavigate, refreshToken }: {
  merchant: OwnedMerchantBrief; intelligence: ReturnType<typeof useUmkmIntelligence>; onNavigate: (section: UmkmSection) => void; refreshToken?: unknown;
}) {
  const data = intelligence.data?.merchant.id === merchant.id ? intelligence.data : null;
  const actions = [...new Set(data ? [...data.data_readiness.components, ...data.location_readiness.components]
    .filter((item) => (item.status === "MISSING" || item.status === "LIMITED") && ACTIONS[item.id])
    .map((item) => ACTIONS[item.id]!) : [])];
  const readinessLabel = data ? ({ READY: "Profil siap", DEVELOPING: "Profil perlu dilengkapi", INCOMPLETE: "Profil belum lengkap" }[data.data_readiness.status]) : "Belum tersedia";
  return <div className="space-y-5">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><h2 className="break-words text-xl font-bold text-slate-900">{merchant.name}</h2><p className="mt-1 text-sm text-slate-600">{merchant.category}</p></div>
        {merchant.verification_status === "VERIFIED" ? <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800"><BadgeCheck aria-hidden size={14} className="text-emerald-600" />Terverifikasi</span> : <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Verifikasi perlu diperiksa</span>}
      </div>
      <dl className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
        <div><dt className="text-xs font-medium text-slate-500">Kesiapan profil</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{intelligence.loading ? "Memeriksa profil..." : readinessLabel}</dd></div>
        <div><dt className="text-xs font-medium text-slate-500">Status visibilitas</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{merchantPublishLabel(merchant.publish_status)}</dd></div>
        <div><dt className="text-xs font-medium text-slate-500">Promosi aktif</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{merchant.active_campaigns_count ?? "Belum tersedia"}</dd></div>
      </dl>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
      <h2 className="text-base font-bold text-slate-900">Yang perlu dilakukan</h2>
      {intelligence.error ? <p role="alert" className="mt-3 text-sm text-rose-600">Diagnosis profil belum dapat dimuat. Segarkan untuk mencoba lagi.</p> : null}
      {intelligence.loading ? <p role="status" className="mt-3 text-sm text-slate-500">Memeriksa data usaha Anda...</p> : null}
      {actions.length > 0 ? <ul className="mt-3 divide-y divide-slate-100">{actions.map((action) => <li key={action}><button type="button" className="group flex w-full items-center justify-between py-3 text-left text-sm font-medium text-slate-700 hover:text-sky-700" onClick={() => onNavigate("visibilitas")}><span>{action}</span><span className="ml-2 text-xs font-semibold text-sky-600 group-hover:underline">Lihat detail →</span></button></li>)}</ul> : null}
      <button type="button" className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-100 hover:text-slate-900" onClick={() => onNavigate("peluang")}>Lihat peluang sekitar</button>
    </section>
    <PromotionReadinessCard merchantId={merchant.id} merchantName={merchant.name} onReviewVisibility={() => onNavigate("visibilitas")} refreshToken={refreshToken} />
  </div>;
}
