"use client";

import { useCallback, useEffect, useState } from "react";

import { getCommunityDemandSignals } from "../api/community.api";
import type {
  CommunityDemandSignal,
  CommunityFeedMeta,
} from "../types/community.types";

const INITIAL_META: CommunityFeedMeta = {
  page: 1,
  limit: 20,
  total: 0,
  total_pages: 1,
};

export function useDemandSignals() {
  const [items, setItems] = useState<CommunityDemandSignal[]>([]);
  const [meta, setMeta] = useState<CommunityFeedMeta>(INITIAL_META);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(
    async (page: number) => {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      setError(null);

      try {
        const result = await getCommunityDemandSignals(page, meta.limit);

        setMeta(result.meta);
        setItems((current) =>
          page === 1 ? result.items : [...current, ...result.items],
        );
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Sinyal Community gagal dimuat.",
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

  return {
    items,
    meta,
    loading,
    loadingMore,
    error,
    reload: () => loadPage(1),
    loadMore: () => loadPage(meta.page + 1),
  };
}
