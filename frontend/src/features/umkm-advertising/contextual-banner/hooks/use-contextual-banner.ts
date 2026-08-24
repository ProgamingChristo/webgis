import { useState, useEffect, useCallback } from "react";
import { ContextualBannerService } from "../services/contextual-banner.service";
import {
  ContextualBannerDTO,
  ContextualBannerServingContext,
} from "../types/contextual-banner.types";

interface UseContextualBannerProps {
  context: ContextualBannerServingContext | null;
  enabled?: boolean;
}

export function useContextualBanner({
  context,
  enabled = true,
}: UseContextualBannerProps) {
  const [banner, setBanner] = useState<ContextualBannerDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBanner = useCallback(async () => {
    if (!enabled || !context || !context.longitude || !context.latitude) {
      setBanner(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await ContextualBannerService.getContextualBanner(context);
      setBanner(data);
    } catch (err: any) {
      console.warn("[useContextualBanner] Failed to load banner:", err);
      setError(err?.message || "Gagal memuat banner promosi.");
      setBanner(null);
    } finally {
      setIsLoading(false);
    }
  }, [
    context,
    enabled,
  ]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchBanner();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchBanner]);

  return {
    banner,
    isLoading,
    error,
    refetch: fetchBanner,
  };
}
