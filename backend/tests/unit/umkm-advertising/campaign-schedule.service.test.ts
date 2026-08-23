import { describe, it, expect, vi, beforeEach } from "vitest";
import { CampaignScheduleService } from "@/src/features/umkm-advertising/lifecycle/services/campaign-schedule.service";
import {
  CampaignNotEditableError,
  ScheduleInvalidError,
} from "@/src/features/umkm-advertising/lifecycle/errors/lifecycle.errors";

describe("CampaignScheduleService Unit Tests", () => {
  let service: CampaignScheduleService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
    };
    service = new CampaignScheduleService(mockSupabase);
  });

  describe("Validation and Boundary Rules", () => {
    const fixedNow = new Date("2026-09-01T00:00:00.000Z");

    it("should reject input when start_at is invalid date format", async () => {
      await expect(
        service.updateSchedule(
          "merchant-123",
          "campaign-123",
          {
            start_at: "invalid-date",
            end_at: "2026-09-10T00:00:00.000Z",
          },
          fixedNow
        )
      ).rejects.toThrow(ScheduleInvalidError);
    });

    it("should reject input when end_at <= start_at", async () => {
      await expect(
        service.updateSchedule(
          "merchant-123",
          "campaign-123",
          {
            start_at: "2026-09-10T00:00:00.000Z",
            end_at: "2026-09-05T00:00:00.000Z", // end before start
          },
          fixedNow
        )
      ).rejects.toThrow(ScheduleInvalidError);
    });

    it("should reject input when end_at is equal to start_at", async () => {
      await expect(
        service.updateSchedule(
          "merchant-123",
          "campaign-123",
          {
            start_at: "2026-09-10T00:00:00.000Z",
            end_at: "2026-09-10T00:00:00.000Z", // end == start
          },
          fixedNow
        )
      ).rejects.toThrow(ScheduleInvalidError);
    });

    it("should reject input when end_at is in the past relative to now", async () => {
      const pastNow = new Date("2026-10-01T00:00:00.000Z"); // now is after end_at
      await expect(
        service.updateSchedule(
          "merchant-123",
          "campaign-123",
          {
            start_at: "2026-09-01T00:00:00.000Z",
            end_at: "2026-09-10T00:00:00.000Z",
          },
          pastNow
        )
      ).rejects.toThrow(ScheduleInvalidError);
    });
  });

  describe("State Transition Restrictions", () => {
    it("should reject schedule update on ACTIVE campaign without pausing first", async () => {
      const fixedNow = new Date("2026-09-01T00:00:00.000Z");

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: "campaign-123",
              merchant_id: "merchant-123",
              name: "Active Promo",
              status: "ACTIVE",
              start_at: "2026-08-25T00:00:00.000Z",
              end_at: "2026-09-05T00:00:00.000Z",
            },
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: selectMock,
      });

      await expect(
        service.updateSchedule(
          "merchant-123",
          "campaign-123",
          {
            start_at: "2026-09-02T00:00:00.000Z",
            end_at: "2026-09-15T00:00:00.000Z",
          },
          fixedNow
        )
      ).rejects.toThrow(CampaignNotEditableError);
    });
  });
});
