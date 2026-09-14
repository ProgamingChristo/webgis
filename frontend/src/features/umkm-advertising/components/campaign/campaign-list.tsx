import { useCampaigns } from "../../hooks/use-campaigns";
import { CampaignCard } from "./campaign-card";
import { CampaignEmptyState } from "./campaign-empty-state";
import { CampaignCreateForm } from "./campaign-create-form";

export function CampaignList({ merchantId, merchantName = "Usaha Anda" }: { merchantId: string; merchantName?: string }) {
  const { campaigns, loading, error, refetch } = useCampaigns(merchantId);

  if (loading) return <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500 shadow-xs">Memuat daftar promosi…</div>;
  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700 shadow-xs">{error}</div>;

  return (
    <div className="space-y-6">
      <CampaignCreateForm merchantId={merchantId} onSuccess={refetch} />
      
      <div>
        <h3 className="mb-4 text-base font-bold text-slate-900">Promosi Saya</h3>
        {campaigns.length === 0 ? (
          <CampaignEmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaigns.map(c => (
              <CampaignCard key={c.id} campaign={c} merchantId={merchantId} merchantName={merchantName} onUpdated={refetch} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
