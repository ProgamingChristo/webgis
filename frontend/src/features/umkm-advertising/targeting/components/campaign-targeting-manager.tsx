"use client";

import React from "react";
import { useCampaignTargeting } from "../hooks/use-campaign-targeting";
import { useStudyAreas } from "../hooks/use-study-areas";
import { TargetingEditor } from "./targeting-editor";

interface CampaignTargetingManagerProps {
  merchantId: string;
  campaignId: string;
  campaignStatus: string;
}

export function CampaignTargetingManager({
  merchantId,
  campaignId,
  campaignStatus,
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
      <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-500 flex items-center space-x-2">
        <span className="animate-spin inline-block w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full" />
        <span>Memuat data targeting campaign...</span>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h4 className="font-bold text-gray-800 text-base">Geographic & Spatial Targeting</h4>
          <p className="text-xs text-gray-500">
            Tentukan area geografis tempat iklan akan ditayangkan kepada pengguna GETRA.
          </p>
        </div>
        {!isEditable && (
          <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded">
            Hanya dapat diedit saat status DRAFT
          </span>
        )}
      </div>

      {targetError && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200">
          {targetError}
        </div>
      )}

      <TargetingEditor
        target={target}
        studyAreas={studyAreas}
        loadingStudyAreas={loadingStudyAreas}
        saving={saving}
        disabled={!isEditable}
        onSave={async (payload) => {
          await saveTargeting(payload as any);
        }}
      />
    </div>
  );
}
