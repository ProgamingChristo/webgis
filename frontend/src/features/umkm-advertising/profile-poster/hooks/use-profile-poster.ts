import { useState, useEffect, useCallback } from "react";
import { ProfilePosterService } from "../services/profile-poster.service";
import { ProfilePosterDTO } from "../types/profile-poster.types";

interface UseProfilePosterProps {
  merchantId: string | null;
  enabled?: boolean;
}

export function useProfilePoster({
  merchantId,
  enabled = true,
}: UseProfilePosterProps) {
  const [poster, setPoster] = useState<ProfilePosterDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPoster = useCallback(async () => {
    if (!enabled || !merchantId || merchantId.trim() === "") {
      setPoster(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await ProfilePosterService.getProfilePoster(merchantId);
      setPoster(data);
    } catch (err: any) {
      console.warn("[useProfilePoster] Failed to load poster:", err);
      setError(err?.message || "Gagal memuat poster promosi.");
      setPoster(null);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, merchantId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchPoster();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchPoster]);

  return {
    poster,
    isLoading,
    error,
    refetch: fetchPoster,
  };
}
