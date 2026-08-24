import { describe, expect, it } from "vitest";

import {
  COMMUNITY_COMMENT_MAX_LENGTH,
  COMMUNITY_POST_MAX_LENGTH,
  communityCommentContentSchema,
  communityCommentQuerySchema,
  communityCulturalMapQuerySchema,
  commuterRequestCategorySchema,
  commuterRequestQuerySchema,
  communityFeedQuerySchema,
  communityFindingCategorySchema,
  communityLocationInputSchema,
  communityPostContentSchema,
  communityPostTypeSchema,
  communityReactionTypeSchema,
  actOnCommunityFriendshipSchema,
  communityFriendshipListQuerySchema,
  createCommuterRequestSchema,
  createCommunityCommentSchema,
  createCommunityFriendRequestSchema,
  createCommunityPostSchema,
  createCommunityReportSchema,
  createCommunityUmkmResponseSchema,
  communityDemandSignalQuerySchema,
  communityNotificationQuerySchema,
  moderateCommunityReportSchema,
} from "@/src/features/community";

describe("Community schemas", () => {
  it("keeps post content Unicode and emoji safe", () => {
    const content = "Nemunya warung murah 🍜🔥 Mantap 👍";

    expect(communityPostContentSchema.parse(content)).toBe(content);
  });

  it("accepts text-only, emoji, and optional location posts", () => {
    const content = "Hari ini lewat area stasiun.\n\nKopi enak ☕ dekat stasiun.";

    expect(createCommunityPostSchema.parse({ content })).toEqual({
      content,
      type: "GENERAL",
    });

    expect(
      createCommunityPostSchema.parse({
        content: "Ada tempat menarik di sini 📍",
        location: {
          longitude: 106.8272,
          latitude: -6.1754,
          visibility: "APPROXIMATE",
        },
      }),
    ).toEqual({
      content: "Ada tempat menarik di sini 📍",
      type: "GENERAL",
      location: {
        longitude: 106.8272,
        latitude: -6.1754,
        visibility: "APPROXIMATE",
      },
    });
  });

  it("trims outer whitespace and rejects blank content", () => {
    expect(
      createCommunityPostSchema.parse({
        content: "  Warung ini murah banget 🍜🔥  ",
      }),
    ).toEqual({
      content: "Warung ini murah banget 🍜🔥",
      type: "GENERAL",
    });

    expect(() =>
      createCommunityPostSchema.parse({
        content: "",
      }),
    ).toThrow();

    expect(() =>
      createCommunityPostSchema.parse({
        content: "          ",
      }),
    ).toThrow();
  });

  it("accepts Temuan Komuter only with category and location", () => {
    expect(
      createCommunityPostSchema.parse({
        type: "FINDING",
        content: "Warung soto lama dekat stasiun",
        category: "LEGENDARY_EATERY",
        location: {
          longitude: 106.8272,
          latitude: -6.1754,
          visibility: "APPROXIMATE",
        },
      }),
    ).toEqual({
      type: "FINDING",
      content: "Warung soto lama dekat stasiun",
      category: "LEGENDARY_EATERY",
      location: {
        longitude: 106.8272,
        latitude: -6.1754,
        visibility: "APPROXIMATE",
      },
    });

    expect(() =>
      createCommunityPostSchema.parse({
        type: "FINDING",
        content: "Ada landmark baru",
        category: "LANDMARK",
      }),
    ).toThrow();

    expect(() =>
      createCommunityPostSchema.parse({
        type: "FINDING",
        content: "Ada landmark baru",
        location: {
          longitude: 106.8272,
          latitude: -6.1754,
          visibility: "APPROXIMATE",
        },
      }),
    ).toThrow();

    expect(() =>
      createCommunityPostSchema.parse({
        type: "GENERAL",
        content: "Post umum",
        category: "LOCAL_FOOD",
      }),
    ).toThrow();
  });

  it("rejects oversized content", () => {
    expect(() =>
      createCommunityPostSchema.parse({
        content: "a".repeat(COMMUNITY_POST_MAX_LENGTH + 1),
      }),
    ).toThrow();
  });

  it("validates coordinate bounds and finite JSON numbers", () => {
    for (const longitude of [-180, 180]) {
      expect(
        communityLocationInputSchema.parse({
          longitude,
          latitude: 0,
          visibility: "APPROXIMATE",
        }).longitude,
      ).toBe(longitude);
    }

    for (const latitude of [-90, 90]) {
      expect(
        communityLocationInputSchema.parse({
          longitude: 0,
          latitude,
          visibility: "EXACT",
        }).latitude,
      ).toBe(latitude);
    }

    for (const location of [
      { longitude: -180.1, latitude: 0, visibility: "APPROXIMATE" },
      { longitude: 180.1, latitude: 0, visibility: "APPROXIMATE" },
      { longitude: 0, latitude: -90.1, visibility: "APPROXIMATE" },
      { longitude: 0, latitude: 90.1, visibility: "APPROXIMATE" },
      { longitude: Number.NaN, latitude: 0, visibility: "APPROXIMATE" },
      { longitude: Number.POSITIVE_INFINITY, latitude: 0, visibility: "APPROXIMATE" },
      { longitude: 0, latitude: Number.NEGATIVE_INFINITY, visibility: "APPROXIMATE" },
      { longitude: "106.8", latitude: -6.2, visibility: "APPROXIMATE" },
    ]) {
      expect(() => communityLocationInputSchema.parse(location)).toThrow();
    }
  });

  it("rejects unknown post and location fields", () => {
    for (const field of [
      "author_id",
      "account_role",
      "role",
      "stakeholder_mode",
      "latitude",
      "longitude",
      "media",
      "photo_url",
      "geometry",
      "location_visibility",
    ]) {
      expect(() =>
        createCommunityPostSchema.parse({
          content: "Valid content",
          [field]: "malicious",
        }),
      ).toThrow();
    }

    expect(() =>
      createCommunityPostSchema.parse({
        content: "Valid content",
        location: {
          longitude: 106.8272,
          latitude: -6.1754,
          visibility: "APPROXIMATE",
          geometry: "POINT(106.8272 -6.1754)",
        },
      }),
    ).toThrow();
  });

  it("normalizes feed pagination defaults and bounds", () => {
    expect(communityFeedQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 20,
    });

    expect(
      communityFeedQuerySchema.parse({
        page: "2",
        limit: "10",
      }),
    ).toEqual({
      page: 2,
      limit: 10,
    });

    expect(() =>
      communityFeedQuerySchema.parse({
        limit: "51",
      }),
    ).toThrow();
  });

  it("restricts Phase 6 post types, categories, and map bbox", () => {
    expect(communityPostTypeSchema.parse("GENERAL")).toBe("GENERAL");
    expect(communityPostTypeSchema.parse("FINDING")).toBe("FINDING");
    expect(communityFindingCategorySchema.parse("LOCAL_HISTORY")).toBe(
      "LOCAL_HISTORY",
    );
    expect(() => communityPostTypeSchema.parse("REQUEST")).toThrow();
    expect(() => communityFindingCategorySchema.parse("PROMO")).toThrow();

    expect(
      communityFeedQuerySchema.parse({
        page: "1",
        limit: "10",
        type: "FINDING",
        category: "LANDMARK",
      }),
    ).toEqual({
      page: 1,
      limit: 10,
      type: "FINDING",
      category: "LANDMARK",
    });

    expect(
      communityCulturalMapQuerySchema.parse({
        west: "106.7",
        south: "-6.3",
        east: "106.9",
        north: "-6.1",
        categories: ["LANDMARK", "LOCAL_FOOD"],
      }),
    ).toEqual({
      west: 106.7,
      south: -6.3,
      east: 106.9,
      north: -6.1,
      categories: ["LANDMARK", "LOCAL_FOOD"],
      limit: 100,
    });

    expect(() =>
      communityCulturalMapQuerySchema.parse({
        west: "106.9",
        south: "-6.3",
        east: "106.7",
        north: "-6.1",
      }),
    ).toThrow();
    expect(() =>
      communityCulturalMapQuerySchema.parse({
        west: "106.7",
        south: "-6.1",
        east: "106.9",
        north: "-6.3",
      }),
    ).toThrow();
  });

  it("validates structured commuter requests", () => {
    expect(
      createCommuterRequestSchema.parse({
        title: "Paket makan mahasiswa",
        description: "Butuh nasi dan minum dekat kampus",
        category: "FOOD",
        max_budget: 20000,
        location: {
          longitude: 106.8272,
          latitude: -6.1754,
          visibility: "APPROXIMATE",
        },
        radius_meters: 1000,
        expires_in_days: 7,
      }),
    ).toEqual({
      title: "Paket makan mahasiswa",
      description: "Butuh nasi dan minum dekat kampus",
      category: "FOOD",
      max_budget: 20000,
      location: {
        longitude: 106.8272,
        latitude: -6.1754,
        visibility: "APPROXIMATE",
      },
      radius_meters: 1000,
      expires_in_days: 7,
    });

    for (const payload of [
      {
        description: "Butuh nasi",
        category: "FOOD",
        max_budget: 20000,
        location: {
          longitude: 106.8272,
          latitude: -6.1754,
          visibility: "APPROXIMATE",
        },
        radius_meters: 1000,
      },
      {
        title: "Paket makan",
        description: "Butuh nasi",
        category: "PROMO",
        max_budget: 20000,
        location: {
          longitude: 106.8272,
          latitude: -6.1754,
          visibility: "APPROXIMATE",
        },
        radius_meters: 1000,
      },
      {
        title: "Paket makan",
        description: "Butuh nasi",
        category: "FOOD",
        max_budget: 0,
        location: {
          longitude: 106.8272,
          latitude: -6.1754,
          visibility: "APPROXIMATE",
        },
        radius_meters: 1000,
      },
      {
        title: "Paket makan",
        description: "Butuh nasi",
        category: "FOOD",
        max_budget: 20000,
        radius_meters: 1000,
      },
      {
        title: "Paket makan",
        description: "Butuh nasi",
        category: "FOOD",
        max_budget: 20000,
        location: {
          longitude: 106.8272,
          latitude: -6.1754,
          visibility: "APPROXIMATE",
        },
        radius_meters: 9000,
      },
      {
        title: "Paket makan",
        description: "Butuh nasi",
        category: "FOOD",
        max_budget: 20000,
        location: {
          longitude: 106.8272,
          latitude: -6.1754,
          visibility: "APPROXIMATE",
        },
        radius_meters: 1000,
        author_id: "11111111-1111-4111-8111-111111111111",
      },
      {
        title: "Paket makan",
        description: "Butuh nasi",
        category: "FOOD",
        max_budget: 20000,
        location: {
          longitude: 106.8272,
          latitude: -6.1754,
          visibility: "APPROXIMATE",
        },
        radius_meters: 1000,
        status: "ACTIVE",
      },
      {
        title: "Paket makan",
        description: "Butuh nasi",
        category: "FOOD",
        max_budget: 20000,
        location: {
          longitude: 106.8272,
          latitude: -6.1754,
          visibility: "APPROXIMATE",
        },
        radius_meters: 1000,
        cluster_id: "future-phase",
      },
    ]) {
      expect(() => createCommuterRequestSchema.parse(payload)).toThrow();
    }
  });

  it("validates commuter request query and nearby coordinates", () => {
    expect(commuterRequestCategorySchema.parse("FOOD")).toBe("FOOD");
    expect(
      commuterRequestQuerySchema.parse({
        page: "1",
        limit: "10",
        category: "FOOD",
        longitude: "106.8272",
        latitude: "-6.1754",
        radius_meters: "1000",
      }),
    ).toEqual({
      page: 1,
      limit: 10,
      category: "FOOD",
      longitude: 106.8272,
      latitude: -6.1754,
      radius_meters: 1000,
    });

    expect(() =>
      commuterRequestQuerySchema.parse({
        longitude: "106.8272",
      }),
    ).toThrow();
  });

  it("validates demand signal query and UMKM response payload", () => {
    expect(
      communityDemandSignalQuerySchema.parse({
        page: "1",
        limit: "10",
        category: "FOOD",
      }),
    ).toEqual({
      page: 1,
      limit: 10,
      category: "FOOD",
    });

    expect(
      createCommunityUmkmResponseSchema.parse({
        merchant_id: "11111111-1111-4111-8111-111111111111",
        status: "PREPARING",
        message: "Sedang kami siapkan \u{1F35A}\u{1F964}",
      }),
    ).toEqual({
      merchant_id: "11111111-1111-4111-8111-111111111111",
      status: "PREPARING",
      message: "Sedang kami siapkan \u{1F35A}\u{1F964}",
    });

    for (const payload of [
      {
        merchant_id: "11111111-1111-4111-8111-111111111111",
        status: "DONE",
      },
      {
        merchant_id: "11111111-1111-4111-8111-111111111111",
        status: "PREPARING",
        responder_user_id: "22222222-2222-4222-8222-222222222222",
      },
      {
        merchant_id: "11111111-1111-4111-8111-111111111111",
        status: "PREPARING",
        merchant_name: "Nama palsu",
      },
      {
        merchant_id: "11111111-1111-4111-8111-111111111111",
        status: "PREPARING",
        message: "x".repeat(501),
      },
    ]) {
      expect(() => createCommunityUmkmResponseSchema.parse(payload)).toThrow();
    }
  });

  it("accepts emoji and multiline comment content", () => {
    const content = "Aku juga lihat tadi pagi.\nMasih buka 👍🔥";

    expect(communityCommentContentSchema.parse(content)).toBe(content);
    expect(createCommunityCommentSchema.parse({ content })).toEqual({
      content,
    });
    expect(
      createCommunityCommentSchema.parse({
        content: "Balas komentar ini",
        parent_comment_id: "11111111-1111-4111-8111-111111111111",
      }),
    ).toEqual({
      content: "Balas komentar ini",
      parent_comment_id: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("rejects invalid comment content and client-trusted fields", () => {
    expect(() =>
      createCommunityCommentSchema.parse({
        content: " ".repeat(8),
      }),
    ).toThrow();
    expect(() =>
      createCommunityCommentSchema.parse({
        content: "a".repeat(COMMUNITY_COMMENT_MAX_LENGTH + 1),
      }),
    ).toThrow();

    for (const field of [
      "author_id",
      "depth",
      "role",
      "account_role",
      "location",
      "media",
    ]) {
      expect(() =>
        createCommunityCommentSchema.parse({
          content: "Valid comment",
          [field]: "malicious",
        }),
      ).toThrow();
    }
  });

  it("normalizes comment pagination defaults and bounds", () => {
    expect(communityCommentQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 20,
    });
    expect(
      communityCommentQuerySchema.parse({
        page: "2",
        limit: "10",
      }),
    ).toEqual({
      page: 2,
      limit: 10,
    });
    expect(() =>
      communityCommentQuerySchema.parse({
        limit: "51",
      }),
    ).toThrow();
  });

  it("restricts Phase 5 reaction types", () => {
    for (const reactionType of ["HELPFUL", "INTERESTING", "CONFIRMED"]) {
      expect(communityReactionTypeSchema.parse(reactionType)).toBe(reactionType);
    }

    for (const reactionType of ["LIKE", "LOVE", "ADMIN_CONFIRMED", "VERIFIED"]) {
      expect(() => communityReactionTypeSchema.parse(reactionType)).toThrow();
    }
  });

  it("validates Phase 9 notifications, reports, and moderation actions", () => {
    expect(communityNotificationQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 20,
    });
    expect(
      createCommunityReportSchema.parse({
        target_type: "POST",
        target_id: "11111111-1111-4111-8111-111111111111",
        reason: "WRONG_LOCATION",
        details: "Koordinatnya bergeser",
      }),
    ).toEqual({
      target_type: "POST",
      target_id: "11111111-1111-4111-8111-111111111111",
      reason: "WRONG_LOCATION",
      details: "Koordinatnya bergeser",
    });
    expect(moderateCommunityReportSchema.parse({ action: "HIDE" })).toEqual({
      action: "HIDE",
    });
    expect(() =>
      createCommunityReportSchema.parse({
        target_type: "POST",
        target_id: "11111111-1111-4111-8111-111111111111",
        reason: "ADMIN_DELETE",
      }),
    ).toThrow();
  });

  it("validates Phase 10 friendship payloads without trusted client fields", () => {
    expect(
      createCommunityFriendRequestSchema.parse({
        user_id: "11111111-1111-4111-8111-111111111111",
      }),
    ).toEqual({
      user_id: "11111111-1111-4111-8111-111111111111",
    });
    expect(actOnCommunityFriendshipSchema.parse({ action: "ACCEPT" })).toEqual({
      action: "ACCEPT",
    });
    expect(communityFriendshipListQuerySchema.parse({})).toEqual({
      view: "FRIENDS",
      page: 1,
      limit: 20,
    });

    expect(() =>
      createCommunityFriendRequestSchema.parse({
        user_id: "11111111-1111-4111-8111-111111111111",
        requester_id: "22222222-2222-4222-8222-222222222222",
      }),
    ).toThrow();
    expect(() =>
      createCommunityFriendRequestSchema.parse({
        user_id: "11111111-1111-4111-8111-111111111111",
        status: "ACCEPTED",
      }),
    ).toThrow();
    expect(() =>
      actOnCommunityFriendshipSchema.parse({
        action: "FOLLOW",
      }),
    ).toThrow();
  });
});
