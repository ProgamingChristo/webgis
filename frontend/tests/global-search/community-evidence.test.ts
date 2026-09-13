import { describe, expect, it } from "vitest";
import { communityEvidenceNearMerchant } from "@/src/features/global-search/community-evidence";
import type { CommunityFeedItem } from "@/src/features/community/types/community.types";

function post(overrides: Partial<CommunityFeedItem>): CommunityFeedItem {
  return {
    id: "post",
    authorId: "author",
    author: { id: "author", displayName: "Warga", avatarUrl: null },
    content: "Trotoar mudah dilalui.",
    type: "GENERAL",
    category: null,
    location: { longitude: 106.8167, latitude: -6.2, visibility: "EXACT" },
    media: [],
    reactions: { helpfulCount: 1, interestingCount: 0, confirmedCount: 0, viewerReactions: [] },
    replyCount: 0,
    status: "VISIBLE",
    createdAt: "2026-09-12T00:00:00.000Z",
    updatedAt: "2026-09-12T00:00:00.000Z",
    ...overrides,
  };
}

describe("place Community evidence", () => {
  it("keeps only visible, non-empty, exact nearby posts and labels them as spatial context", () => {
    const merchant = { longitude: 106.8167, latitude: -6.2 };
    const result = communityEvidenceNearMerchant([
      post({ id: "near" }),
      post({ id: "approximate", location: { longitude: 106.8167, latitude: -6.2, visibility: "APPROXIMATE" } }),
      post({ id: "far", location: { longitude: 107, latitude: -6.2, visibility: "EXACT" } }),
      post({ id: "blank", content: "   " }),
    ], merchant);
    expect(result).toEqual([expect.objectContaining({ id: "near", relation: "NEARBY_EXACT" })]);
  });

  it("orders useful notes deterministically and caps the result", () => {
    const merchant = { longitude: 106.8167, latitude: -6.2 };
    const result = communityEvidenceNearMerchant([
      post({ id: "a", reactions: { helpfulCount: 1, interestingCount: 0, confirmedCount: 0, viewerReactions: [] } }),
      post({ id: "b", reactions: { helpfulCount: 5, interestingCount: 0, confirmedCount: 0, viewerReactions: [] } }),
      post({ id: "c", reactions: { helpfulCount: 3, interestingCount: 0, confirmedCount: 0, viewerReactions: [] } }),
      post({ id: "d", reactions: { helpfulCount: 2, interestingCount: 0, confirmedCount: 0, viewerReactions: [] } }),
    ], merchant);
    expect(result.map((item) => item.id)).toEqual(["b", "c", "d"]);
  });

  it("keeps signed Community media separate with its nearby evidence", () => {
    const result = communityEvidenceNearMerchant([post({
      media: [{ id: "media", type: "IMAGE", url: "https://storage.example.test/signed.webp", width: 800, height: 600, mimeType: "image/webp", sizeBytes: 1024 }],
    })], { longitude: 106.8167, latitude: -6.2 });
    expect(result[0]?.mediaUrls).toEqual(["https://storage.example.test/signed.webp"]);
    expect(result[0]?.relation).toBe("NEARBY_EXACT");
  });
});
