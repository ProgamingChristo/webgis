import { useState, useEffect, useCallback } from "react";
import { AdvertisingEligibilityResult } from "../types/advertising-eligibility.types";
import { AdvertisingEligibilityService } from "../services/advertising-eligibility.service";

export function useAdvertisingEligibility(merchantId: string) {
  const [eligibility, setEligibility] = useState<AdvertisingEligibilityResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    if (!merchantId) return null;
    try {
      setLoading(true);
      const result = await AdvertisingEligibilityService.checkEligibility(merchantId);
      setEligibility(result);
      setError(null);
      return result;
    } catch (err: any) {
      setError(err.message || "Failed to check eligibility");
      return null;
    } finally {
      setLoading(false);
    }
  }, [merchantId]);

  useEffect(() => {
    if (merchantId) {
      const timeout = window.setTimeout(() => {
        void check();
      }, 0);

      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [merchantId, check]);

  return { eligibility, loading, error, refetch: check };
}
