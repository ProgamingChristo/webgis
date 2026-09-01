import { useEffect, useRef, useState } from "react";

import { mapidLayerService } from "@/src/services/mapid-layer.service";
import type { Merchant } from "@/types/getra";

const DESTINATION_SEARCH_DEBOUNCE_MS = 250;
const DESTINATION_SEARCH_LIMIT = 8;

export function useDestinationMerchantSearch(query: string, enabled: boolean) {
  const [searchState, setSearchState] = useState<{
    query: string;
    results: Merchant[];
    loading: boolean;
    error: string | null;
  }>({ query: "", results: [], loading: false, error: null });
  const sequenceRef = useRef(0);

  useEffect(() => {
    const normalizedQuery = query.trim();
    const sequence = ++sequenceRef.current;
    if (!enabled || normalizedQuery.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearchState({
        query: normalizedQuery,
        results: [],
        loading: true,
        error: null,
      });
      void mapidLayerService.searchCanonicalMerchants(normalizedQuery, {
        limit: DESTINATION_SEARCH_LIMIT,
        signal: controller.signal,
      }).then((layer) => {
        if (sequence === sequenceRef.current && !controller.signal.aborted) {
          setSearchState({
            query: normalizedQuery,
            results: layer.merchants,
            loading: false,
            error: null,
          });
        }
      }).catch((searchError: unknown) => {
        if (sequence !== sequenceRef.current || controller.signal.aborted) return;
        setSearchState({
          query: normalizedQuery,
          results: [],
          loading: false,
          error: searchError instanceof Error
            ? searchError.message
            : "Pencarian tujuan sedang tidak tersedia.",
        });
      });
    }, DESTINATION_SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, query]);

  const normalizedQuery = query.trim();
  const stateIsCurrent = enabled &&
    normalizedQuery.length >= 2 &&
    searchState.query === normalizedQuery;
  return stateIsCurrent
    ? {
        results: searchState.results,
        loading: searchState.loading,
        error: searchState.error,
      }
    : {
        results: [],
        loading: enabled && normalizedQuery.length >= 2,
        error: null,
      };
}
