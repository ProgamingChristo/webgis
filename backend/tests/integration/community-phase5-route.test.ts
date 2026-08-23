import { describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

import { createCommunityCommentsHandlers } from "@/app/api/community/posts/[postId]/comments/route";
import { createCommunityPostDetailHandler } from "@/app/api/community/posts/[postId]/route";
import { createCommunityReactionHandlers } from "@/app/api/community/posts/[postId]/reactions/[reactionType]/route";

const postId = "11111111-1111-4111-8111-111111111111";

function createContext(overrides: Record<string, string> = {}) {
  return {
    params: Promise.resolve({
      postId,
      ...overrides,
    }),
  };
}

function createReactionContext(reactionType: string) {
  return {
    params: Promise.resolve({
      postId,
      reactionType,
    }),
  };
}

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

describe("Community Phase 5 routes", () => {
  it("returns post detail DTO with reactions and reply count", async () => {
    const post = {
      id: postId,
      authorId: "user-2",
      author: {
        id: "user-2",
        displayName: "Revan",
        avatarUrl: null,
      },
      content: "Post detail",
      type: "GENERAL",
      category: null,
      location: null,
      media: [],
      reactions: {
        helpfulCount: 1,
        interestingCount: 2,
        confirmedCount: 3,
        viewerReactions: ["HELPFUL"],
      },
      replyCount: 4,
      status: "VISIBLE",
      createdAt: "2026-08-23T00:00:00.000Z",
      updatedAt: "2026-08-23T00:00:00.000Z",
    };
    const service = {
      getPost: vi.fn().mockResolvedValue(post),
    };
    const dependencies = createDependencies(service);
    const handler = createCommunityPostDetailHandler(dependencies);

    const response = await handler(
      createRequest(`http://localhost/api/community/posts/${postId}`),
      createContext(),
    );

    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        id: postId,
        reactions: {
          confirmedCount: 3,
        },
        replyCount: 4,
      },
    });
    expect(response.status).toBe(200);
    expect(service.getPost).toHaveBeenCalledWith(postId);
  });

  it("lists comments and creates a reply using authenticated author", async () => {
    const comment = {
      id: "comment-1",
      postId,
      authorId: "user-1",
      author: {
        id: "user-1",
        displayName: "Revan",
        avatarUrl: null,
      },
      parentCommentId: null,
      content: "Aku juga lihat 👍",
      depth: 0,
      createdAt: "2026-08-23T00:00:00.000Z",
      updatedAt: "2026-08-23T00:00:00.000Z",
    };
    const service = {
      listComments: vi.fn().mockResolvedValue({
        items: [comment],
        page: 1,
        limit: 20,
        total: 1,
      }),
      createComment: vi.fn().mockResolvedValue({
        ...comment,
        id: "comment-2",
        parentCommentId: "comment-1",
        depth: 1,
      }),
    };
    const handlers = createCommunityCommentsHandlers(
      createDependencies(service),
    );

    const listResponse = await handlers.GET(
      createRequest(
        `http://localhost/api/community/posts/${postId}/comments?page=1`,
      ),
      createContext(),
    );
    const createResponse = await handlers.POST(
      createRequest(`http://localhost/api/community/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          content: "Betul",
          parent_comment_id: "comment-1",
        }),
      }),
      createContext(),
    );

    expect(listResponse.status).toBe(200);
    expect(createResponse.status).toBe(201);
    expect(service.listComments).toHaveBeenCalledWith(postId, {
      page: "1",
    });
    expect(service.createComment).toHaveBeenCalledWith("user-1", postId, {
      content: "Betul",
      parent_comment_id: "comment-1",
    });
  });

  it("adds and removes post reactions by route params", async () => {
    const summary = {
      helpfulCount: 1,
      interestingCount: 0,
      confirmedCount: 0,
      viewerReactions: ["HELPFUL"],
    };
    const service = {
      addReaction: vi.fn().mockResolvedValue(summary),
      removeReaction: vi.fn().mockResolvedValue({
        ...summary,
        helpfulCount: 0,
        viewerReactions: [],
      }),
    };
    const handlers = createCommunityReactionHandlers(
      createDependencies(service),
    );
    const context = createReactionContext("HELPFUL");

    const putResponse = await handlers.PUT(
      createRequest(
        `http://localhost/api/community/posts/${postId}/reactions/HELPFUL`,
        { method: "PUT" },
      ),
      context,
    );
    const deleteResponse = await handlers.DELETE(
      createRequest(
        `http://localhost/api/community/posts/${postId}/reactions/HELPFUL`,
        { method: "DELETE" },
      ),
      context,
    );

    expect(putResponse.status).toBe(200);
    expect(deleteResponse.status).toBe(200);
    expect(service.addReaction).toHaveBeenCalledWith(postId, "HELPFUL");
    expect(service.removeReaction).toHaveBeenCalledWith(postId, "HELPFUL");
  });
});
