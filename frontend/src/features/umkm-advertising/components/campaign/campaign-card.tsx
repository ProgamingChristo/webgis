"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, BarChart2, Calendar, CheckCircle2, ChevronDown, Clock, CreditCard, MapPin, Palette, Sparkles, Store } from "lucide-react";
import { Campaign } from "../../types/campaign.types";
import { CampaignCreativeManager } from "../../creative/components/campaign-creative-manager";
import { CampaignTargetingManager } from "../../targeting/components/campaign-targeting-manager";
import { TargetingService } from "../../targeting/services/targeting.service";
import { CampaignLifecycleActions, CampaignReadinessPanel, CampaignScheduleEditor, CampaignStatusBadge, useCampaignLifecycle } from "../../lifecycle";
import { ServingPreviewPanel } from "../../ad-serving";
import { CampaignPaymentPanel, CampaignPaymentStatusBadge } from "../../payment";
import { PaymentService } from "../../payment/services/payment.service";
import { PaymentStatusDTO } from "../../payment/types/payment.types";

type CampaignTab = "creative" | "targeting" | "schedule" | "preview" | "payment";

const WORKFLOW_TABS = [
  { id: "creative", label: "Materi", icon: Palette },
  { id: "targeting", label: "Wilayah Sasaran", icon: MapPin },
  { id: "schedule", label: "Jadwal & Kesiapan", icon: Calendar },
  { id: "preview", label: "Uji Penayangan", icon: Sparkles },
  { id: "payment", label: "Pembayaran", icon: CreditCard },
] as const;

export function CampaignCard({ campaign, merchantId, merchantName, expanded, onToggle, onUpdated }: {
  campaign: Campaign;
  merchantId: string;
  merchantName: string;
  expanded: boolean;
  onToggle: () => void;
  onUpdated: () => void;
}) {
  const [activeTab, setActiveTab] = useState<CampaignTab>("creative");
  const [visitedTabs, setVisitedTabs] = useState<CampaignTab[]>(["creative"]);
  const [hasOpened, setHasOpened] = useState(expanded);
  const [merchantLocation, setMerchantLocation] = useState<{ longitude: number; latitude: number } | null>(null);
  const [targetGeoJSON, setTargetGeoJSON] = useState<unknown | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentStatusDTO | null>(null);
  const [paymentUnavailable, setPaymentUnavailable] = useState(false);
  const { lifecycle, isUpdating, error: lifecycleError, refetch: refetchLifecycle, updateSchedule, pauseCampaign, resumeCampaign, cancelCampaign } = useCampaignLifecycle({ merchantId, campaignId: campaign.id });

  const loadPayment = useCallback(async () => {
    try {
      const payment = await PaymentService.getPaymentStatus(campaign.id);
      setPaymentUnavailable(false);
      setPaymentInfo(payment);
    } catch {
      setPaymentUnavailable(true);
    }
  }, [campaign.id]);

  useEffect(() => {
    let active = true;
    PaymentService.getPaymentStatus(campaign.id)
      .then((payment) => {
        if (!active) return;
        setPaymentUnavailable(false);
        setPaymentInfo(payment);
      })
      .catch(() => {
        if (active) setPaymentUnavailable(true);
      });
    return () => {
      active = false;
    };
  }, [campaign.id]);

  const selectTab = (tab: CampaignTab) => {
    setActiveTab(tab);
    setVisitedTabs((current) => current.includes(tab) ? current : [...current, tab]);
  };

  const handleToggle = () => {
    if (!expanded) setHasOpened(true);
    onToggle();
  };

  useEffect(() => {
    if (!expanded || (activeTab !== "preview" && activeTab !== "targeting")) return;
    TargetingService.getCampaignTarget(merchantId, campaign.id)
      .then((response) => {
        setMerchantLocation(response?.merchantLocation || null);
        setTargetGeoJSON(response?.previewGeoJSON || null);
      })
      .catch(() => {
        setMerchantLocation(null);
        setTargetGeoJSON(null);
      });
  }, [activeTab, campaign.id, expanded, merchantId]);

  const refreshCampaignState = async () => {
    await Promise.allSettled([refetchLifecycle(), loadPayment()]);
    onUpdated();
  };

  const effectiveStatus = lifecycle?.effectiveStatus || campaign.status;
  const readiness = lifecycle?.readiness;
  const readinessItems = [
    { label: "Materi", ready: readiness?.checks.creative },
    { label: "Wilayah", ready: readiness?.checks.targeting },
    { label: "Jadwal", ready: readiness?.checks.schedule },
  ];

  return (
    <article className={`min-w-0 overflow-hidden rounded-2xl border bg-white shadow-sm transition ${expanded ? "border-sky-300 ring-1 ring-sky-100" : "border-slate-200 hover:border-sky-300 hover:shadow-md"}`}>
      <div className="p-4 sm:p-5">
        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h3 className="min-w-0 break-words text-base font-bold leading-6 text-slate-900 sm:text-lg">{campaign.name}</h3>
              <CampaignStatusBadge status={effectiveStatus} size="sm" />
            </div>
            {campaign.description && <p className="mt-1 line-clamp-2 break-words text-sm leading-5 text-slate-600">{campaign.description}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5"><Store className="h-3.5 w-3.5" /> {merchantName}</span>
              <span>Dibuat {new Date(campaign.createdAt).toLocaleDateString("id-ID")}</span>
              <span>Diperbarui {new Date(campaign.updatedAt).toLocaleDateString("id-ID")}</span>
              {lifecycle?.startAt && lifecycle.endAt && <span className="inline-flex items-center gap-1.5 text-sky-700"><Clock className="h-3.5 w-3.5" /> {new Date(lifecycle.startAt).toLocaleDateString("id-ID")}–{new Date(lifecycle.endAt).toLocaleDateString("id-ID")}</span>}
            </div>
          </div>
          <button type="button" onClick={handleToggle} aria-expanded={expanded} aria-controls={`campaign-workspace-${campaign.id}`} style={{ color: "#ffffff" }} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-bold shadow-sm transition hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600">
            {expanded ? "Tutup Workspace" : "Kelola Promosi"}<ChevronDown className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {readinessItems.map((item) => (
            <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">{item.label}</span>
              <span className={`mt-1 flex items-center gap-1.5 text-xs font-bold ${item.ready ? "text-emerald-700" : "text-amber-700"}`}>{item.ready ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />} {item.ready ? "Lengkap" : item.ready === false ? "Belum lengkap" : "Memuat"}</span>
            </div>
          ))}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">Pembayaran</span>
            <div className="mt-1">{paymentUnavailable ? <span className="text-xs font-bold text-slate-600">Status belum tersedia</span> : paymentInfo ? <CampaignPaymentStatusBadge status={paymentInfo.status} size="sm" /> : <span className="text-xs font-bold text-slate-500">Memuat</span>}</div>
          </div>
        </div>
      </div>

      {(expanded || hasOpened) && (
        <div id={`campaign-workspace-${campaign.id}`} hidden={!expanded} className="border-t border-slate-200 bg-slate-50/70 p-3 sm:p-5">
          {lifecycleError && <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Status kesiapan belum dapat diperbarui. Bagian lain tetap dapat digunakan.</div>}
          <nav aria-label={`Alur pengelolaan ${campaign.name}`} className="mb-5 overflow-x-auto pb-1">
            <div role="tablist" aria-label="Bagian promosi" className="flex min-w-max gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xs">
              {WORKFLOW_TABS.map((tab, index) => {
                const Icon = tab.icon;
                const selected = activeTab === tab.id;
                return <button key={tab.id} type="button" role="tab" aria-selected={selected} aria-controls={`${campaign.id}-${tab.id}-panel`} onClick={() => selectTab(tab.id)} style={{ color: selected ? "#ffffff" : "#475569" }} className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-600 ${selected ? "bg-sky-600 shadow-sm" : "hover:bg-sky-50 hover:text-sky-700"}`}><span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${selected ? "bg-white/20" : "bg-slate-100"}`}>{index + 1}</span><Icon className="h-3.5 w-3.5" /> {tab.label}</button>;
              })}
              <Link href={`/umkm/advertising/analytics?merchantId=${encodeURIComponent(merchantId)}&campaignId=${campaign.id}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold text-slate-600 transition hover:bg-sky-50 hover:text-sky-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-600"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px]">6</span><BarChart2 className="h-3.5 w-3.5" /> Analitik</Link>
            </div>
          </nav>

          {visitedTabs.includes("creative") && <section role="tabpanel" id={`${campaign.id}-creative-panel`} hidden={activeTab !== "creative"}><CampaignCreativeManager merchantId={merchantId} campaignId={campaign.id} merchantName={merchantName || "UMKM Anda"} onUpdated={refreshCampaignState} /></section>}
          {visitedTabs.includes("targeting") && <section role="tabpanel" id={`${campaign.id}-targeting-panel`} hidden={activeTab !== "targeting"}><CampaignTargetingManager merchantId={merchantId} campaignId={campaign.id} campaignStatus={effectiveStatus} onUpdated={refreshCampaignState} /></section>}
          {visitedTabs.includes("schedule") && <section role="tabpanel" id={`${campaign.id}-schedule-panel`} hidden={activeTab !== "schedule"}><div className="space-y-4">{readiness && <CampaignReadinessPanel readiness={readiness} />}<CampaignScheduleEditor initialStartAt={lifecycle?.startAt || campaign.startAt || null} initialEndAt={lifecycle?.endAt || campaign.endAt || null} canEdit={lifecycle?.allowedActions.canEditSchedule ?? true} onSave={async (input) => { await updateSchedule(input); await refreshCampaignState(); }} /></div></section>}
          {activeTab === "preview" && <section role="tabpanel" id={`${campaign.id}-preview-panel`}><ServingPreviewPanel merchantId={merchantId} campaignId={campaign.id} merchantLocation={merchantLocation} targetGeoJSON={targetGeoJSON} /></section>}
          {activeTab === "payment" && <section role="tabpanel" id={`${campaign.id}-payment-panel`}><CampaignPaymentPanel campaignId={campaign.id} campaignName={campaign.name} onPaymentUpdated={() => void refreshCampaignState()} /></section>}

          {lifecycle && <div className="mt-5 rounded-xl border border-slate-200 bg-white p-3"><CampaignLifecycleActions status={effectiveStatus} allowedActions={lifecycle.allowedActions} isUpdating={isUpdating} onPause={async () => { await pauseCampaign(); await refreshCampaignState(); }} onResume={async () => { await resumeCampaign(); await refreshCampaignState(); }} onCancel={async () => { await cancelCampaign(); await refreshCampaignState(); }} /></div>}
        </div>
      )}
    </article>
  );
}
