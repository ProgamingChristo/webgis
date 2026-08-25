import { describe, expect, it, vi } from "vitest";

import { CommunityContributionService } from "@/src/features/community-contributions";
import { RepositoryError } from "@/src/repositories/errors";

const authorId = "99999999-aaaa-4bbb-8ccc-dddddddddddd";
const contributionId = "11111111-2222-4333-8444-555555555555";
const merchantId = "22222222-3333-4444-8555-666666666666";
const location = {
  longitude: 106.8272,
  latitude: -6.1754,
};
const observedAt = "2026-08-24T09:30:00.000+07:00";

function createContribution(overrides = {}) {
  return {
    id: contributionId,
    authorId,
    reportType: "MERCHANT_PRICE_CHANGED",
    status: "PENDING",
    location,
    observedAt,
    reportData: {
      reported_price_level: "Rp15.000-Rp25.000",
    },
    targetMerchantId: merchantId,
    reportedNewLocation: null,
    submittedAt: observedAt,
    createdAt: observedAt,
    updatedAt: observedAt,
    reviewedAt: null,
    reviewReason: null,
    ...overrides,
  };
}

function createService() {
  const repository = {
    create: vi.fn().mockResolvedValue(createContribution()),
    getOwn: vi.fn().mockResolvedValue(createContribution()),
    listOwnHistory: vi.fn().mockResolvedValue({
      items: [],
      summary: {
        totalContributions: 0,
        pendingCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        contributionPoints: 0,
        trustScore: 50,
        reviewedContributions: 0,
        trustApprovedContributions: 0,
        trustRejectedContributions: 0,
      },
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
        hasMore: false,
      },
    }),
    listMapFeatures: vi.fn().mockResolvedValue([]),
    listModerationQueue: vi.fn().mockResolvedValue({
      items: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
        hasMore: false,
      },
    }),
    getModerationDetail: vi.fn().mockResolvedValue(
      createContribution({
        authorDisplayName: "Kontributor GETRA",
        authorAvatarUrl: null,
        targetName: "Warung A",
        pointsAwarded: 0,
      }),
    ),
    confirm: vi.fn().mockResolvedValue(
      createContribution({
        authorDisplayName: "Kontributor GETRA",
        authorAvatarUrl: null,
        status: "APPROVED",
        targetName: "Warung A",
        pointsAwarded: 1,
      }),
    ),
    reject: vi.fn().mockResolvedValue(
      createContribution({
        authorDisplayName: "Kontributor GETRA",
        authorAvatarUrl: null,
        status: "REJECTED",
        targetName: "Warung A",
        pointsAwarded: 0,
        reviewedAt: observedAt,
        reviewReason: "INVALID_LOCATION",
      }),
    ),
  };

  return {
    repository,
    service: new CommunityContributionService(repository),
  };
}

describe("CommunityContributionService", () => {
  it("creates pending accessibility contributions and derives author/status server-side", async () => {
    const { repository, service } = createService();
    const payload = {
      report_type: "SIDEWALK_OBSTRUCTION",
      location,
      observed_at: observedAt,
      details: "Stall blocks the tactile path",
      pedestrian_edge_id: contributionId,
    };

    await expect(service.create(authorId, payload)).resolves.toMatchObject({
      status: "PENDING",
    });

    expect(repository.create).toHaveBeenCalledWith({
      authorId,
      reportType: "SIDEWALK_OBSTRUCTION",
      location,
      observedAt,
      reportData: {
        details: "Stall blocks the tactile path",
        pedestrian_edge_id: contributionId,
      },
    });
  });

  it("maps merchant changed reports without mutating canonical merchant data", async () => {
    const { repository, service } = createService();

    await service.create(authorId, {
      report_type: "MERCHANT_LOCATION_CHANGED",
      location,
      observed_at: observedAt,
      target_merchant_id: merchantId,
      reported_new_location: {
        longitude: 106.828,
        latitude: -6.176,
      },
      notes: "Moved closer to the entrance",
    });
    await service.create(authorId, {
      report_type: "MERCHANT_PRICE_CHANGED",
      location,
      observed_at: observedAt,
      target_merchant_id: merchantId,
      reported_price_level: "Rp20.000-Rp30.000",
    });
    await service.create(authorId, {
      report_type: "MERCHANT_HOURS_CHANGED",
      location,
      observed_at: observedAt,
      target_merchant_id: merchantId,
      reported_opening_hours: {
        friday: "10:00-20:00",
      },
    });

    expect(repository.create).toHaveBeenCalledTimes(3);
    expect(repository).not.toHaveProperty("updateMerchant");
    expect(repository).not.toHaveProperty("awardPoints");
    expect(repository).not.toHaveProperty("updateTrustScore");
  });

  it("rejects author spoofing and moderation/status/points injection", async () => {
    const { repository, service } = createService();

    await expect(
      service.create(authorId, {
        report_type: "CROSSING",
        location,
        observed_at: observedAt,
        details: "Needs accessible crossing",
        author_id: "attacker",
        status: "APPROVED",
        points: 100,
        trust_score: 100,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    expect(repository.create).not.toHaveBeenCalled();
  });

  it("maps nonexistent or inaccessible merchant targets to validation errors", async () => {
    const { repository, service } = createService();
    repository.create.mockRejectedValueOnce(
      new RepositoryError("VALIDATION_ERROR", "community_contributions.create"),
    );

    await expect(
      service.create(authorId, {
        report_type: "MERCHANT_PRICE_CHANGED",
        location,
        observed_at: observedAt,
        target_merchant_id: merchantId,
        reported_price_level: "Rp20.000-Rp30.000",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it.each([
    ["CONTRIBUTION_RATE_LIMITED"],
    ["CONTRIBUTION_DUPLICATE"],
    ["INVALID_OBSERVATION_TIME"],
    ["INVALID_TARGET_LOCATION"],
  ] as const)("preserves Phase 3 repository error %s", async (code) => {
    const { repository, service } = createService();
    repository.create.mockRejectedValueOnce(
      new RepositoryError(code, "community_contributions.create"),
    );

    await expect(
      service.create(authorId, {
        report_type: "MERCHANT_PRICE_CHANGED",
        location,
        observed_at: observedAt,
        target_merchant_id: merchantId,
        reported_price_level: "Rp20.000-Rp30.000",
      }),
    ).rejects.toMatchObject({ code });
  });

  it("returns only owned contribution details through repository getOwn", async () => {
    const { repository, service } = createService();

    await expect(service.getOwn(contributionId)).resolves.toMatchObject({
      id: contributionId,
    });

    expect(repository.getOwn).toHaveBeenCalledWith(contributionId);
  });

  it("maps user A reading user B's hidden contribution to NOT_FOUND", async () => {
    const { repository, service } = createService();
    repository.getOwn.mockRejectedValueOnce(
      new RepositoryError("NOT_FOUND", "community_contributions.getOwn"),
    );

    await expect(service.getOwn(contributionId)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("lists own history without accepting arbitrary user_id", async () => {
    const { repository, service } = createService();

    await expect(
      service.listOwnHistory({
        page: "1",
        limit: "20",
        status: "PENDING",
        user_id: "attacker",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    await expect(
      service.listOwnHistory({
        page: "1",
        limit: "20",
        report_type: "CROSSING",
      }),
    ).resolves.toMatchObject({
      summary: {
        contributionPoints: 0,
      },
    });
    expect(repository.listOwnHistory).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      reportType: "CROSSING",
      status: undefined,
    });
  });

  it("lists approved map features through bounded bbox parameters only", async () => {
    const { repository, service } = createService();

    await expect(
      service.listMapFeatures({
        min_lng: "106.7",
        min_lat: "-6.3",
        max_lng: "106.9",
        max_lat: "-6.1",
        limit: "100",
        status: "PENDING",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    await expect(
      service.listMapFeatures({
        min_lng: "106.7",
        min_lat: "-6.3",
        max_lng: "109.1",
        max_lat: "-6.1",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    await expect(
      service.listMapFeatures({
        min_lng: "106.7",
        min_lat: "-6.3",
        max_lng: "106.9",
        max_lat: "-6.1",
      }),
    ).resolves.toEqual([]);

    expect(repository.listMapFeatures).toHaveBeenCalledWith({
      minLng: 106.7,
      minLat: -6.3,
      maxLng: 106.9,
      maxLat: -6.1,
      limit: 250,
    });
  });

  it("lists moderation queue with admin filters only", async () => {
    const { repository, service } = createService();

    await expect(
      service.listModerationQueue({
        page: "1",
        limit: "20",
        status: "PENDING",
        account_role: "USER",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    await expect(
      service.listModerationQueue({
        page: "2",
        limit: "10",
        status: "REJECTED",
        report_type: "CROSSING",
      }),
    ).resolves.toMatchObject({
      pagination: {
        page: 1,
      },
    });

    expect(repository.listModerationQueue).toHaveBeenCalledWith({
      page: 2,
      limit: 10,
      status: "REJECTED",
      reportType: "CROSSING",
    });
  });

  it("requires a bounded rejection reason for admin rejection", async () => {
    const { repository, service } = createService();

    await expect(
      service.reject(contributionId, {
        reason: "CONFIRMED",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    await expect(
      service.reject(contributionId, {
        reason: "INVALID_LOCATION",
      }),
    ).resolves.toMatchObject({
      status: "REJECTED",
      reviewReason: "INVALID_LOCATION",
    });

    expect(repository.reject).toHaveBeenCalledWith(
      contributionId,
      "INVALID_LOCATION",
    );
  });
});
