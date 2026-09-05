import { describe, expect, it, vi } from "vitest";
import { SupabaseCommunityRepository } from "@/src/features/community";

describe("friendship read projection", () => {
  const query = { view: "FRIENDS" as const, limit: 10, page: 2 };

  it("maps a populated authorized RPC result without adding friendships", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ friendship_id: "test-friendship", user_id: "test-user", display_name: "Test User", avatar_url: null, status: "ACCEPTED", direction: "NONE", updated_at: "2026-09-05T00:00:00Z", total_count: 11 }], error: null });
    const result = await new SupabaseCommunityRepository({ rpc } as never).listFriendships(query);
    expect(result).toEqual({ items: [{ friendshipId: "test-friendship", userId: "test-user", displayName: "Test User", avatarUrl: null, status: "ACCEPTED", direction: "NONE", updatedAt: "2026-09-05T00:00:00Z" }], page: 2, limit: 10, total: 11 });
    expect(rpc).toHaveBeenCalledExactlyOnceWith("list_community_friendships_v1", { p_view: "FRIENDS", p_limit: 10, p_offset: 10 });
  });

  it("keeps a real empty RPC result empty", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
    const result = await new SupabaseCommunityRepository({ rpc } as never).listFriendships(query);
    expect(result.items).toEqual([]); expect(result.total).toBe(0);
  });

  it("does not disguise a database failure as an empty list and permits a later retry", async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: null, error: { code: "42702", message: "ambiguous column" } }).mockResolvedValueOnce({ data: [], error: null });
    const repository = new SupabaseCommunityRepository({ rpc } as never);
    await expect(repository.listFriendships(query)).rejects.toThrow();
    await expect(repository.listFriendships(query)).resolves.toMatchObject({ items: [], total: 0 });
  });
});
