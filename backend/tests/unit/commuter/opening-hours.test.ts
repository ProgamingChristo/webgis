import { describe, expect, it } from "vitest";

import { evaluateOpeningHours } from "@/src/features/commuter";

const emptyWeek = () => ({
  sunday: [], monday: [], tuesday: [], wednesday: [],
  thursday: [], friday: [], saturday: [],
});

function schedule(day: keyof ReturnType<typeof emptyWeek>, intervals: unknown[]) {
  return {
    timezone: "Asia/Jakarta",
    weekly: { ...emptyWeek(), [day]: intervals },
  };
}

describe("Asia/Jakarta opening hours", () => {
  it("evaluates weekday and weekend schedules in local time", () => {
    expect(evaluateOpeningHours(
      schedule("monday", [{ open: "09:00", close: "17:00" }]),
      new Date("2026-08-31T05:00:00Z"),
    )).toBe("OPEN");
    expect(evaluateOpeningHours(
      schedule("sunday", [{ open: "09:00", close: "17:00" }]),
      new Date("2026-08-30T05:00:00Z"),
    )).toBe("OPEN");
  });

  it("handles an overnight interval on the following local day", () => {
    expect(evaluateOpeningHours(
      schedule("monday", [{ open: "18:00", close: "02:00" }]),
      new Date("2026-08-31T18:00:00Z"),
    )).toBe("OPEN");
  });

  it("returns CLOSED for a known closed day", () => {
    expect(evaluateOpeningHours(
      schedule("monday", [{ open: "09:00", close: "17:00" }]),
      new Date("2026-08-31T12:00:00Z"),
    )).toBe("CLOSED");
  });

  it.each([
    null,
    { open_now: true },
    { timezone: "UTC", weekly: emptyWeek() },
    { timezone: "Asia/Jakarta", weekly: { monday: [] } },
  ])("does not treat missing or unverified evidence as open", (value) => {
    expect(evaluateOpeningHours(value, new Date("2026-08-31T05:00:00Z"))).toBe("UNKNOWN");
  });
});
