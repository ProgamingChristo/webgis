import { useState, useCallback } from "react";
import { creativeService } from "../services/creative.service";
import { CreativeDTO } from "../types/creative.types";
import { CreateCreativeInput, UpdateCreativeInput } from "../schemas/creative.schema";

export function useCreatives(merchantId: string, campaignId: string) {
  const [creatives, setCreatives] = useState<CreativeDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchCreatives = useCallback(async () => {
    if (!merchantId || !campaignId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await creativeService.getCreatives(merchantId, campaignId);
      setCreatives(data);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [merchantId, campaignId]);

  const createCreative = async (input: CreateCreativeInput) => {
    const newCreative = await creativeService.createCreative(merchantId, campaignId, input);
    setCreatives((prev) => [newCreative, ...prev]);
    return newCreative;
  };

  const updateCreative = async (creativeId: string, input: UpdateCreativeInput) => {
    const updated = await creativeService.updateCreative(merchantId, campaignId, creativeId, input);
    setCreatives((prev) => prev.map(c => c.id === creativeId ? updated : c));
    return updated;
  };

  const markReady = async (creativeId: string) => {
    const updated = await creativeService.markReady(merchantId, campaignId, creativeId);
    setCreatives((prev) => prev.map(c => c.id === creativeId ? updated : c));
    return updated;
  };

  const uploadMedia = async (creativeId: string, file: File) => {
    const result = await creativeService.uploadMedia(merchantId, campaignId, creativeId, file);
    // Optimistic update of the image path could be tricky if we don't return the full creative, 
    // but we can just refetch.
    await fetchCreatives();
    return result.url;
  };

  return {
    creatives,
    loading,
    error,
    fetchCreatives,
    createCreative,
    updateCreative,
    markReady,
    uploadMedia
  };
}
