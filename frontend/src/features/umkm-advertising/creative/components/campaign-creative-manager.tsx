"use client";
import React, { useEffect } from "react";
import { useCreatives } from "../hooks/use-creatives";
import { CreativeEditor } from "./creative-editor";
import { CreativePreview } from "./creative-preview";

export function CampaignCreativeManager({ merchantId, campaignId, merchantName, onUpdated }: { merchantId: string, campaignId: string, merchantName: string, onUpdated?: () => void | Promise<void> }) {
  const { 
    creatives, loading, error, fetchCreatives,
    createCreative, updateCreative, markReady, uploadMedia 
  } = useCreatives(merchantId, campaignId);

  useEffect(() => {
    fetchCreatives();
  }, [fetchCreatives]);

  // For Phase 4 MVP, we assume 1 Sponsored Pin creative.
  const pinCreative = creatives.find(c => c.creativeType === "SPONSORED_PIN") || null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h4 className="mb-4 font-bold text-slate-900">Materi promosi</h4>
      {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">Materi promosi belum dapat dimuat. Coba buka bagian ini kembali.</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <CreativeEditor
            key={pinCreative?.id || "new-creative"}
            creative={pinCreative}
            loading={loading}
            onSaveDraft={async (data) => {
              if (pinCreative) {
                await updateCreative(pinCreative.id, data);
              } else {
                await createCreative(data as any);
              }
              await onUpdated?.();
            }}
            onMarkReady={async (id) => {
              await markReady(id);
              await onUpdated?.();
            }}
            onUploadImage={async (id, file) => {
              await uploadMedia(id, file);
              await onUpdated?.();
            }}
          />
        </div>
        <div>
          <h4 className="font-semibold text-sm text-gray-700 mb-2">Pratinjau materi</h4>
          <CreativePreview creative={pinCreative} merchantName={merchantName} />
        </div>
      </div>
    </div>
  );
}
