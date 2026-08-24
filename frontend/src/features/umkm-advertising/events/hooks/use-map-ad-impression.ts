"use client";

import { useEffect, useRef } from "react";
import { CampaignEventService } from "../services/campaign-event.service";

interface UseMapAdImpressionProps {
  campaignId: string | null | undefined;
  creativeId?: string | null | undefined;
  coordinates: [number, number] | null | undefined; // [lng, lat]
  mapBounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  } | null;
  enabled?: boolean;
}

export function useMapAdImpression({
  campaignId,
  creativeId,
  coordinates,
  mapBounds,
  enabled = true,
}: UseMapAdImpressionProps) {
  const recordedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled || !campaignId || !coordinates || recordedRef.current) {
      return;
    }

    const [lng, lat] = coordinates;

    // If map bounds provided, ensure point is inside visible viewport
    if (mapBounds) {
      const insideLat = lat >= mapBounds.south && lat <= mapBounds.north;
      const insideLng = lng >= mapBounds.west && lng <= mapBounds.east;
      if (!insideLat || !insideLng) {
        return;
      }
    }

    recordedRef.current = true;
    CampaignEventService.recordEvent({
      event_type: "IMPRESSION",
      campaign_id: campaignId,
      creative_id: creativeId,
      placement: "SPONSORED_PIN",
      context: { surface: "MAPLIBRE_COMMUTER_MAP" },
    });
  }, [campaignId, creativeId, coordinates, mapBounds, enabled]);
}
