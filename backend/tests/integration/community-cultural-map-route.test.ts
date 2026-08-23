import { describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

import { createCommunityCulturalMapHandler } from "@/app/api/community/cultural-map/route";

function createRequest(url: string, init: RequestInit = {}) {
  return new Request(url, {
    ...init,
    headers: {
      authorization: "Bearer test-token",
      ...(init.headers ?? {}),
    },
  }) as NextRequest;
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

describe("GET /api/community/cultural-map", () => {
  it("lists cultural findings with bbox and category filters", async () => {
    const finding = {
      id: "post-1",
      authorId: "user-1",
      author: {
        id: "user-1",
        displayName: "Revan",
        avatarUrl: null,
      },
      content: "Warung soto lama",
      type: "FINDING",
      category: "LEGENDARY_EATERY",
      location: {
        longitude: 106.827,
        latitude: -6.175,
        visibility: "APPROXIMATE",
      },
      confirmedCount: 3,
      replyCount: 2,
      createdAt: "2026-08-23T00:00:00.000Z",
    };
    const service = {
      listCulturalMap: vi.fn().mockResolvedValue([finding]),
    };
    const dependencies = createDependencies(service);
    const handler = createCommunityCulturalMapHandler(dependencies);

    const response = await handler(
      createRequest(
        "http://localhost/api/community/cultural-map?west=106.7&south=-6.3&east=106.9&north=-6.1&categories=LEGENDARY_EATERY",
      ),
    );

    await expect(response.json()).resolves.toEqual({
      success: true,
      data: [finding],
      meta: {
        page: 1,
        limit: 1,
        total: 1,
        total_pages: 1,
      },
      request_id: expect.any(String),
    });
    expect(response.status).toBe(200);
    expect(service.listCulturalMap).toHaveBeenCalledWith({
      west: "106.7",
      south: "-6.3",
      east: "106.9",
      north: "-6.1",
      categories: ["LEGENDARY_EATERY"],
    });
  });
});
