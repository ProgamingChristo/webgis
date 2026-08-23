import { describe, it, expect, vi, beforeEach } from "vitest";
import { CampaignLifecycleService } from "@/src/features/umkm-advertising/lifecycle/services/campaign-lifecycle.service";
import { CampaignReadinessResult } from "@/src/features/umkm-advertising/lifecycle/types/lifecycle.types";

describe("CampaignLifecycleService Unit Tests", () => {
  let service: CampaignLifecycleService;
  let mockSupabase: any;

  const mockReadyResult: CampaignReadinessResult = {
    ready: true,
    checks: {
      merchant: true,
      creative: true,
      targeting: true,
      schedule: true,
    },
    blockers: [],
  };

  const mockNotReadyResult: CampaignReadinessResult = {
    ready: false,
    checks: {
      merchant: true,
      creative: false,
      targeting: true,
      schedule: true,
    },
    blockers: ["CREATIVE_NOT_READY"],
  };

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
    };
    service = new CampaignLifecycleService(mockSupabase);
  });

  describe("getEffectiveCampaignStatus - Temporal Boundary Evaluations", () => {
    const startAt = "2026-09-01T10:00:00.000Z";
    const endAt = "2026-09-10T10:00:00.000Z";

    it("should return CANCELLED if persisted status is CANCELLED regardless of dates or readiness", () => {
      const now = new Date("2026-09-05T10:00:00.000Z");
      const status = service.getEffectiveCampaignStatus(
        "CANCELLED",
        mockReadyResult,
        startAt,
        endAt,
        now
      );
      expect(status).toBe("CANCELLED");
    });

    it("should return ENDED if persisted status is ENDED", () => {
      const now = new Date("2026-09-05T10:00:00.000Z");
      const status = service.getEffectiveCampaignStatus(
        "ENDED",
        mockReadyResult,
        startAt,
        endAt,
        now
      );
      expect(status).toBe("ENDED");
    });

    it("should return ENDED if now >= end_at even if persisted status is PAUSED", () => {
      const now = new Date("2026-09-10T10:00:00.000Z"); // exact end_at
      const status = service.getEffectiveCampaignStatus(
        "PAUSED",
        mockReadyResult,
        startAt,
        endAt,
        now
      );
      expect(status).toBe("ENDED");
    });

    it("should return PAUSED if persisted status is PAUSED and now < end_at", () => {
      const now = new Date("2026-09-05T10:00:00.000Z");
      const status = service.getEffectiveCampaignStatus(
        "PAUSED",
        mockReadyResult,
        startAt,
        endAt,
        now
      );
      expect(status).toBe("PAUSED");
    });

    it("should return DRAFT if campaign is not fully ready (e.g. missing creative)", () => {
      const now = new Date("2026-09-05T10:00:00.000Z");
      const status = service.getEffectiveCampaignStatus(
        "DRAFT",
        mockNotReadyResult,
        startAt,
        endAt,
        now
      );
      expect(status).toBe("DRAFT");
    });

    it("should return SCHEDULED when ready and now < start_at", () => {
      const now = new Date("2026-09-01T09:59:59.999Z"); // 1ms before start
      const status = service.getEffectiveCampaignStatus(
        "READY",
        mockReadyResult,
        startAt,
        endAt,
        now
      );
      expect(status).toBe("SCHEDULED");
    });

    it("should return ACTIVE when ready and now == start_at (inclusive lower bound)", () => {
      const now = new Date("2026-09-01T10:00:00.000Z"); // exact start_at
      const status = service.getEffectiveCampaignStatus(
        "SCHEDULED",
        mockReadyResult,
        startAt,
        endAt,
        now
      );
      expect(status).toBe("ACTIVE");
    });

    it("should return ACTIVE when ready and start_at < now < end_at", () => {
      const now = new Date("2026-09-05T12:00:00.000Z"); // middle of campaign
      const status = service.getEffectiveCampaignStatus(
        "ACTIVE",
        mockReadyResult,
        startAt,
        endAt,
        now
      );
      expect(status).toBe("ACTIVE");
    });

    it("should return ENDED when ready and now == end_at (exclusive upper bound)", () => {
      const now = new Date("2026-09-10T10:00:00.000Z"); // exact end_at
      const status = service.getEffectiveCampaignStatus(
        "ACTIVE",
        mockReadyResult,
        startAt,
        endAt,
        now
      );
      expect(status).toBe("ENDED");
    });

    it("should return ENDED when ready and now > end_at", () => {
      const now = new Date("2026-09-11T00:00:00.000Z"); // after end_at
      const status = service.getEffectiveCampaignStatus(
        "ACTIVE",
        mockReadyResult,
        startAt,
        endAt,
        now
      );
      expect(status).toBe("ENDED");
    });
  });

  describe("calculateAllowedActions", () => {
    it("DRAFT: can edit schedule, can cancel, cannot pause or resume", () => {
      const actions = service.calculateAllowedActions("DRAFT");
      expect(actions).toEqual({
        canEditSchedule: true,
        canPause: false,
        canResume: false,
        canCancel: true,
      });
    });

    it("SCHEDULED: can edit schedule, can pause, can cancel, cannot resume", () => {
      const actions = service.calculateAllowedActions("SCHEDULED");
      expect(actions).toEqual({
        canEditSchedule: true,
        canPause: true,
        canResume: false,
        canCancel: true,
      });
    });

    it("ACTIVE: cannot edit schedule directly without pause, can pause, can cancel, cannot resume", () => {
      const actions = service.calculateAllowedActions("ACTIVE");
      expect(actions).toEqual({
        canEditSchedule: false,
        canPause: true,
        canResume: false,
        canCancel: true,
      });
    });

    it("PAUSED: can edit schedule, cannot pause, can resume, can cancel", () => {
      const actions = service.calculateAllowedActions("PAUSED");
      expect(actions).toEqual({
        canEditSchedule: true,
        canPause: false,
        canResume: true,
        canCancel: true,
      });
    });

    it("ENDED: terminal state, no actions allowed", () => {
      const actions = service.calculateAllowedActions("ENDED");
      expect(actions).toEqual({
        canEditSchedule: false,
        canPause: false,
        canResume: false,
        canCancel: false,
      });
    });

    it("CANCELLED: terminal state, no actions allowed", () => {
      const actions = service.calculateAllowedActions("CANCELLED");
      expect(actions).toEqual({
        canEditSchedule: false,
        canPause: false,
        canResume: false,
        canCancel: false,
      });
    });
  });
});
