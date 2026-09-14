"use client";

import { Campaign } from "../../types/campaign.types";
import { useState, useEffect } from "react";
import { CampaignCreativeManager } from "../../creative/components/campaign-creative-manager";
import { CampaignTargetingManager } from "../../targeting/components/campaign-targeting-manager";
import { TargetingService } from "../../targeting/services/targeting.service";
import {
  CampaignStatusBadge,
  CampaignReadinessPanel,
  CampaignScheduleEditor,
  CampaignLifecycleActions,
  useCampaignLifecycle,
} from "../../lifecycle";
import { ServingPreviewPanel } from "../../ad-serving";
import { CampaignPaymentPanel } from "../../payment";
import { Palette, MapPin, Calendar, Clock, Sparkles, BarChart2, CreditCard } from "lucide-react";

export function CampaignCard({
  campaign,
  merchantId,
  merchantName,
  onUpdated,
}: {
  campaign: Campaign;
  merchantId: string;
  merchantName: string;
  onUpdated: () => void;
}) {
  const [activeTab, setActiveTab] = useState<
    "none" | "creative" | "targeting" | "schedule" | "preview" | "payment"
  >("none");
  const [merchantLocation, setMerchantLocation] = useState<{ longitude: number; latitude: number } | null>(null);
  const [targetGeoJSON, setTargetGeoJSON] = useState<any | null>(null);

  const {
    lifecycle,
    isUpdating,
    updateSchedule,
    pauseCampaign,
    resumeCampaign,
    cancelCampaign,
  } = useCampaignLifecycle({
    merchantId,
    campaignId: campaign.id,
  });

  // Load targeting & merchant geometry when needed for preview or targeting
  useEffect(() => {
    if (activeTab === "preview" || activeTab === "targeting") {
      TargetingService.getCampaignTarget(merchantId, campaign.id)
        .then((res) => {
          if (res?.merchantLocation) {
            setMerchantLocation(res.merchantLocation);
          }
          if (res?.previewGeoJSON) {
            setTargetGeoJSON(res.previewGeoJSON);
          }
        })
        .catch(() => {});
    }
  }, [activeTab, merchantId, campaign.id]);

  const effectiveStatus = lifecycle?.effectiveStatus || campaign.status;

  const handlePause = async () => {
    await pauseCampaign();
    onUpdated();
  };

  const handleResume = async () => {
    await resumeCampaign();
    onUpdated();
  };

  const handleCancel = async () => {
    await cancelCampaign();
    onUpdated();
  };

  const handleScheduleSaved = async (input: any) => {
    await updateSchedule(input);
    onUpdated();
  };

  return (
    <article className="flex min-w-0 flex-col space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-sky-300 sm:p-6 text-slate-900">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:items-center">
            <h4 className="min-w-0 break-words text-base font-bold leading-6 text-slate-900">{campaign.name}</h4>
            <CampaignStatusBadge status={effectiveStatus} size="sm" />
          </div>
          {campaign.description && (
            <p className="mt-1 break-words text-xs leading-5 text-slate-600 line-clamp-2">{campaign.description}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>Dibuat: {new Date(campaign.createdAt).toLocaleDateString("id-ID")}</span>
            {lifecycle?.startAt && lifecycle?.endAt && (
              <span className="flex min-w-0 items-center gap-1 text-sky-600 font-semibold">
                <Clock className="h-3 w-3 shrink-0" />
                {new Date(lifecycle.startAt).toLocaleDateString("id-ID")} –{" "}
                {new Date(lifecycle.endAt).toLocaleDateString("id-ID")}
              </span>
            )}
          </div>
        </div>

        {lifecycle ? (
          <div className="min-w-0 lg:shrink-0">
            <CampaignLifecycleActions
              status={effectiveStatus}
              allowedActions={lifecycle.allowedActions}
              isUpdating={isUpdating}
              onPause={handlePause}
              onResume={handleResume}
              onCancel={handleCancel}
            />
          </div>
        ) : null}
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-1 gap-2 border-t border-slate-100 pt-3 min-[480px]:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
        <button
          type="button"
          onClick={() => setActiveTab(activeTab === "creative" ? "none" : "creative")}
          className={`inline-flex min-h-9 items-center justify-center gap-1.5 whitespace-nowrap text-xs px-3 py-1.5 font-bold rounded-xl border transition-colors ${
            activeTab === "creative"
              ? "border-sky-500 bg-sky-50 text-sky-700"
              : "border-slate-300 text-slate-700 hover:border-sky-400 hover:text-sky-600"
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          {activeTab === "creative" ? "Tutup Materi" : "Kelola Materi"}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab(activeTab === "targeting" ? "none" : "targeting")}
          className={`inline-flex min-h-9 items-center justify-center gap-1.5 whitespace-nowrap text-xs px-3 py-1.5 font-bold rounded-xl border transition-colors ${
            activeTab === "targeting"
              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
              : "border-slate-300 text-slate-700 hover:border-emerald-400 hover:text-emerald-600"
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          {activeTab === "targeting" ? "Tutup sasaran" : "Wilayah sasaran"}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab(activeTab === "schedule" ? "none" : "schedule")}
          className={`inline-flex min-h-9 items-center justify-center gap-1.5 whitespace-nowrap text-xs px-3 py-1.5 font-bold rounded-xl border transition-colors ${
            activeTab === "schedule"
              ? "border-purple-500 bg-purple-50 text-purple-700"
              : "border-slate-300 text-slate-700 hover:border-purple-400 hover:text-purple-600"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          {activeTab === "schedule" ? "Tutup Jadwal & Kesiapan" : "Jadwal & Kesiapan"}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab(activeTab === "preview" ? "none" : "preview")}
          className={`inline-flex min-h-9 items-center justify-center gap-1.5 whitespace-nowrap text-xs px-3 py-1.5 font-bold rounded-xl border transition-colors ${
            activeTab === "preview"
              ? "border-amber-500 bg-amber-50 text-amber-800"
              : "border-slate-300 text-slate-700 hover:border-amber-400 hover:text-amber-700"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          {activeTab === "preview" ? "Tutup uji penayangan" : "Uji penayangan"}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab(activeTab === "payment" ? "none" : "payment")}
          className={`inline-flex min-h-9 items-center justify-center gap-1.5 whitespace-nowrap text-xs px-3 py-1.5 font-bold rounded-xl border transition-colors ${
            activeTab === "payment"
              ? "border-emerald-500 bg-emerald-50 text-emerald-800"
              : "border-slate-300 text-slate-700 hover:border-emerald-400 hover:text-emerald-700"
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          {activeTab === "payment" ? "Tutup Pembayaran" : "Pembayaran (Sandbox)"}
        </button>

        <a
          href={`/umkm/advertising/analytics?merchantId=${encodeURIComponent(merchantId)}&campaignId=${campaign.id}`}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 transition-colors hover:bg-sky-100 lg:ml-auto"
        >
          <BarChart2 className="w-3.5 h-3.5 text-sky-600" />
          Lihat Analitik
        </a>
      </div>

      {/* Tab Panels */}
      {activeTab === "creative" && (
        <div className="pt-1">
          <CampaignCreativeManager
            merchantId={merchantId}
            campaignId={campaign.id}
            merchantName={merchantName || "UMKM Anda"}
          />
        </div>
      )}

      {activeTab === "targeting" && (
        <div className="pt-1">
          <CampaignTargetingManager
            merchantId={merchantId}
            campaignId={campaign.id}
            campaignStatus={effectiveStatus}
          />
        </div>
      )}

      {activeTab === "schedule" && (
        <div className="space-y-4 pt-1">
          {lifecycle?.readiness && (
            <CampaignReadinessPanel readiness={lifecycle.readiness} />
          )}

          <CampaignScheduleEditor
            initialStartAt={lifecycle?.startAt || campaign.startAt || null}
            initialEndAt={lifecycle?.endAt || campaign.endAt || null}
            canEdit={lifecycle?.allowedActions.canEditSchedule ?? true}
            onSave={handleScheduleSaved}
          />
        </div>
      )}

      {activeTab === "preview" && (
        <div className="pt-1">
          <ServingPreviewPanel
            merchantId={merchantId}
            campaignId={campaign.id}
            merchantLocation={merchantLocation}
            targetGeoJSON={targetGeoJSON}
          />
        </div>
      )}

      {activeTab === "payment" && (
        <div className="pt-1">
          <CampaignPaymentPanel
            campaignId={campaign.id}
            campaignName={campaign.name}
            onPaymentUpdated={onUpdated}
          />
        </div>
      )}
    </article>
  );
}
