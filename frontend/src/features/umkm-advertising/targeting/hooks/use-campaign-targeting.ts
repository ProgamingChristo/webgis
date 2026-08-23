"use client";

import { useState, useEffect, useCallback } from "react";
import { CampaignTarget, SaveTargetingInput, TargetType } from "../types/targeting.types";
import { TargetingService } from "../services/targeting.service";
import { DEFAULT_RADIUS_METERS } from "../schemas/targeting.schema";

export function useCampaignTargeting(merchantId: string, campaignId: string) {
  const [target, setTarget] = useState<CampaignTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form draft state
  const [selectedType, setSelectedType] = useState<TargetType>("RADIUS");
  const [radiusMeters, setRadiusMeters] = useState<number>(DEFAULT_RADIUS_METERS);
  const [selectedStudyAreaId, setSelectedStudyAreaId] = useState<string>("");

  const fetchTargeting = useCallback(async () => {
    if (!merchantId || !campaignId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await TargetingService.getCampaignTarget(merchantId, campaignId);
      setTarget(data);

      if (data.targetType) {
        setSelectedType(data.targetType);
      }
      if (data.radiusMeters) {
        setRadiusMeters(data.radiusMeters);
      }
      if (data.studyAreaId) {
        setSelectedStudyAreaId(data.studyAreaId);
      }
    } catch (err: any) {
      setError(err.message || "Gagal memuat targeting campaign");
    } finally {
      setLoading(false);
    }
  }, [merchantId, campaignId]);

  useEffect(() => {
    const requestId = window.setTimeout(() => {
      void fetchTargeting();
    }, 0);

    return () => {
      window.clearTimeout(requestId);
    };
  }, [fetchTargeting]);

  const saveTargeting = async (input?: SaveTargetingInput) => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const payload: SaveTargetingInput =
        input ||
        (selectedType === "RADIUS"
          ? { target_type: "RADIUS", radius_meters: Number(radiusMeters) }
          : { target_type: "STUDY_AREA", study_area_id: selectedStudyAreaId });

      const updated = await TargetingService.saveCampaignTarget(merchantId, campaignId, payload);
      setTarget(updated);
      setSuccessMessage("Target kampanye berhasil disimpan.");
      return updated;
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan targeting");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return {
    target,
    loading,
    saving,
    error,
    successMessage,
    selectedType,
    setSelectedType,
    radiusMeters,
    setRadiusMeters,
    selectedStudyAreaId,
    setSelectedStudyAreaId,
    saveTargeting,
    refetch: fetchTargeting,
  };
}
