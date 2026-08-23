"use client";
import React, { useEffect } from "react";
import { useCreatives } from "../hooks/use-creatives";
import { CreativeEditor } from "./creative-editor";
import { CreativePreview } from "./creative-preview";

export function CampaignCreativeManager({ merchantId, campaignId, merchantName }: { merchantId: string, campaignId: string, merchantName: string }) {
  const { 
    creatives, loading, fetchCreatives, 
    createCreative, updateCreative, markReady, uploadMedia 
  } = useCreatives(merchantId, campaignId);

  useEffect(() => {
    fetchCreatives();
  }, [fetchCreatives]);

  // For Phase 4 MVP, we assume 1 Sponsored Pin creative.
  const pinCreative = creatives.find(c => c.creativeType === "SPONSORED_PIN") || null;

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <h4 className="font-bold text-gray-800 mb-4">Promotion Content</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <CreativeEditor
            creative={pinCreative}
            loading={loading}
            onSaveDraft={async (data) => {
              if (pinCreative) {
                await updateCreative(pinCreative.id, data);
              } else {
                await createCreative(data as any);
              }
            }}
            onMarkReady={async (id) => {
              await markReady(id);
            }}
            onUploadImage={async (id, file) => {
              await uploadMedia(id, file);
            }}
          />
        </div>
        <div>
          <h4 className="font-semibold text-sm text-gray-700 mb-2">Preview Creative</h4>
          <CreativePreview creative={pinCreative} merchantName={merchantName} />
        </div>
      </div>
    </div>
  );
}
