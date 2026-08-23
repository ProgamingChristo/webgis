import { describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

import { createCommunityFeedHandler } from "@/app/api/community/feed/route";

describe("GET /api/community/feed", () => {
  it("requires auth handoff and returns a list envelope with public location only", async () => {
    const requestId = "a4b29232-2bd3-423a-b7b0-f87a7a9ba6ad";
    const post = {
      id: "post-1",
      authorId: "user-1",
      author: {
        id: "user-1",
        displayName: "Revan",
        avatarUrl: null,
      },
      content: "Nemunya warung murah 🍜🔥 Mantap 👍",
      location: {
        longitude: 106.827,
        latitude: -6.175,
        visibility: "APPROXIMATE",
      },
      status: "VISIBLE",
      media: [],
      createdAt: "2026-08-23T00:00:00.000Z",
      updatedAt: "2026-08-23T00:00:00.000Z",
    };
    const service = {
      listFeed: vi.fn().mockResolvedValue({
        items: [post],
        page: 1,
        limit: 20,
        total: 1,
      }),
    };
    const dependencies = {
      authenticate: vi.fn().mockResolvedValue("user-1"),
      createService: vi.fn(() => service),
      rateLimiter: {
        checkLimit: vi.fn().mockResolvedValue(undefined),
      },
    };

    const handler = createCommunityFeedHandler(dependencies);
    const response = await handler(
      new Request("http://localhost/api/community/feed", {
        headers: {
          "x-request-id": requestId,
          authorization: "Bearer test-token",
        },
      }) as NextRequest,
    );

    await expect(response.json()).resolves.toEqual({
      success: true,
      data: [post],
      meta: {
        page: 1,
        limit: 20,
        total: 1,
        total_pages: 1,
      },
      request_id: requestId,
    });
    expect(response.status).toBe(200);
    expect(dependencies.authenticate).toHaveBeenCalledOnce();
    expect(dependencies.rateLimiter.checkLimit).toHaveBeenCalledWith(
      expect.any(Request),
      "user-1:community:feed",
    );
    expect(service.listFeed).toHaveBeenCalledWith({});
  });
});
