import { describe, expect, it } from "vitest";
import {
  hasCompleteOperatingHours,
  normalizeOperatingHours,
} from "@/src/features/umkm-workspace/utils/profile-hours-helper";

describe("merchant profile operating-hour normalization", () => {
  it("materialises seven editable days for a legacy open_now record", () => {
    const normalized = normalizeOperatingHours({ open_now: true });

    expect(Object.keys(normalized)).toHaveLength(7);
    expect(normalized.monday).toEqual({
      is_closed: false,
      opens_at: "08:00",
      closes_at: "21:00",
    });
    expect(normalized.sunday).toEqual({
      is_closed: true,
      opens_at: null,
      closes_at: null,
    });
    expect(hasCompleteOperatingHours({ open_now: true })).toBe(false);
    expect(hasCompleteOperatingHours(normalized)).toBe(true);
  });

  it("preserves configured days and fills only missing days", () => {
    const normalized = normalizeOperatingHours({
      open_now: true,
      sunday: { is_closed: false, opens_at: "08:01", closes_at: "21:00" },
    });

    expect(normalized.sunday).toEqual({
      is_closed: false,
      opens_at: "08:01",
      closes_at: "21:00",
    });
    expect(normalized.monday.opens_at).toBe("08:00");
    expect(normalized).not.toHaveProperty("open_now");
  });

  it("rejects malformed time values and replaces them with safe defaults", () => {
    const normalized = normalizeOperatingHours({
      monday: { is_closed: false, opens_at: "25:90", closes_at: "oops" },
    });

    expect(normalized.monday).toEqual({
      is_closed: false,
      opens_at: "08:00",
      closes_at: "21:00",
    });
  });
});
