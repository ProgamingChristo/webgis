"use client";

import { useState, useEffect, useCallback } from "react";
import { StudyAreaSummary } from "../types/targeting.types";
import { TargetingService } from "../services/targeting.service";

export function useStudyAreas() {
  const [studyAreas, setStudyAreas] = useState<StudyAreaSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudyAreas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await TargetingService.getStudyAreas();
      setStudyAreas(data);
    } catch (err: any) {
      setError(err.message || "Gagal memuat study areas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const requestId = window.setTimeout(() => {
      void fetchStudyAreas();
    }, 0);

    return () => {
      window.clearTimeout(requestId);
    };
  }, [fetchStudyAreas]);

  return {
    studyAreas,
    loading,
    error,
    refetch: fetchStudyAreas,
  };
}
