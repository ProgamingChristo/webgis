"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BadgeCheck } from "lucide-react";
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
import { OwnerBusinessProfileView } from "./profile/owner-business-profile-view";

export function UmkmActiveWorkspace({ summary, state }: { summary: UmkmWorkspaceSummary; state: "ACTIVE_MERCHANT" | "ACTIVE_WITH_PENDING" }) {
  const searchParams = useSearchParams();
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(searchParams.get("merchantId"));
  const [activeProfileMerchantId, setActiveProfileMerchantId] = useState<string | null>(() => {
    return searchParams.get("view") === "profile" ? (searchParams.get("merchantId") || null) : null;
  });
  const [section, setSection] = useState<UmkmSection>("overview");
  const merchant = resolveSelectedMerchant(summary.owned_merchants, selectedMerchantId);

  useEffect(() => {
    const readLocation = () => {
      const hash = window.location.hash.slice(1);
      const match = UMKM_SECTIONS.find((item) => item.id === hash);
      const params = new URLSearchParams(window.location.search);
      setSection(match?.id ?? "overview");
      const paramMerchantId = params.get("merchantId");
      setSelectedMerchantId(paramMerchantId);
      if (params.get("view") === "profile" || hash === "profil") {
        setActiveProfileMerchantId(paramMerchantId || summary.owned_merchants[0]?.id || null);
      }
    };
    const timer = window.setTimeout(readLocation, 0);
    window.addEventListener("hashchange", readLocation);
    window.addEventListener("popstate", readLocation);
    return () => { window.clearTimeout(timer); window.removeEventListener("hashchange", readLocation); window.removeEventListener("popstate", readLocation); };
  }, [summary.owned_merchants]);

  const navigate = (next: UmkmSection) => {
    setSection(next);
    const url = new URL(window.location.href);
    url.hash = next;
    if (merchant) url.searchParams.set("merchantId", merchant.id);
    if (next !== "usaha-saya") {
      url.searchParams.delete("view");
    }
    window.history.replaceState(null, "", url);
  };

  const selectMerchant = (id: string) => {
    if (!summary.owned_merchants.some((item) => item.id === id)) return;
    setSelectedMerchantId(id);
    if (activeProfileMerchantId) {
      setActiveProfileMerchantId(id);
    }
    const url = new URL(window.location.href);
    url.searchParams.set("merchantId", id);
    window.history.replaceState(null, "", url);
  };

  const openProfile = (id: string) => {
    setSelectedMerchantId(id);
    setActiveProfileMerchantId(id);
    setSection("usaha-saya");
    const url = new URL(window.location.href);
    url.hash = "usaha-saya";
    url.searchParams.set("merchantId", id);
    url.searchParams.set("view", "profile");
    window.history.replaceState(null, "", url);
  };

  const closeProfile = () => {
    setActiveProfileMerchantId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("view");
    window.history.replaceState(null, "", url);
  };

  if (!merchant) return null;

  const profileMerchant = activeProfileMerchantId
    ? resolveSelectedMerchant(summary.owned_merchants, activeProfileMerchantId) || merchant
    : merchant;

  return (
    <div className="space-y-6" data-workspace-state={state} data-selected-merchant-id={merchant.id}>
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
            <BadgeCheck size={14} className="text-emerald-600" aria-hidden="true" />
            Usaha Terverifikasi
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Kelola dan Kembangkan Usaha Anda</h1>
          <p className="mt-2 text-sm text-slate-600">Lihat kondisi usaha dan tentukan langkah berikutnya.</p>
        </div>
        <MerchantSelector merchants={summary.owned_merchants} selectedMerchantId={merchant.id} onSelect={selectMerchant} />
      </header>
      <UmkmWorkspaceNavigation section={section} onChange={navigate} />

      {section === "usaha-saya" ? (
        activeProfileMerchantId ? (
          <OwnerBusinessProfileView
            merchantBrief={profileMerchant}
            onBackToList={closeProfile}
            refreshToken={summary}
          />
        ) : (
          <section id="usaha-saya" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-bold text-slate-900">Usaha Saya</h2>
              <Link className="text-sm font-semibold text-sky-700 hover:text-sky-800" href="/umkm/merchants/new">
                Daftarkan / Klaim Usaha Lain
              </Link>
            </div>
            <OwnedMerchantList
              merchants={summary.owned_merchants}
              selectedMerchantId={merchant.id}
              onSelect={openProfile}
            />
          </section>
        )
      ) : (
        <SelectedMerchantWorkspace
          key={merchant.id}
          merchant={merchant}
          section={section}
          onNavigate={navigate}
          onOpenProfile={() => openProfile(merchant.id)}
          refreshToken={summary}
        />
      )}

      {summary.recent_submissions.length + summary.recent_claims.length > 0 ? (
        <section aria-label="Status pengajuan usaha lain" className="space-y-3 border-t border-slate-200 pt-6">
          <h2 className="text-sm font-bold text-slate-900">Status pengajuan usaha lain</h2>
          <p className="text-xs text-slate-600">Pengajuan lain tidak membatasi pengelolaan usaha yang sudah Anda miliki.</p>
          <SubmissionSummary submissions={summary.recent_submissions.filter((item) => item.status === "DRAFT" || item.status === "PENDING_REVIEW")} claims={summary.recent_claims.filter((item) => item.status === "PENDING")} />
          <details className="text-sm text-slate-600"><summary className="cursor-pointer font-medium hover:text-slate-900">Riwayat pengajuan</summary><div className="mt-3"><SubmissionSummary submissions={summary.recent_submissions.filter((item) => item.status !== "DRAFT" && item.status !== "PENDING_REVIEW")} claims={summary.recent_claims.filter((item) => item.status !== "PENDING")} /></div></details>
        </section>
      ) : null}
    </div>
  );
}

function SelectedMerchantWorkspace({
  merchant,
  section,
  onNavigate,
  onOpenProfile,
  refreshToken,
}: {
  merchant: OwnedMerchantBrief;
  section: UmkmSection;
  onNavigate: (section: UmkmSection) => void;
  onOpenProfile?: () => void;
  refreshToken: UmkmWorkspaceSummary;
}) {
  const [days, setDays] = useState<7 | 30>(30);
  const intelligence = useUmkmIntelligence(merchant.id, days, refreshToken);
  return (
    <section id={section} aria-label={UMKM_SECTIONS.find((item) => item.id === section)?.label} data-merchant-id={merchant.id}>
      {section === "overview" ? <UmkmOverview merchant={merchant} intelligence={intelligence} onNavigate={onNavigate} onOpenProfile={onOpenProfile} refreshToken={refreshToken} /> : null}
      {section === "visibilitas" ? <MerchantVisibilityPanel merchantId={merchant.id} intelligence={intelligence} /> : null}
      {section === "peluang" ? <MerchantOpportunityPanel merchantId={merchant.id} intelligence={intelligence} days={days} onDaysChange={setDays} /> : null}
      {section === "promosi" ? <div className="space-y-4"><h2 className="text-lg font-bold text-slate-900">Promosikan Usaha</h2><p className="text-sm text-slate-600">Periksa kesiapan {merchant.name} sebelum membuat promosi.</p><PromotionReadinessCard merchantId={merchant.id} merchantName={merchant.name} onReviewVisibility={() => onNavigate("visibilitas")} refreshToken={refreshToken} /></div> : null}
    </section>
  );
}

