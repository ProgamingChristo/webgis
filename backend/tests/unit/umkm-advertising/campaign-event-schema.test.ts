import { describe, it, expect } from "vitest";
import { recordCampaignEventSchema } from "@/src/features/umkm-advertising/events/schemas/campaign-event.schema";

describe("recordCampaignEventSchema", () => {
  const validPayload = {
    event_type: "IMPRESSION",
    campaign_id: "99999999-9999-4999-9999-999999999999",
    creative_id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
    placement: "SPONSORED_PIN",
    session_key: "session-abc-123",
  };

  it("should pass for valid canonical event payload", () => {
    const parsed = recordCampaignEventSchema.safeParse(validPayload);
    expect(parsed.success).toBe(true);
  });

  it("should reject non-canonical event types like BANNER_CLICK or PURCHASE", () => {
    const parsed = recordCampaignEventSchema.safeParse({
      ...validPayload,
      event_type: "BANNER_CLICK",
    });
    expect(parsed.success).toBe(false);

    const purchase = recordCampaignEventSchema.safeParse({
      ...validPayload,
      event_type: "PURCHASE",
    });
    expect(purchase.success).toBe(false);
  });

  it("should reject injected user_id field (strict schema)", () => {
    const parsed = recordCampaignEventSchema.safeParse({
      ...validPayload,
      user_id: "injected-user-123",
    });
    expect(parsed.success).toBe(false);
  });

  it("should reject injected revenue or roi fields (strict schema)", () => {
    const parsed = recordCampaignEventSchema.safeParse({
      ...validPayload,
      revenue: 500000,
      roi: 2.5,
    });
    expect(parsed.success).toBe(false);
  });

  it("should reject non-UUID campaign_id", () => {
    const parsed = recordCampaignEventSchema.safeParse({
      ...validPayload,
      campaign_id: "not-a-valid-uuid",
    });
    expect(parsed.success).toBe(false);
  });

  it("should accept valid context object with surface and request_id", () => {
    const parsed = recordCampaignEventSchema.safeParse({
      ...validPayload,
      context: {
        surface: "COMMUTER_DISCOVERY",
        request_id: "req-123",
      },
    });
    expect(parsed.success).toBe(true);
  });
});
