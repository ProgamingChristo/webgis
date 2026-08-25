import { describe, expect, it } from "vitest";

import {
  communityContributionHistoryQuerySchema,
  createCommunityContributionSchema,
} from "@/src/features/community-contributions";

const location = {
  longitude: 106.8272,
  latitude: -6.1754,
};

const observedAt = "2026-08-24T09:30:00.000+07:00";
const merchantId = "11111111-2222-4333-8444-555555555555";

function expectValid(input: unknown) {
  const parsed = createCommunityContributionSchema.safeParse(input);
  expect(parsed.success).toBe(true);
}

function expectInvalid(input: unknown) {
  const parsed = createCommunityContributionSchema.safeParse(input);
  expect(parsed.success).toBe(false);
}

describe("createCommunityContributionSchema", () => {
  it("accepts all six Phase 1 report types with bounded payloads", () => {
    expectValid({
      report_type: "SIDEWALK_OBSTRUCTION",
      location,
      observed_at: observedAt,
      details: "Motor parked across the sidewalk",
      pedestrian_edge_id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    });
    expectValid({
      report_type: "RAMP_OR_GUIDING_BLOCK",
      location,
      observed_at: observedAt,
      facility_type: "RAMP",
      details: "Ramp lip is too high",
    });
    expectValid({
      report_type: "RAMP_OR_GUIDING_BLOCK",
      location,
      observed_at: observedAt,
      facility_type: "GUIDING_BLOCK",
      details: "Guiding block is broken near the gate",
    });
    expectValid({
      report_type: "CROSSING",
      location,
      observed_at: observedAt,
      details: "Crossing signal is missing audio",
    });
    expectValid({
      report_type: "MERCHANT_LOCATION_CHANGED",
      location,
      observed_at: observedAt,
      target_merchant_id: merchantId,
      reported_new_location: {
        longitude: 106.828,
        latitude: -6.176,
      },
      notes: "Moved two doors down",
    });
    expectValid({
      report_type: "MERCHANT_PRICE_CHANGED",
      location,
      observed_at: observedAt,
      target_merchant_id: merchantId,
      reported_price_level: "Rp15.000-Rp25.000",
      notes: "Lunch menu changed",
    });
    expectValid({
      report_type: "MERCHANT_HOURS_CHANGED",
      location,
      observed_at: observedAt,
      target_merchant_id: merchantId,
      reported_opening_hours: {
        monday: "08:00-17:00",
      },
      notes: "Now closes earlier",
    });
  });

  it("rejects unknown report types, unknown fields, and attempted system-field injection", () => {
    expectInvalid({
      report_type: "CONFIRMED",
      location,
      observed_at: observedAt,
      details: "Bad status-shaped report type",
    });
    expectInvalid({
      report_type: "CROSSING",
      location,
      observed_at: observedAt,
      details: "Crossing is blocked",
      extra: "not accepted",
    });
    expectInvalid({
      report_type: "SIDEWALK_OBSTRUCTION",
      location,
      observed_at: observedAt,
      details: "Blocked",
      author_id: "attacker",
      status: "APPROVED",
      points_awarded: 999,
      trust_score: 999,
    });
  });

  it("rejects invalid coordinates, missing location, and malformed observed_at", () => {
    expectInvalid({
      report_type: "CROSSING",
      location: {
        longitude: 181,
        latitude: -6.1754,
      },
      observed_at: observedAt,
      details: "Bad longitude",
    });
    expectInvalid({
      report_type: "CROSSING",
      observed_at: observedAt,
      details: "No location",
    });
    expectInvalid({
      report_type: "CROSSING",
      location,
      observed_at: "2026-08-24",
      details: "No offset datetime",
    });
  });

  it("rejects type-specific missing or malformed payloads", () => {
    expectInvalid({
      report_type: "SIDEWALK_OBSTRUCTION",
      location,
      observed_at: observedAt,
    });
    expectInvalid({
      report_type: "RAMP_OR_GUIDING_BLOCK",
      location,
      observed_at: observedAt,
      facility_type: "STAIRS",
      details: "Wrong enum",
    });
    expectInvalid({
      report_type: "CROSSING",
      location,
      observed_at: observedAt,
      details: "",
    });
    expectInvalid({
      report_type: "MERCHANT_LOCATION_CHANGED",
      location,
      observed_at: observedAt,
      target_merchant_id: merchantId,
      reported_new_location: {
        longitude: 106.828,
        latitude: -91,
      },
    });
    expectInvalid({
      report_type: "MERCHANT_HOURS_CHANGED",
      location,
      observed_at: observedAt,
      target_merchant_id: merchantId,
      reported_opening_hours: {},
    });
  });

  it("rejects oversized text fields", () => {
    expectInvalid({
      report_type: "SIDEWALK_OBSTRUCTION",
      location,
      observed_at: observedAt,
      details: "x".repeat(501),
    });
    expectInvalid({
      report_type: "MERCHANT_PRICE_CHANGED",
      location,
      observed_at: observedAt,
      target_merchant_id: merchantId,
      reported_price_level: "x".repeat(65),
    });
  });
});

describe("communityContributionHistoryQuerySchema", () => {
  it("accepts bounded pagination and simple filters without user_id", () => {
    const parsed = communityContributionHistoryQuerySchema.safeParse({
      page: "2",
      limit: "10",
      status: "PENDING",
      report_type: "CROSSING",
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data).toMatchObject({
      page: 2,
      limit: 10,
      status: "PENDING",
      report_type: "CROSSING",
    });
  });

  it("rejects unsafe history query fields and oversized limits", () => {
    expect(
      communityContributionHistoryQuerySchema.safeParse({
        page: "1",
        limit: "100000",
      }).success,
    ).toBe(false);
    expect(
      communityContributionHistoryQuerySchema.safeParse({
        page: "1",
        limit: "20",
        user_id: "attacker",
      }).success,
    ).toBe(false);
  });
});
