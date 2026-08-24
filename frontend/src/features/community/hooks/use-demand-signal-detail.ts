"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getCommunityDemandSignal,
  getCommunityDemandSignalResponses,
  upsertCommunityDemandSignalResponse,
} from "../api/community.api";
import { subscribeToCommunityRealtimeEvents } from "../services/community-realtime.service";
import type {
  CommunityDemandSignal,
  CommunityResponseMerchant,
  CommunityUmkmResponse,
  CreateCommunityUmkmResponseInput,
} from "../types/community.types";

export function useDemandSignalDetail(signalId: string) {
  const [signal, setSignal] = useState<CommunityDemandSignal | null>(null);
  const [responses, setResponses] = useState<CommunityUmkmResponse[]>([]);
  const [ownedMerchants, setOwnedMerchants] = useState<CommunityResponseMerchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [signalResult, responseResult] = await Promise.all([
        getCommunityDemandSignal(signalId),
        getCommunityDemandSignalResponses(signalId),
      ]);

      setSignal(signalResult);
      setResponses(responseResult.responses);
      setOwnedMerchants(responseResult.ownedMerchants);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Detail Sinyal Community gagal dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [signalId]);

  useEffect(() => {
    const requestId = window.setTimeout(() => {
      void reload();
    }, 0);

    return () => window.clearTimeout(requestId);
  }, [reload]);

  useEffect(() => {
    let mounted = true;
    let subscription: { unsubscribe(): void } | null = null;

    void subscribeToCommunityRealtimeEvents(
      {
        signalId,
      },
      () => {
        if (mounted) {
          void reload();
        }
      },
    ).then((nextSubscription) => {
      if (mounted) {
        subscription = nextSubscription;
      } else {
        nextSubscription.unsubscribe();
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [reload, signalId]);

  const submitResponse = useCallback(
    async (input: CreateCommunityUmkmResponseInput): Promise<boolean> => {
      setSubmitting(true);
      setSubmitError(null);

      try {
        const response = await upsertCommunityDemandSignalResponse(
          signalId,
          input,
        );

        setResponses((current) => [
          response,
          ...current.filter((item) => item.id !== response.id),
        ]);
        return true;
      } catch (caught) {
        setSubmitError(
          caught instanceof Error
            ? caught.message
            : "Respons UMKM gagal dikirim.",
        );
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [signalId],
  );

  return {
    signal,
    responses,
    ownedMerchants,
    loading,
    submitting,
    error,
    submitError,
    reload,
    submitResponse,
  };
}
