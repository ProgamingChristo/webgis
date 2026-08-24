"use client";

import { useEffect, useRef } from "react";
import { PlacementType } from "../types/campaign-event.types";
import { CampaignEventService } from "../services/campaign-event.service";

interface UseAdImpressionProps {
  campaignId: string | null | undefined;
  creativeId?: string | null | undefined;
  placement: PlacementType;
  surface?: string;
  enabled?: boolean;
  threshold?: number;
}

export function useAdImpression<T extends HTMLElement = HTMLDivElement>({
  campaignId,
  creativeId,
  placement,
  surface = "COMMUTER_DISCOVERY",
  enabled = true,
  threshold = 0.5,
}: UseAdImpressionProps) {
  const elementRef = useRef<T | null>(null);
  const recordedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled || !campaignId || recordedRef.current) {
      return;
    }

    const element = elementRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry && entry.isIntersecting && entry.intersectionRatio >= threshold) {
          if (!recordedRef.current) {
            recordedRef.current = true;
            CampaignEventService.recordEvent({
              event_type: "IMPRESSION",
              campaign_id: campaignId,
              creative_id: creativeId,
              placement,
              context: { surface },
            });
            observer.disconnect();
          }
        }
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [campaignId, creativeId, placement, surface, enabled, threshold]);

  return { ref: elementRef };
}
