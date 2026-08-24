import { describe, it, expect, vi, beforeEach } from "vitest";
import { CampaignEventService } from "@/src/features/umkm-advertising/events/services/campaign-event.service";

describe("CampaignEventService", () => {
  let mockSupabase: any;
  let service: CampaignEventService;

  const validCampaignId = "99999999-9999-4999-9999-999999999999";
  const validMerchantId = "88888888-8888-4888-8888-888888888888";
  const validPinCreativeId = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
  const validBannerCreativeId = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
  const sessionKey = "test-session-123";

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "ad_campaigns") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn((col: string, val: string) => {
              if (val === validCampaignId) {
                return {
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: validCampaignId,
                      merchant_id: validMerchantId,
                      status: "ACTIVE",
                    },
                    error: null,
                  }),
                };
              }
              return {
                single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
              };
            }),
          };
        }

        if (table === "ad_creatives") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn((col: string, val: string) => {
              if (val === validPinCreativeId) {
                return {
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: validPinCreativeId,
                      campaign_id: validCampaignId,
                      creative_type: "SPONSORED_PIN",
                      status: "READY",
                    },
                    error: null,
                  }),
                };
              }
              if (val === validBannerCreativeId) {
                return {
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: validBannerCreativeId,
                      campaign_id: validCampaignId,
                      creative_type: "CONTEXTUAL_BANNER",
                      status: "READY",
                    },
                    error: null,
                  }),
                };
              }
              return {
                single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
              };
            }),
          };
        }

        if (table === "campaign_events") {
          return {
            insert: vi.fn((payload: any) => ({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: "event-uuid-1", dedup_key: payload.dedup_key },
                error: null,
              }),
            })),
          };
        }

        return {};
      }),
    };

    service = new CampaignEventService(mockSupabase);
  });

  it("should successfully record IMPRESSION for SPONSORED_PIN", async () => {
    const result = await service.recordEvent({
      event_type: "IMPRESSION",
      campaign_id: validCampaignId,
      creative_id: validPinCreativeId,
      placement: "SPONSORED_PIN",
      session_key: sessionKey,
    });

    expect(result.accepted).toBe(true);
    expect(result.deduplicated).toBe(false);
    expect(result.event_id).toBe("event-uuid-1");
  });

  it("should successfully record SPONSORED_PIN_CLICK for SPONSORED_PIN", async () => {
    const result = await service.recordEvent({
      event_type: "SPONSORED_PIN_CLICK",
      campaign_id: validCampaignId,
      creative_id: validPinCreativeId,
      placement: "SPONSORED_PIN",
      session_key: sessionKey,
    });

    expect(result.accepted).toBe(true);
    expect(result.deduplicated).toBe(false);
  });

  it("should successfully record PROFILE_OPEN for CONTEXTUAL_BANNER", async () => {
    const result = await service.recordEvent({
      event_type: "PROFILE_OPEN",
      campaign_id: validCampaignId,
      creative_id: validBannerCreativeId,
      placement: "CONTEXTUAL_BANNER",
      session_key: sessionKey,
    });

    expect(result.accepted).toBe(true);
    expect(result.deduplicated).toBe(false);
  });

  it("should successfully record ROUTE_REQUEST for SPONSORED_PIN", async () => {
    const result = await service.recordEvent({
      event_type: "ROUTE_REQUEST",
      campaign_id: validCampaignId,
      creative_id: validPinCreativeId,
      placement: "SPONSORED_PIN",
      session_key: sessionKey,
    });

    expect(result.accepted).toBe(true);
    expect(result.deduplicated).toBe(false);
  });

  it("should reject SPONSORED_PIN_CLICK on CONTEXTUAL_BANNER placement", async () => {
    await expect(
      service.recordEvent({
        event_type: "SPONSORED_PIN_CLICK",
        campaign_id: validCampaignId,
        creative_id: validBannerCreativeId,
        placement: "CONTEXTUAL_BANNER",
        session_key: sessionKey,
      })
    ).rejects.toThrow(/tidak kompatibel/);
  });

  it("should reject when campaign does not exist", async () => {
    await expect(
      service.recordEvent({
        event_type: "IMPRESSION",
        campaign_id: "00000000-0000-4000-0000-000000000000",
        placement: "SPONSORED_PIN",
        session_key: sessionKey,
      })
    ).rejects.toThrow(/tidak ditemukan/);
  });

  it("should reject when creative placement type mismatches", async () => {
    await expect(
      service.recordEvent({
        event_type: "IMPRESSION",
        campaign_id: validCampaignId,
        creative_id: validPinCreativeId,
        placement: "CONTEXTUAL_BANNER", // mismatched!
        session_key: sessionKey,
      })
    ).rejects.toThrow(/tidak cocok dengan placement/);
  });

  it("should handle unique dedup_key collision gracefully and return deduplicated: true", async () => {
    mockSupabase.from = vi.fn((table: string) => {
      if (table === "ad_campaigns") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: validCampaignId, merchant_id: validMerchantId, status: "ACTIVE" },
              error: null,
            }),
          }),
        };
      }
      if (table === "ad_creatives") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: validPinCreativeId, campaign_id: validCampaignId, creative_type: "SPONSORED_PIN" },
              error: null,
            }),
          }),
        };
      }
      if (table === "campaign_events") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: "23505", message: "duplicate key value violates unique constraint" },
            }),
          }),
        };
      }
      return {};
    });

    const dedupService = new CampaignEventService(mockSupabase);
    const result = await dedupService.recordEvent({
      event_type: "IMPRESSION",
      campaign_id: validCampaignId,
      creative_id: validPinCreativeId,
      placement: "SPONSORED_PIN",
      session_key: sessionKey,
    });

    expect(result.accepted).toBe(true);
    expect(result.deduplicated).toBe(true);
  });
});
