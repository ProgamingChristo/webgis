import type { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createCommunityPostDeleteHandler } from "@/app/api/community/posts/[postId]/route";
import { ApplicationError } from "@/src/lib/errors";

const postId = "11111111-1111-4111-8111-111111111111";
const request = () => new Request(`http://localhost/api/community/posts/${postId}`, {
  method: "DELETE", headers: { authorization: "Bearer test-token" },
}) as NextRequest;
const context = { params: Promise.resolve({ postId }) };
function dependencies(overrides: Record<string, unknown> = {}) {
  const service = { deletePost: vi.fn().mockResolvedValue({ deletionActorRole: "OWNER" }), getPost: vi.fn() };
  return { service, value: {
    authenticate: vi.fn().mockResolvedValue("user-1"),
    createService: vi.fn(() => service),
    rateLimiter: { checkLimit: vi.fn().mockResolvedValue(undefined) },
    ...overrides,
  } };
}

describe("DELETE /api/community/posts/:postId", () => {
  it.each(["OWNER", "ADMIN"] as const)("returns an auditable %s deletion classification", async (role) => {
    const deps = dependencies();
    deps.service.deletePost.mockResolvedValue({ deletionActorRole: role });
    const response = await createCommunityPostDeleteHandler(deps.value)(request(), context);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true, data: { deletionActorRole: role } });
    expect(deps.service.deletePost).toHaveBeenCalledWith(postId);
  });

  it("rejects anonymous deletion before repository access", async () => {
    const deps = dependencies({ authenticate: vi.fn().mockRejectedValue(new ApplicationError("UNAUTHORIZED")) });
    const response = await createCommunityPostDeleteHandler(deps.value)(request(), context);
    expect(response.status).toBe(401);
    expect(deps.service.deletePost).not.toHaveBeenCalled();
  });

  it("preserves a server-side forged-other-user denial", async () => {
    const deps = dependencies();
    deps.service.deletePost.mockRejectedValue(new ApplicationError("FORBIDDEN"));
    const response = await createCommunityPostDeleteHandler(deps.value)(request(), context);
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ success: false, error: { code: "FORBIDDEN" } });
  });
});
