"use client";

import { useCallback } from "react";
import { PlacementType } from "../types/campaign-event.types";
import { CampaignEventService } from "../services/campaign-event.service";

export function useCampaignEvent() {
  const trackSponsoredPinClick = useCallback(
    (params: {
      campaignId: string;
      creativeId?: string | null;
      surface?: string;
    }) => {
      CampaignEventService.recordEvent({
        event_type: "SPONSORED_PIN_CLICK",
        campaign_id: params.campaignId,
        creative_id: params.creativeId,
        placement: "SPONSORED_PIN",
        context: { surface: params.surface || "MAPLIBRE_COMMUTER_MAP" },
      });
    },
    []
  );

  const trackProfileOpen = useCallback(
    (params: {
      campaignId: string;
      creativeId?: string | null;
      placement: PlacementType;
      surface?: string;
    }) => {
      CampaignEventService.recordEvent({
        event_type: "PROFILE_OPEN",
        campaign_id: params.campaignId,
        creative_id: params.creativeId,
        placement: params.placement,
        context: { surface: params.surface || "DISCOVERY_CTA" },
      });
    },
    []
  );

  const trackRouteRequest = useCallback(
    (params: {
      campaignId: string;
      creativeId?: string | null;
      placement: PlacementType;
      surface?: string;
    }) => {
      CampaignEventService.recordEvent({
        event_type: "ROUTE_REQUEST",
        campaign_id: params.campaignId,
        creative_id: params.creativeId,
        placement: params.placement,
        context: { surface: params.surface || "ROUTING_CTA" },
      });
    },
    []
  );

  return {
    trackSponsoredPinClick,
    trackProfileOpen,
    trackRouteRequest,
  };
}
