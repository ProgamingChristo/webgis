import { useState, useCallback } from "react";
import { AdServingService } from "../services/ad-serving.service";
import { ServingPreviewResult, SponsoredPinServingContext } from "../types/ad-serving.types";

interface UseServingPreviewProps {
  merchantId: string;
  campaignId: string;
}

export function useServingPreview({ merchantId, campaignId }: UseServingPreviewProps) {
  const [result, setResult] = useState<ServingPreviewResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const evaluateServing = useCallback(
    async (context: SponsoredPinServingContext) => {
      if (!merchantId || !campaignId) return null;

      try {
        setIsLoading(true);
        setError(null);
        const data = await AdServingService.evaluateCampaignServing(
          merchantId,
          campaignId,
          context
        );
        setResult(data);
        return data;
      } catch (err: any) {
        const msg = err?.message || "Gagal menguji penayangan campaign.";
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [merchantId, campaignId]
  );

  return {
    result,
    isLoading,
    error,
    evaluateServing,
    resetResult: () => setResult(null),
  };
}
