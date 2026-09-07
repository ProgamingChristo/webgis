"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { UmkmWorkspaceService } from "../services/umkm-workspace.service";
import type { UmkmWorkspaceSummary } from "../types/umkm-workspace.types";

export function useUmkmWorkspace(userId: string | null) {
  const [result, setResult] = useState<{ userId: string; summary: UmkmWorkspaceSummary } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const sequence = useRef(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    const requestId = ++sequence.current;
    if (!userId) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      void UmkmWorkspaceService.getWorkspaceSummary(controller.signal).then((summary) => {
        if (!controller.signal.aborted && requestId === sequence.current) setResult({ userId, summary });
      }).catch((cause: unknown) => {
        if (!controller.signal.aborted && requestId === sequence.current) setError(cause instanceof Error ? cause.message : "Gagal memuat usaha Anda.");
      }).finally(() => {
        if (!controller.signal.aborted && requestId === sequence.current) setLoading(false);
      });
    }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [userId, revision]);
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", onVisible); };
  }, [refresh]);
  return { summary: result?.userId === userId ? result.summary : null, loading, error, refresh };
}
