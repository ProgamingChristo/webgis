"use client";

import { useCallback, useEffect, useState } from "react";

import {
  createCommuterRequest,
  getCommuterRequests,
} from "../api/community.api";
import type {
  CommuterRequestItem,
  CommunityFeedMeta,
  CreateCommuterRequestInput,
} from "../types/community.types";

const INITIAL_META: CommunityFeedMeta = {
  page: 1,
  limit: 20,
  total: 0,
  total_pages: 1,
};

export function useCommuterRequests() {
  const [items, setItems] = useState<CommuterRequestItem[]>([]);
  const [meta, setMeta] = useState<CommunityFeedMeta>(INITIAL_META);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadPage = useCallback(
    async (page: number) => {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      setError(null);

      try {
        const result = await getCommuterRequests(page, meta.limit);

        setMeta(result.meta);
        setItems((current) =>
          page === 1 ? result.items : [...current, ...result.items],
        );
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Permintaan Komuter gagal dimuat.",
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [meta.limit],
  );

  useEffect(() => {
    const requestId = window.setTimeout(() => {
      void loadPage(1);
    }, 0);

    return () => window.clearTimeout(requestId);
  }, [loadPage]);

  const publishRequest = useCallback(
    async (input: CreateCommuterRequestInput): Promise<boolean> => {
      setSubmitting(true);
      setSubmitError(null);

      try {
        const item = await createCommuterRequest(input);

        setItems((current) => [
          item,
          ...current.filter((request) => request.id !== item.id),
        ]);
        setMeta((current) => ({
          ...current,
          total: current.total + 1,
          total_pages: Math.max(
            1,
            Math.ceil((current.total + 1) / current.limit),
          ),
        }));
        return true;
      } catch (caught) {
        setSubmitError(
          caught instanceof Error
            ? caught.message
            : "Permintaan Komuter gagal dibuat.",
        );
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  return {
    items,
    meta,
    loading,
    loadingMore,
    submitting,
    error,
    submitError,
    reload: () => loadPage(1),
    loadMore: () => loadPage(meta.page + 1),
    publishRequest,
  };
}
