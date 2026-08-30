"use client";

import { useCallback, useEffect, useState } from "react";

import { getraApiGet, GetraApiError } from "@/src/lib/api/client";
import type {
  ApiListEnvelope,
  PaginatedEnvelope,
  StudyAreaDto,
  TransportCorridorDto,
  TransportNodeDto,
} from "@/src/types/canonical-api";

type AsyncState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

type CanonicalData = {
  studyAreas: StudyAreaDto[];
  transportNodes: TransportNodeDto[];
  transportCorridors: TransportCorridorDto[];
};

function listFromEnvelope<T>(body: ApiListEnvelope<T> | PaginatedEnvelope<T>): T[] {
  if (Array.isArray((body as ApiListEnvelope<T>).data)) {
    return (body as ApiListEnvelope<T>).data ?? [];
  }

  if (Array.isArray((body as PaginatedEnvelope<T>).items)) {
    return (body as PaginatedEnvelope<T>).items;
  }

  throw new GetraApiError("Format data canonical tidak dikenali.", "INVALID_RESPONSE");
}

export function useCanonicalData(): AsyncState<CanonicalData> {
  const [data, setData] = useState<CanonicalData>({
    studyAreas: [],
    transportNodes: [],
    transportCorridors: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setReloadKey((value) => value + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCanonicalData() {
      setLoading(true);
      setError(null);

      try {
        const [studyAreas, transportNodes, transportCorridors] = await Promise.all([
          getraApiGet<ApiListEnvelope<StudyAreaDto>>("/api/v1/study-areas", {
            signal: controller.signal,
          }).then(listFromEnvelope),
          getraApiGet<PaginatedEnvelope<TransportNodeDto>>("/api/v1/transport/nodes", {
            signal: controller.signal,
            query: {
              limit: 100,
              page: 1,
            },
          }).then(listFromEnvelope),
          getraApiGet<PaginatedEnvelope<TransportCorridorDto>>(
            "/api/v1/transport/corridors",
            {
              signal: controller.signal,
              query: {
                limit: 100,
                page: 1,
              },
            },
          ).then(listFromEnvelope),
        ]);

        setData({
          studyAreas,
          transportNodes,
          transportCorridors,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setError(
          error instanceof GetraApiError
            ? error.message
            : "Gagal memuat data canonical GETRA.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadCanonicalData();

    return () => {
      controller.abort();
    };
  }, [reloadKey]);

  return {
    data,
    loading,
    error,
    reload,
  };
}
