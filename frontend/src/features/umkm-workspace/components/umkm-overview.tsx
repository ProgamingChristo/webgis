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
    <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><h2 className="break-words text-xl font-semibold text-white">{merchant.name}</h2><p className="mt-1 text-sm text-slate-400">{merchant.category}</p></div>
        {merchant.verification_status === "VERIFIED" ? <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 px-3 py-1 text-xs text-emerald-300"><BadgeCheck aria-hidden size={14} />Terverifikasi</span> : <span className="text-xs text-slate-300">Verifikasi perlu diperiksa</span>}
      </div>
      <dl className="mt-5 grid gap-4 border-t border-slate-800 pt-5 sm:grid-cols-3">
        <div><dt className="text-xs text-slate-400">Kesiapan profil</dt><dd className="mt-1 text-sm text-white">{intelligence.loading ? "Memeriksa profil..." : readinessLabel}</dd></div>
        <div><dt className="text-xs text-slate-400">Status visibilitas</dt><dd className="mt-1 text-sm text-white">{merchantPublishLabel(merchant.publish_status)}</dd></div>
        <div><dt className="text-xs text-slate-400">Promosi aktif</dt><dd className="mt-1 text-sm text-white">{merchant.active_campaigns_count ?? "Belum tersedia"}</dd></div>
      </dl>
    </section>
    <section className="rounded-2xl border border-slate-700 bg-slate-900/40 p-5 sm:p-6">
      <h2 className="text-base font-semibold text-white">Yang perlu dilakukan</h2>
      {intelligence.error ? <p role="alert" className="mt-3 text-sm text-slate-300">Diagnosis profil belum dapat dimuat. Segarkan untuk mencoba lagi.</p> : null}
      {intelligence.loading ? <p role="status" className="mt-3 text-sm text-slate-400">Memeriksa data usaha Anda...</p> : null}
      {actions.length > 0 ? <ul className="mt-3 divide-y divide-slate-800">{actions.map((action) => <li key={action}><button type="button" className="w-full py-3 text-left text-sm text-slate-200 hover:text-emerald-300" onClick={() => onNavigate("visibilitas")}>{action}<span className="ml-2 text-xs text-emerald-300">Lihat detail →</span></button></li>)}</ul> : null}
      <button type="button" className="mt-4 min-h-10 rounded-lg border border-slate-600 px-4 py-2 text-sm text-emerald-300 hover:bg-slate-800" onClick={() => onNavigate("peluang")}>Lihat peluang sekitar</button>
    </section>
    <PromotionReadinessCard merchantId={merchant.id} merchantName={merchant.name} onReviewVisibility={() => onNavigate("visibilitas")} refreshToken={refreshToken} />
  </div>;
}
