import { useState } from "react";
import { CampaignService } from "../services/campaign.service";
import { CreateCampaignInput } from "../types/campaign.types";

export function useCreateCampaign(onSuccess?: () => void) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (input: CreateCampaignInput) => {
    try {
      setLoading(true);
      setError(null);
      await CampaignService.createCampaign(input);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "Gagal membuat campaign draft.");
    } finally {
      setLoading(false);
    }
  };

  return { create, loading, error };
}
