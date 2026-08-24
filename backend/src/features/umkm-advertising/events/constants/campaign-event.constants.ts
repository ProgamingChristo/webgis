import { CampaignEventType, PlacementType } from "../types/campaign-event.types";

export const CANONICAL_EVENT_TYPES: readonly CampaignEventType[] = [
  "IMPRESSION",
  "SPONSORED_PIN_CLICK",
  "PROFILE_OPEN",
  "ROUTE_REQUEST",
] as const;

export const CANONICAL_PLACEMENTS: readonly PlacementType[] = [
  "SPONSORED_PIN",
  "CONTEXTUAL_BANNER",
  "PROFILE_POSTER",
] as const;

/**
 * Maps which placements are valid for each canonical event type.
 * Note: SPONSORED_PIN_CLICK is strictly for SPONSORED_PIN.
 */
export const ALLOWED_EVENT_PLACEMENT_MAP: Record<CampaignEventType, readonly PlacementType[]> = {
  IMPRESSION: ["SPONSORED_PIN", "CONTEXTUAL_BANNER", "PROFILE_POSTER"],
  SPONSORED_PIN_CLICK: ["SPONSORED_PIN"],
  PROFILE_OPEN: ["SPONSORED_PIN", "CONTEXTUAL_BANNER"],
  ROUTE_REQUEST: ["SPONSORED_PIN", "CONTEXTUAL_BANNER", "PROFILE_POSTER"],
};
