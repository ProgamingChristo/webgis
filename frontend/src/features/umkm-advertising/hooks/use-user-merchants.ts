import { useState, useEffect, useCallback } from "react";
import { MerchantClaimService, OwnedMerchantSummary } from "../services/merchant-claim.service";

export function useUserMerchants() {
  const [ownedMerchants, setOwnedMerchants] = useState<OwnedMerchantSummary[]>([]);
  const [recommendedMerchants, setRecommendedMerchants] = useState<OwnedMerchantSummary[]>([]);
  const [ineligibleMerchants, setIneligibleMerchants] = useState<OwnedMerchantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMerchants = useCallback(async () => {
    try {
      setLoading(true);
      const res = await MerchantClaimService.getMyMerchants();
      setOwnedMerchants(res.ownedMerchants || []);
      setRecommendedMerchants(res.recommendedMerchants || []);
      setIneligibleMerchants(res.ineligibleMerchants || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load merchants");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchMerchants();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [fetchMerchants]);

  return {
    ownedMerchants,
    recommendedMerchants,
    ineligibleMerchants,
    loading,
    error,
    refetch: fetchMerchants,
  };
}
