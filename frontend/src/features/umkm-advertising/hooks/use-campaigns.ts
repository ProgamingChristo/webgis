import { useState, useEffect, useCallback } from "react";
import { Campaign } from "../types/campaign.types";
import { CampaignService } from "../services/campaign.service";

export function useCampaigns(merchantId: string) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const data = await CampaignService.getCampaigns(merchantId);
      setCampaigns(data);
      setError(null);
    } catch {
      setError("Daftar promosi belum dapat dimuat. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }, [merchantId]);

  useEffect(() => {
    if (merchantId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchCampaigns();
    }
  }, [merchantId, fetchCampaigns]);

  return { campaigns, loading, error, refetch: fetchCampaigns };
}
