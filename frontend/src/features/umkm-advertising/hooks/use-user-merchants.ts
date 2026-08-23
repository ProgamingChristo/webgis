import { useState, useEffect, useCallback } from "react";
import { MerchantClaimService, OwnedMerchantSummary } from "../services/merchant-claim.service";

export function useUserMerchants() {
  const [ownedMerchants, setOwnedMerchants] = useState<OwnedMerchantSummary[]>([]);
  const [recommendedMerchants, setRecommendedMerchants] = useState<OwnedMerchantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  const fetchMerchants = useCallback(async () => {
    try {
      setLoading(true);
      const res = await MerchantClaimService.getMyMerchants();
      setOwnedMerchants(res.ownedMerchants || []);
      setRecommendedMerchants(res.recommendedMerchants || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load merchants");
    } finally {
      setLoading(false);
    }
  }, []);

  const claimMerchant = useCallback(
    async (merchantId: string) => {
      try {
        setClaiming(true);
        await MerchantClaimService.claimMerchant(merchantId);
        await fetchMerchants();
        return true;
      } catch (err: any) {
        setError(err.message || "Failed to claim merchant");
        return false;
      } finally {
        setClaiming(false);
      }
    },
    [fetchMerchants]
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchMerchants();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [fetchMerchants]);

  return {
    ownedMerchants,
    recommendedMerchants,
    loading,
    error,
    claiming,
    claimMerchant,
    refetch: fetchMerchants,
  };
}
