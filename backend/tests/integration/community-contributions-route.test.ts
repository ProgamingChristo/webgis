import { describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

import { createCommunityContributionDetailHandler } from "@/app/api/community/contributions/[contributionId]/route";
import {
  createCommunityContributionHistoryHandler,
  createCommunityContributionsHandler,
} from "@/app/api/community/contributions/route";
import { createCommunityContributionMapHandler } from "@/app/api/community/contributions/map/route";
import { ApplicationError } from "@/src/lib/errors";

const authorId = "99999999-aaaa-4bbb-8ccc-dddddddddddd";
const contributionId = "11111111-2222-4333-8444-555555555555";
const merchantId = "22222222-3333-4444-8555-666666666666";
const timestamp = "2026-08-24T09:30:00.000Z";

const contribution = {
  id: contributionId,
  authorId,
  reportType: "SIDEWALK_OBSTRUCTION",
  status: "PENDING",
  location: {
    longitude: 106.8272,
    latitude: -6.1754,
  },
  observedAt: timestamp,
  reportData: {
    details: "Motorbike blocks the sidewalk",
  },
  targetMerchantId: null,
  reportedNewLocation: null,
  submittedAt: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp,
};

function createRequest(url: string, init: RequestInit = {}) {
  const request = new Request(url, {
    ...init,
    headers: {
      authorization: "Bearer test-token",
      ...(init.headers ?? {}),
    },
  }) as NextRequest;

  Object.defineProperty(request, "nextUrl", {
    value: new URL(url),
  });

  return request;
}

function createDependencies(service: any, authenticate = vi.fn().mockResolvedValue(authorId)) {
  return {
    authenticate,
    createService: vi.fn(() => service),
    rateLimiter: {
      checkLimit: vi.fn().mockResolvedValue(undefined),
    },
  };
}

describe("Community contribution routes", () => {
  it("rejects unauthenticated create requests before service work", async () => {
    const service = {
      create: vi.fn(),
    };
    const handler = createCommunityContributionsHandler(
      createDependencies(
        service,
        vi.fn().mockRejectedValue(new ApplicationError("UNAUTHORIZED")),
      ),
    );

    const response = await handler(
      createRequest("http://localhost/api/community/contributions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          report_type: "SIDEWALK_OBSTRUCTION",
          location: contribution.location,
          observed_at: timestamp,
          details: "Blocked sidewalk",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(service.create).not.toHaveBeenCalled();
  });

  it("creates an authenticated pending contribution with server-derived author", async () => {
    const service = {
      create: vi.fn().mockResolvedValue(contribution),
    };
    const handler = createCommunityContributionsHandler(
      createDependencies(service),
    );
    const payload = {
      report_type: "SIDEWALK_OBSTRUCTION",
      location: contribution.location,
      observed_at: timestamp,
      details: "Motorbike blocks the sidewalk",
      author_id: "attacker",
      status: "APPROVED",
    };

    const response = await handler(
      createRequest("http://localhost/api/community/contributions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      success: true,
      data: {
        authorId,
        status: "PENDING",
      },
    });
    expect(service.create).toHaveBeenCalledWith(authorId, payload);
  });

  it("returns validation errors for forced system fields rejected by the service", async () => {
    const service = {
      create: vi.fn().mockRejectedValue(new ApplicationError("VALIDATION_ERROR")),
    };
    const handler = createCommunityContributionsHandler(
      createDependencies(service),
    );

    const response = await handler(
      createRequest("http://localhost/api/community/contributions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          report_type: "CROSSING",
          location: contribution.location,
          observed_at: timestamp,
          details: "Needs crossing",
          points: 999,
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns authenticated contribution history with server-derived user scope", async () => {
    const history = {
      items: [
        {
          id: contributionId,
          reportType: "SIDEWALK_OBSTRUCTION",
          status: "PENDING",
          observedAt: timestamp,
          submittedAt: timestamp,
          createdAt: timestamp,
          locationSummary: "Koordinat -6.1754, 106.8272",
          targetMerchantId: null,
          targetName: null,
          pointsAwarded: 0,
        },
      ],
      summary: {
        totalContributions: 1,
        pendingCount: 1,
        approvedCount: 0,
        rejectedCount: 0,
        contributionPoints: 0,
      },
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasMore: false,
      },
    };
    const service = {
      listOwnHistory: vi.fn().mockResolvedValue(history),
    };
    const handler = createCommunityContributionHistoryHandler(
      createDependencies(service),
    );

    const response = await handler(
      createRequest(
        "http://localhost/api/community/contributions?page=1&limit=20&user_id=attacker",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject(history);
    expect(service.listOwnHistory).toHaveBeenCalledWith({
      page: "1",
      limit: "20",
      status: undefined,
      report_type: undefined,
    });
  });

  it("returns approved contribution map projections using bbox query only", async () => {
    const mapFeature = {
      id: contributionId,
      reportType: "MERCHANT_PRICE_CHANGED",
      observedAt: timestamp,
      reviewedAt: timestamp,
      targetMerchantId: merchantId,
      targetName: "Warung A",
      location: {
        longitude: 106.828,
        latitude: -6.176,
      },
      projectionSource: "CANONICAL_MERCHANT_LOCATION",
    };
    const service = {
      listMapFeatures: vi.fn().mockResolvedValue([mapFeature]),
    };
    const handler = createCommunityContributionMapHandler(
      createDependencies(service),
    );

    const response = await handler(
      createRequest(
        "http://localhost/api/community/contributions/map?min_lng=106.7&min_lat=-6.3&max_lng=106.9&max_lat=-6.1&limit=250&status=PENDING&author_id=attacker",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      data: [mapFeature],
      meta: {
        page: 1,
        limit: 1,
        total: 1,
        total_pages: 1,
      },
    });
    expect(service.listMapFeatures).toHaveBeenCalledWith({
      min_lng: "106.7",
      min_lat: "-6.3",
      max_lng: "106.9",
      max_lat: "-6.1",
      limit: "250",
    });
  });

  it.each([
    ["CONTRIBUTION_RATE_LIMITED", 429],
    ["CONTRIBUTION_DUPLICATE", 409],
    ["INVALID_OBSERVATION_TIME", 400],
    ["INVALID_TARGET_LOCATION", 400],
  ] as const)(
    "returns Phase 3 error %s with status %s",
    async (code, expectedStatus) => {
      const service = {
        create: vi.fn().mockRejectedValue(new ApplicationError(code)),
      };
      const handler = createCommunityContributionsHandler(
        createDependencies(service),
      );

      const response = await handler(
        createRequest("http://localhost/api/community/contributions", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            report_type: "SIDEWALK_OBSTRUCTION",
            location: contribution.location,
            observed_at: timestamp,
            details: "Motorbike blocks the sidewalk",
          }),
        }),
      );
      const body = await response.json();

      expect(response.status).toBe(expectedStatus);
      expect(body.error.code).toBe(code);
    },
  );

  it("returns own contribution detail", async () => {
    const service = {
      getOwn: vi.fn().mockResolvedValue(contribution),
    };
    const handler = createCommunityContributionDetailHandler(
      createDependencies(service),
    );

    const response = await handler(
      createRequest(`http://localhost/api/community/contributions/${contributionId}`),
      {
        params: Promise.resolve({
          contributionId,
        }),
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.id).toBe(contributionId);
    expect(service.getOwn).toHaveBeenCalledWith(contributionId);
  });

  it("does not expose another user's hidden contribution", async () => {
    const service = {
      getOwn: vi.fn().mockRejectedValue(new ApplicationError("NOT_FOUND")),
    };
    const handler = createCommunityContributionDetailHandler(
      createDependencies(service),
    );

    const response = await handler(
      createRequest(`http://localhost/api/community/contributions/${contributionId}`),
      {
        params: Promise.resolve({
          contributionId,
        }),
      },
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
