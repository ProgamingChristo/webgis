"use client";

import { useState } from "react";
import { useCampaigns } from "../../hooks/use-campaigns";
import { CampaignCard } from "./campaign-card";
import { CampaignEmptyState } from "./campaign-empty-state";
import { CampaignCreateForm } from "./campaign-create-form";

export function CampaignList({ merchantId, merchantName = "Usaha Anda" }: { merchantId: string; merchantName?: string }) {
  const { campaigns, loading, error, refetch } = useCampaigns(merchantId);
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);

  if (loading) {
    return <div className="space-y-3" role="status" aria-label="Memuat daftar promosi"><div className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-xs" /><div className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-xs" /></div>;
  }
  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700 shadow-xs">{error}</div>;

  return (
    <div className="space-y-6">
      <CampaignCreateForm merchantId={merchantId} onSuccess={refetch} />
      <section aria-labelledby="promotion-list-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="promotion-list-title" className="text-lg font-bold text-slate-900">Promosi Saya</h2>
            <p className="mt-1 text-sm text-slate-600">Buka satu promosi untuk mengelola seluruh alurnya.</p>
          </div>
          {campaigns.length > 0 && <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600">{campaigns.length} promosi</span>}
        </div>
        {campaigns.length === 0 ? <CampaignEmptyState /> : (
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} merchantId={merchantId} merchantName={merchantName} expanded={expandedCampaignId === campaign.id} onToggle={() => setExpandedCampaignId((current) => current === campaign.id ? null : campaign.id)} onUpdated={refetch} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
