import { useState, useEffect, useCallback, useRef } from "react";
import type { AdvertisingEligibilityResult } from "../types/advertising-eligibility.types";
import { AdvertisingEligibilityService } from "../services/advertising-eligibility.service";

interface EligibilityState {
  merchantId: string;
  eligibility: AdvertisingEligibilityResult | null;
  loading: boolean;
  error: string | null;
}

export function useAdvertisingEligibility(merchantId: string, refreshToken?: unknown) {
  const requestVersion = useRef(0);
  const [state, setState] = useState<EligibilityState>({
    merchantId: "", eligibility: null, loading: false, error: null,
  });

  const check = useCallback(async () => {
    const version = ++requestVersion.current;
    if (!merchantId) return null;
    setState({ merchantId, eligibility: null, loading: true, error: null });
    try {
      const eligibility = await AdvertisingEligibilityService.checkEligibility(merchantId);
      if (version !== requestVersion.current) return null;
      setState({ merchantId, eligibility, loading: false, error: null });
      return eligibility;
    } catch {
      if (version === requestVersion.current) {
        setState({ merchantId, eligibility: null, loading: false, error: "Kesiapan promosi belum dapat diperiksa. Coba lagi." });
      }
      return null;
    }
  }, [merchantId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void check(); }, 0);
    return () => {
      window.clearTimeout(timeout);
      requestVersion.current += 1;
    };
  }, [check, refreshToken]);

  // Never expose the previous merchant's permission while the new request starts.
  const current = merchantId && state.merchantId === merchantId
    ? state
    : { eligibility: null, loading: Boolean(merchantId), error: null };
  return { eligibility: current.eligibility, loading: current.loading, error: current.error, refetch: check };
}
