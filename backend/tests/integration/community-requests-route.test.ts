import { describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

import { createCommunityRequestDetailHandler } from "@/app/api/community/requests/[requestId]/route";
import { createCommunityRequestsHandlers } from "@/app/api/community/requests/route";

const requestId = "11111111-2222-4333-8444-555555555555";

function createRequest(url: string, init: RequestInit = {}) {
  return new Request(url, {
    ...init,
    headers: {
      authorization: "Bearer test-token",
      ...(init.headers ?? {}),
    },
  }) as NextRequest;
}

function createContext() {
  return {
    params: Promise.resolve({
      requestId,
    }),
  };
}

function createDependencies(service: any) {
  return {
    authenticate: vi.fn().mockResolvedValue("user-1"),
    createService: vi.fn(() => service),
    rateLimiter: {
      checkLimit: vi.fn().mockResolvedValue(undefined),
    },
  };
}

describe("Community commuter request routes", () => {
  const item = {
    id: requestId,
    authorId: "user-1",
    author: {
      id: "user-1",
      displayName: "Revan",
      avatarUrl: null,
    },
    title: "Paket makan mahasiswa",
    description: "Butuh nasi dan minum",
    category: "FOOD",
    maxBudget: 20000,
    location: {
      longitude: 106.827,
      latitude: -6.175,
      visibility: "APPROXIMATE",
    },
    radiusMeters: 1000,
    status: "ACTIVE",
    distanceMeters: null,
    createdAt: "2026-08-23T00:00:00.000Z",
    updatedAt: "2026-08-23T00:00:00.000Z",
    expiresAt: "2026-08-30T00:00:00.000Z",
  };

  it("creates and lists structured commuter requests", async () => {
    const service = {
      createCommuterRequest: vi.fn().mockResolvedValue(item),
      listCommuterRequests: vi.fn().mockResolvedValue({
        items: [item],
        page: 1,
        limit: 20,
        total: 1,
      }),
    };
    const handlers = createCommunityRequestsHandlers(
      createDependencies(service),
    );
    const payload = {
      title: "Paket makan mahasiswa",
      description: "Butuh nasi dan minum",
      category: "FOOD",
      max_budget: 20000,
      location: {
        longitude: 106.8272,
        latitude: -6.1754,
        visibility: "APPROXIMATE",
      },
      radius_meters: 1000,
      expires_in_days: 7,
    };

    const createResponse = await handlers.POST(
      createRequest("http://localhost/api/community/requests", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
    );
    const listResponse = await handlers.GET(
      createRequest(
        "http://localhost/api/community/requests?category=FOOD&longitude=106.8272&latitude=-6.1754&radius_meters=1000",
      ),
    );

    expect(createResponse.status).toBe(201);
    expect(listResponse.status).toBe(200);
    expect(service.createCommuterRequest).toHaveBeenCalledWith(
      "user-1",
      payload,
    );
    expect(service.listCommuterRequests).toHaveBeenCalledWith({
      category: "FOOD",
      longitude: "106.8272",
      latitude: "-6.1754",
      radius_meters: "1000",
    });
  });

  it("returns commuter request detail", async () => {
    const service = {
      getCommuterRequest: vi.fn().mockResolvedValue(item),
    };
    const handler = createCommunityRequestDetailHandler(
      createDependencies(service),
    );

    const response = await handler(
      createRequest(`http://localhost/api/community/requests/${requestId}`),
      createContext(),
    );

    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        id: requestId,
        title: "Paket makan mahasiswa",
      },
    });
    expect(response.status).toBe(200);
    expect(service.getCommuterRequest).toHaveBeenCalledWith(requestId);
  });
});
