import { describe, expect, it } from "vitest";

import { commuterConstraintQuerySchema, serviceAreaRequestSchema } from "@/src/features/commuter";

describe("commuter input boundaries", () => {
  it("accepts a complete, bounded walking request", () => {
    expect(commuterConstraintQuerySchema.safeParse({
      max_walking_minutes: "10",
      origin_longitude: "106.82",
      origin_latitude: "-6.23",
      origin_source: "SELECTED_POINT",
    }).success).toBe(true);
  });

  it.each([
    { max_walking_minutes: "4", origin_longitude: 106.82, origin_latitude: -6.23 },
    { max_walking_minutes: "31", origin_longitude: 106.82, origin_latitude: -6.23 },
    { max_walking_minutes: "10" },
    { origin_longitude: 106.82 },
    { max_budget: 30_000, arbitrary: "provider-path" },
  ])("rejects abusive or ambiguous input", (input) => {
    expect(commuterConstraintQuerySchema.safeParse(input).success).toBe(false);
  });

  it("bounds service-area thresholds", () => {
    const origin = { longitude: 106.82, latitude: -6.23 };
    expect(serviceAreaRequestSchema.safeParse({ origin, max_minutes: 5 }).success).toBe(true);
    expect(serviceAreaRequestSchema.safeParse({ origin, max_minutes: 999_999 }).success).toBe(false);
  });
});
