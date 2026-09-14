"use client";

import React from "react";
import { useCampaignTargeting } from "../hooks/use-campaign-targeting";
import { useStudyAreas } from "../hooks/use-study-areas";
import { TargetingEditor } from "./targeting-editor";

interface CampaignTargetingManagerProps {
  merchantId: string;
  campaignId: string;
  campaignStatus: string;
  onUpdated?: () => void | Promise<void>;
}

export function CampaignTargetingManager({
  merchantId,
  campaignId,
  campaignStatus,
  onUpdated,
}: CampaignTargetingManagerProps) {
  const {
    target,
    loading: loadingTarget,
    saving,
    error: targetError,
    saveTargeting,
  } = useCampaignTargeting(merchantId, campaignId);

  const { studyAreas, loading: loadingStudyAreas } = useStudyAreas();

  const isEditable = campaignStatus === "DRAFT";

  if (loadingTarget) {
    return (
      <div className="flex items-center space-x-2 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm" role="status">
        <span className="animate-spin inline-block w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full" />
        <span>Memuat wilayah sasaran...</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h4 className="font-bold text-gray-800 text-base">Wilayah sasaran promosi</h4>
          <p className="text-xs text-gray-500">
            Tentukan area tempat promosi akan ditampilkan kepada pengguna GETRA.
          </p>
        </div>
        {!isEditable && (
          <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded">
            Hanya dapat diedit saat masih berupa draf
          </span>
        )}
      </div>

      {targetError && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200">
          {targetError}
        </div>
      )}

      <TargetingEditor
        key={target?.id || "new-target"}
        target={target}
        studyAreas={studyAreas}
        loadingStudyAreas={loadingStudyAreas}
        saving={saving}
        disabled={!isEditable}
        onSave={async (payload) => {
          await saveTargeting(payload as any);
          await onUpdated?.();
        }}
      />
    </div>
  );
}
