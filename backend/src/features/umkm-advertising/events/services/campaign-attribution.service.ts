import { PlacementType } from "../types/campaign-event.types";

export interface PlacementAttributionContext {
  campaignId: string;
  creativeId?: string | null;
  placement: PlacementType;
  surface?: string;
  requestId?: string;
}

export class CampaignAttributionService {
  /**
   * Generates a safe, non-sensitive attribution context object for UI interactions.
   */
  static createAttributionContext(
    campaignId: string,
    creativeId: string | undefined | null,
    placement: PlacementType,
    surface?: string
  ): PlacementAttributionContext {
    return {
      campaignId,
      creativeId: creativeId || null,
      placement,
      surface: surface || "COMMUTER_DISCOVERY",
    };
  }
}
