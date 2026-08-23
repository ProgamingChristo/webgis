import { useState, useEffect, useCallback } from "react";
import { LifecycleService } from "../services/lifecycle.service";
import { CampaignLifecycleDTO, UpdateScheduleInput } from "../types/lifecycle.types";

interface UseCampaignLifecycleProps {
  merchantId: string;
  campaignId: string;
  autoRefresh?: boolean;
}

export function useCampaignLifecycle({
  merchantId,
  campaignId,
  autoRefresh = false,
}: UseCampaignLifecycleProps) {
  void autoRefresh;

  const [data, setData] = useState<CampaignLifecycleDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLifecycle = useCallback(async () => {
    if (!merchantId || !campaignId) return;

    try {
      setIsLoading(true);
      setError(null);
      const res = await LifecycleService.getLifecycleState(merchantId, campaignId);
      setData(res);
    } catch (err: any) {
      setError(err?.message || "Gagal memuat status lifecycle campaign.");
    } finally {
      setIsLoading(false);
    }
  }, [merchantId, campaignId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => {
        void fetchLifecycle();
      },
      0,
    );

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchLifecycle]);

  const updateSchedule = async (input: UpdateScheduleInput) => {
    try {
      setIsUpdating(true);
      setError(null);
      const updated = await LifecycleService.updateSchedule(merchantId, campaignId, input);
      setData(updated);
      return updated;
    } catch (err: any) {
      const msg = err?.message || "Gagal memperbarui jadwal campaign.";
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const pauseCampaign = async () => {
    try {
      setIsUpdating(true);
      setError(null);
      const updated = await LifecycleService.pauseCampaign(merchantId, campaignId);
      setData(updated);
      return updated;
    } catch (err: any) {
      const msg = err?.message || "Gagal pause campaign.";
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const resumeCampaign = async () => {
    try {
      setIsUpdating(true);
      setError(null);
      const updated = await LifecycleService.resumeCampaign(merchantId, campaignId);
      setData(updated);
      return updated;
    } catch (err: any) {
      const msg = err?.message || "Gagal resume campaign.";
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const cancelCampaign = async () => {
    try {
      setIsUpdating(true);
      setError(null);
      const updated = await LifecycleService.cancelCampaign(merchantId, campaignId);
      setData(updated);
      return updated;
    } catch (err: any) {
      const msg = err?.message || "Gagal membatalkan campaign.";
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    lifecycle: data,
    isLoading,
    isUpdating,
    error,
    refetch: fetchLifecycle,
    updateSchedule,
    pauseCampaign,
    resumeCampaign,
    cancelCampaign,
  };
}
