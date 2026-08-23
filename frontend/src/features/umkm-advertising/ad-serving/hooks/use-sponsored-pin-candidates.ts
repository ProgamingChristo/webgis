import { useState, useEffect, useCallback } from "react";
import { AdServingService } from "../services/ad-serving.service";
import { SponsoredPinDTO, SponsoredPinServingContext } from "../types/ad-serving.types";

interface UseSponsoredPinCandidatesProps {
  context: SponsoredPinServingContext | null;
  limit?: number;
  enabled?: boolean;
}

export function useSponsoredPinCandidates({
  context,
  limit = 5,
  enabled = true,
}: UseSponsoredPinCandidatesProps) {
  const [candidates, setCandidates] = useState<SponsoredPinDTO[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCandidates = useCallback(async () => {
    if (!enabled || !context) {
      setCandidates([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await AdServingService.getSponsoredPinCandidates(
        context.longitude,
        context.latitude,
        limit
      );
      setCandidates(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || "Gagal memuat kandidat sponsored pin.");
      setCandidates([]);
    } finally {
      setIsLoading(false);
    }
  }, [context, limit, enabled]);

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => {
        void fetchCandidates();
      },
      0,
    );

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchCandidates]);

  return {
    candidates,
    isLoading,
    error,
    refetch: fetchCandidates,
  };
}
