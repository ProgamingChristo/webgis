import { apiClient } from "@/src/lib/api-client";
import {
  RecordCampaignEventInput,
  RecordEventResult,
} from "../types/campaign-event.types";
import {
  getOrCreateSessionKey,
  buildDedupKey,
  isLocallyRecorded,
  markLocallyRecorded,
} from "../utils/event-dedup";

export const CampaignEventService = {
  /**
   * Safely records a campaign event.
   * Performs client-side deduplication check first to prevent duplicate network calls.
   * Catches all network errors silently to ensure analytics never break core UX.
   */
  async recordEvent(input: RecordCampaignEventInput): Promise<RecordEventResult | null> {
    try {
      const sessionKey = input.session_key || getOrCreateSessionKey();
      const dedupKey =
        input.dedup_key ||
        buildDedupKey(
          input.event_type,
          input.campaign_id,
          input.creative_id,
          input.placement,
          sessionKey,
          input.context?.surface || "default"
        );

      if (isLocallyRecorded(dedupKey)) {
        return { accepted: true, deduplicated: true };
      }

      markLocallyRecorded(dedupKey);

      const payload = {
        event_type: input.event_type,
        campaign_id: input.campaign_id,
        creative_id: input.creative_id || null,
        placement: input.placement,
        session_key: sessionKey,
        dedup_key: dedupKey,
        context: input.context || {},
      };

      return await apiClient.post<RecordEventResult>("/api/advertising/events", payload);
    } catch (err) {
      console.warn("[CampaignEventService] Non-blocking event submission skipped:", err);
      return null;
    }
  },
};
