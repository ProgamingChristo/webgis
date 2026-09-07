"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useUmkmIntelligence } from "@/src/features/umkm-intelligence/hooks/use-umkm-intelligence";
import type { OwnedMerchantBrief, UmkmWorkspaceSummary } from "../types/umkm-workspace.types";
import { resolveSelectedMerchant } from "../model/umkm-workspace-state";
import { MerchantSelector } from "./merchant-selector";
import { UMKM_SECTIONS, UmkmWorkspaceNavigation, type UmkmSection } from "./umkm-workspace-navigation";
import { OwnedMerchantList } from "./owned-merchant-list";
import { SubmissionSummary } from "./submission-summary";
import { UmkmOverview } from "./umkm-overview";
import { MerchantVisibilityPanel } from "./merchant-visibility-panel";
import { MerchantOpportunityPanel } from "./merchant-opportunity-panel";
import { PromotionReadinessCard } from "./promotion-readiness-card";

export function UmkmActiveWorkspace({ summary, state }: { summary: UmkmWorkspaceSummary; state: "ACTIVE_MERCHANT" | "ACTIVE_WITH_PENDING" }) {
  const searchParams = useSearchParams();
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(searchParams.get("merchantId"));
  const [section, setSection] = useState<UmkmSection>("overview");
  const merchant = resolveSelectedMerchant(summary.owned_merchants, selectedMerchantId);
  useEffect(() => {
    const readLocation = () => {
      const match = UMKM_SECTIONS.find((item) => item.id === window.location.hash.slice(1));
      setSection(match?.id ?? "overview");
      setSelectedMerchantId(new URLSearchParams(window.location.search).get("merchantId"));
    };
    const timer = window.setTimeout(readLocation, 0);
    window.addEventListener("hashchange", readLocation);
    window.addEventListener("popstate", readLocation);
    return () => { window.clearTimeout(timer); window.removeEventListener("hashchange", readLocation); window.removeEventListener("popstate", readLocation); };
  }, []);
  const navigate = (next: UmkmSection) => {
    setSection(next);
    const url = new URL(window.location.href);
    url.hash = next;
    if (merchant) url.searchParams.set("merchantId", merchant.id);
    window.history.replaceState(null, "", url);
  };
  const selectMerchant = (id: string) => {
    if (!summary.owned_merchants.some((item) => item.id === id)) return;
    setSelectedMerchantId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("merchantId", id);
    window.history.replaceState(null, "", url);
  };
  if (!merchant) return null;
  return <div className="space-y-6" data-workspace-state={state} data-selected-merchant-id={merchant.id}>
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Kelola dan Kembangkan Usaha Anda</h1><p className="mt-2 text-sm text-slate-400">Lihat kondisi usaha dan tentukan langkah berikutnya.</p></div>
      <MerchantSelector merchants={summary.owned_merchants} selectedMerchantId={merchant.id} onSelect={selectMerchant} />
    </header>
    <UmkmWorkspaceNavigation section={section} onChange={navigate} />
    {section === "usaha-saya" ? <section id="usaha-saya" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-lg font-semibold text-white">Usaha Saya</h2><Link className="text-sm text-emerald-300" href="/umkm/merchants/new">Daftarkan / Klaim Usaha Lain</Link></div>
      <OwnedMerchantList merchants={summary.owned_merchants} selectedMerchantId={merchant.id} onSelect={(id) => { selectMerchant(id); setSection("overview"); const url = new URL(window.location.href); url.hash = "overview"; window.history.replaceState(null, "", url); }} />
    </section> : <SelectedMerchantWorkspace key={merchant.id} merchant={merchant} section={section} onNavigate={navigate} refreshToken={summary} />}
    {summary.recent_submissions.length + summary.recent_claims.length > 0 ? <section aria-label="Status pengajuan usaha lain" className="space-y-3 border-t border-slate-800 pt-6">
      <h2 className="text-sm font-semibold text-slate-200">Status pengajuan usaha lain</h2>
      <p className="text-xs text-slate-400">Pengajuan lain tidak membatasi pengelolaan usaha yang sudah Anda miliki.</p>
      <SubmissionSummary submissions={summary.recent_submissions.filter((item) => item.status === "DRAFT" || item.status === "PENDING_REVIEW")} claims={summary.recent_claims.filter((item) => item.status === "PENDING")} />
      <details className="text-sm text-slate-400"><summary className="cursor-pointer">Riwayat pengajuan</summary><div className="mt-3"><SubmissionSummary submissions={summary.recent_submissions.filter((item) => item.status !== "DRAFT" && item.status !== "PENDING_REVIEW")} claims={summary.recent_claims.filter((item) => item.status !== "PENDING")} /></div></details>
    </section> : null}
  </div>;
}

function SelectedMerchantWorkspace({ merchant, section, onNavigate, refreshToken }: { merchant: OwnedMerchantBrief; section: UmkmSection; onNavigate: (section: UmkmSection) => void; refreshToken: UmkmWorkspaceSummary }) {
  const [days, setDays] = useState<7 | 30>(30);
  const intelligence = useUmkmIntelligence(merchant.id, days, refreshToken);
  return <section id={section} aria-label={UMKM_SECTIONS.find((item) => item.id === section)?.label} data-merchant-id={merchant.id}>
    {section === "overview" ? <UmkmOverview merchant={merchant} intelligence={intelligence} onNavigate={onNavigate} refreshToken={refreshToken} /> : null}
    {section === "visibilitas" ? <MerchantVisibilityPanel merchantId={merchant.id} intelligence={intelligence} /> : null}
    {section === "peluang" ? <MerchantOpportunityPanel merchantId={merchant.id} intelligence={intelligence} days={days} onDaysChange={setDays} /> : null}
    {section === "promosi" ? <div className="space-y-4"><h2 className="text-lg font-semibold text-white">Promosikan Usaha</h2><p className="text-sm text-slate-400">Periksa kesiapan {merchant.name} sebelum membuat promosi.</p><PromotionReadinessCard merchantId={merchant.id} merchantName={merchant.name} onReviewVisibility={() => onNavigate("visibilitas")} refreshToken={refreshToken} /></div> : null}
  </section>;
}
