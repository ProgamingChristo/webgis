"use client";

import { useCallback, useEffect, useState } from "react";

import { getraApiGet, GetraApiError } from "@/src/lib/api/client";
import type {
  ApiListEnvelope,
  CanonicalData,
  PaginatedEnvelope,
  StudyAreaDto,
  TransportCorridorDto,
  TransportNodeDto,
} from "@/src/types/canonical-api";

type CanonicalState = {
  userId: string | null;
  reloadKey: number;
  data: CanonicalData;
  loading: boolean;
  error: string | null;
};

function emptyData(): CanonicalData {
  return { studyAreas: [], transportNodes: [], transportCorridors: [] };
}

function listFromEnvelope<T>(body: ApiListEnvelope<T> | PaginatedEnvelope<T>): T[] {
  if (body && typeof body === "object") {
    if ("data" in body && Array.isArray(body.data)) return body.data;
    if ("items" in body && Array.isArray(body.items)) return body.items;
  }
  throw new GetraApiError("Format data canonical tidak dikenali.", "INVALID_RESPONSE");
}

export async function loadCanonicalData(signal: AbortSignal): Promise<CanonicalData> {
  signal.throwIfAborted();
  const [studyAreas, transportNodes, transportCorridors] = await Promise.all([
    getraApiGet<ApiListEnvelope<StudyAreaDto>>("/api/v1/study-areas", { signal }).then(listFromEnvelope),
    getraApiGet<PaginatedEnvelope<TransportNodeDto>>("/api/v1/transport/nodes", {
      signal,
      query: { limit: 100, page: 1 },
    }).then(listFromEnvelope),
    getraApiGet<PaginatedEnvelope<TransportCorridorDto>>("/api/v1/transport/corridors", {
      signal,
      query: { limit: 100, page: 1 },
    }).then(listFromEnvelope),
  ]);
  signal.throwIfAborted();
  return { studyAreas, transportNodes, transportCorridors };
}

export function useCanonicalData(userId: string | null = null) {
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<CanonicalState>(() => ({
    userId, reloadKey, data: emptyData(), loading: Boolean(userId), error: null,
  }));
  const current = state.userId === userId && state.reloadKey === reloadKey
    ? state
    : { userId, reloadKey, data: emptyData(), loading: Boolean(userId), error: null };

  // Hide the previous account's data before paint, including an A -> B -> A switch.
  if (current !== state) setState(current);

  const reload = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    void loadCanonicalData(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setState({ userId, reloadKey, data, loading: false, error: null });
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          userId, reloadKey, data: emptyData(), loading: false,
          error: error instanceof GetraApiError ? error.message : "Gagal memuat data canonical GETRA.",
        });
      });
    return () => controller.abort();
  }, [userId, reloadKey]);

  return { data: current.data, loading: current.loading, error: current.error, reload };
}
