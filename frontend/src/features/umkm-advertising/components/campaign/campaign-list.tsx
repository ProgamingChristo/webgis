import { useCampaigns } from "../../hooks/use-campaigns";
import { CampaignCard } from "./campaign-card";
import { CampaignEmptyState } from "./campaign-empty-state";
import { CampaignCreateForm } from "./campaign-create-form";

export function CampaignList({ merchantId, merchantName = "Usaha Anda" }: { merchantId: string; merchantName?: string }) {
  const { campaigns, loading, error, refetch } = useCampaigns(merchantId);

  if (loading) return <div className="rounded-xl border border-slate-800 p-4 text-sm text-slate-400">Memuat daftar campaign…</div>;
  if (error) return <div className="rounded-xl border border-red-400/25 bg-red-400/[0.06] p-4 text-sm text-red-200">{error}</div>;

  return (
    <div className="space-y-6">
      <CampaignCreateForm merchantId={merchantId} onSuccess={refetch} />
      
      <div>
        <h3 className="mb-4 text-lg font-bold text-slate-100">Promosi Saya</h3>
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
