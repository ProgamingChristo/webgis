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
    <article className="flex flex-col space-y-4 rounded-xl border border-slate-700 bg-slate-900/60 p-5 shadow-lg shadow-black/20 transition hover:border-purple-400/40">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h4 className="text-lg font-bold text-slate-100">{campaign.name}</h4>
            <CampaignStatusBadge status={effectiveStatus} size="sm" />
          </div>
          {campaign.description && (
            <p className="mt-1 text-xs text-slate-400 line-clamp-1">{campaign.description}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>Dibuat: {new Date(campaign.createdAt).toLocaleDateString("id-ID")}</span>
            {lifecycle?.startAt && lifecycle?.endAt && (
              <span className="flex items-center gap-1 text-purple-400">
                <Clock className="w-3 h-3" />
                {new Date(lifecycle.startAt).toLocaleDateString("id-ID")} –{" "}
                {new Date(lifecycle.endAt).toLocaleDateString("id-ID")}
              </span>
            )}
          </div>
        </div>

        {lifecycle && (
          <CampaignLifecycleActions
            status={effectiveStatus}
            allowedActions={lifecycle.allowedActions}
            isUpdating={isUpdating}
            onPause={handlePause}
            onResume={handleResume}
            onCancel={handleCancel}
          />
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3">
        <button
          type="button"
          onClick={() => setActiveTab(activeTab === "creative" ? "none" : "creative")}
          className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 font-medium rounded-lg border transition-colors ${
            activeTab === "creative"
              ? "border-cyan-400 bg-cyan-400/10 text-cyan-200"
              : "border-slate-700 text-slate-300 hover:border-cyan-400/50 hover:text-cyan-200"
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          {activeTab === "creative" ? "Tutup Materi" : "Kelola Materi"}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab(activeTab === "targeting" ? "none" : "targeting")}
          className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 font-medium rounded-lg border transition-colors ${
            activeTab === "targeting"
              ? "border-emerald-400 bg-emerald-400/10 text-emerald-200"
              : "border-slate-700 text-slate-300 hover:border-emerald-400/50 hover:text-emerald-200"
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          {activeTab === "targeting" ? "Tutup Targeting" : "Targeting Wilayah"}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab(activeTab === "schedule" ? "none" : "schedule")}
          className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 font-medium rounded-lg border transition-colors ${
            activeTab === "schedule"
              ? "border-purple-400 bg-purple-400/10 text-purple-200"
              : "border-slate-700 text-slate-300 hover:border-purple-400/50 hover:text-purple-200"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          {activeTab === "schedule" ? "Tutup Jadwal & Kesiapan" : "Jadwal & Kesiapan"}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab(activeTab === "preview" ? "none" : "preview")}
          className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 font-medium rounded-lg border transition-colors ${
            activeTab === "preview"
              ? "border-amber-400 bg-amber-400/10 text-amber-200"
              : "border-slate-700 text-slate-300 hover:border-amber-400/50 hover:text-amber-200"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          {activeTab === "preview" ? "Tutup Uji Penayangan" : "Uji Penayangan (Preview)"}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab(activeTab === "payment" ? "none" : "payment")}
          className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 font-medium rounded-lg border transition-colors ${
            activeTab === "payment"
              ? "border-emerald-400 bg-emerald-400/10 text-emerald-200"
              : "border-slate-700 text-slate-300 hover:border-emerald-400/50 hover:text-emerald-200"
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          {activeTab === "payment" ? "Tutup Pembayaran" : "Pembayaran (Sandbox)"}
        </button>

        <a
          href={`/umkm/advertising/analytics?campaignId=${campaign.id}`}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 font-medium rounded-lg border border-blue-500/50 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20 transition-colors ml-auto"
        >
          <BarChart2 className="w-3.5 h-3.5 text-blue-400" />
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
