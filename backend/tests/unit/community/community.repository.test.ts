import { describe, expect, it, vi } from "vitest";

import { SupabaseCommunityRepository } from "@/src/features/community";

describe("SupabaseCommunityRepository", () => {
  it("creates location posts through parameterized RPC inputs", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "post-1",
        author_id: "user-1",
        post_type: "GENERAL",
        category: null,
        content: "Ada tempat menarik di sini 📍",
        created_at: "2026-08-23T00:00:00.000Z",
        updated_at: "2026-08-23T00:00:00.000Z",
        author_display_name: "Revan",
        author_avatar_url: null,
        location_longitude: 106.827,
        location_latitude: -6.175,
        location_visibility: "APPROXIMATE",
      },
      error: null,
    });
    const rpc = vi.fn().mockReturnValue({ single });
    const repository = new SupabaseCommunityRepository({
      rpc,
    } as any);

    await expect(
      repository.createPost({
        authorId: "user-1",
        content: "Ada tempat menarik di sini 📍",
        location: {
          longitude: 106.8272,
          latitude: -6.1754,
          visibility: "APPROXIMATE",
          accuracy_m: 18,
        },
      }),
    ).resolves.toMatchObject({
      location: {
        longitude: 106.827,
        latitude: -6.175,
        visibility: "APPROXIMATE",
      },
    });

    expect(rpc).toHaveBeenCalledWith(
      "create_community_post_v4",
      expect.objectContaining({
        p_content: "Ada tempat menarik di sini 📍",
        p_longitude: 106.8272,
        p_latitude: -6.1754,
        p_location_visibility: "APPROXIMATE",
        p_location_accuracy_m: 18,
        p_media_id: null,
        p_media_storage_path: null,
        p_media_mime_type: null,
        p_media_size_bytes: null,
        p_media_width: null,
        p_media_height: null,
        p_post_type: "GENERAL",
        p_category: null,
      }),
    );
  });

  it("lists feed through the public projection RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          id: "post-1",
          author_id: "user-1",
          post_type: "FINDING",
          category: "LANDMARK",
          content: "Ada tempat menarik di sini 📍",
          created_at: "2026-08-23T00:00:00.000Z",
          updated_at: "2026-08-23T00:00:00.000Z",
          author_display_name: "Revan",
          author_avatar_url: null,
          location_longitude: 106.827,
          location_latitude: -6.175,
          location_visibility: "APPROXIMATE",
          media_id: null,
          media_storage_path: null,
          media_mime_type: null,
          media_size_bytes: null,
          media_width: null,
          media_height: null,
          helpful_count: 2,
          interesting_count: 1,
          confirmed_count: 3,
          viewer_reactions: ["HELPFUL"],
          reply_count: 4,
          total_count: 1,
        },
      ],
      error: null,
    });
    const repository = new SupabaseCommunityRepository({
      rpc,
    } as any);

    await expect(
      repository.listFeed({
        page: 1,
        limit: 20,
        type: "FINDING",
        category: "LANDMARK",
      }),
    ).resolves.toEqual({
      items: [
        {
          id: "post-1",
          authorId: "user-1",
          author: {
            id: "user-1",
            displayName: "Revan",
            avatarUrl: null,
          },
          type: "FINDING",
          category: "LANDMARK",
          content: "Ada tempat menarik di sini 📍",
          location: {
            longitude: 106.827,
            latitude: -6.175,
            visibility: "APPROXIMATE",
          },
          media: [],
          reactions: {
            helpfulCount: 2,
            interestingCount: 1,
            confirmedCount: 3,
            viewerReactions: ["HELPFUL"],
          },
          replyCount: 4,
          status: "VISIBLE",
          createdAt: "2026-08-23T00:00:00.000Z",
          updatedAt: "2026-08-23T00:00:00.000Z",
        },
      ],
      page: 1,
      limit: 20,
      total: 1,
    });

    expect(rpc).toHaveBeenCalledWith("list_community_feed_v4", {
      p_limit: 20,
      p_offset: 0,
      p_post_type: "FINDING",
      p_category: "LANDMARK",
    });
  });

  it("reads post detail with reaction summary", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "11111111-1111-4111-8111-111111111111",
        author_id: "user-1",
        post_type: "GENERAL",
        category: null,
        content: "Detail post",
        created_at: "2026-08-23T00:00:00.000Z",
        updated_at: "2026-08-23T00:00:00.000Z",
        author_display_name: "Revan",
        author_avatar_url: null,
        location_longitude: null,
        location_latitude: null,
        location_visibility: null,
        media_id: null,
        media_storage_path: null,
        media_mime_type: null,
        media_size_bytes: null,
        media_width: null,
        media_height: null,
        helpful_count: 1,
        interesting_count: 2,
        confirmed_count: 3,
        viewer_reactions: ["CONFIRMED"],
        reply_count: 4,
        total_count: 1,
      },
      error: null,
    });
    const rpc = vi.fn().mockReturnValue({ single });
    const repository = new SupabaseCommunityRepository({ rpc } as any);

    await expect(
      repository.getPost("11111111-1111-4111-8111-111111111111"),
    ).resolves.toMatchObject({
      reactions: {
        helpfulCount: 1,
        interestingCount: 2,
        confirmedCount: 3,
        viewerReactions: ["CONFIRMED"],
      },
      replyCount: 4,
    });

    expect(rpc).toHaveBeenCalledWith("get_community_post_detail_v2", {
      p_post_id: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("lists cultural map findings through bbox RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          id: "post-1",
          author_id: "user-1",
          content: "Warung soto lama",
          post_type: "FINDING",
          category: "LEGENDARY_EATERY",
          created_at: "2026-08-23T00:00:00.000Z",
          author_display_name: "Revan",
          location_longitude: 106.827,
          location_latitude: -6.175,
          location_visibility: "APPROXIMATE",
          confirmed_count: 3,
          reply_count: 2,
        },
      ],
      error: null,
    });
    const repository = new SupabaseCommunityRepository({ rpc } as any);

    await expect(
      repository.listCulturalMap({
        west: 106.7,
        south: -6.3,
        east: 106.9,
        north: -6.1,
        categories: ["LEGENDARY_EATERY"],
        limit: 100,
      }),
    ).resolves.toEqual([
      {
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
      },
    ]);

    expect(rpc).toHaveBeenCalledWith("list_community_cultural_map_v1", {
      p_west: 106.7,
      p_south: -6.3,
      p_east: 106.9,
      p_north: -6.1,
      p_categories: ["LEGENDARY_EATERY"],
      p_limit: 100,
    });
  });

  it("creates, lists, and reads commuter requests through RPCs", async () => {
    const requestRow = {
      id: "request-1",
      author_id: "user-1",
      title: "Paket makan mahasiswa",
      description: "Butuh nasi dan minum",
      category: "FOOD",
      max_budget: 20000,
      location_longitude: 106.827,
      location_latitude: -6.175,
      location_visibility: "APPROXIMATE",
      radius_meters: 1000,
      status: "ACTIVE",
      created_at: "2026-08-23T00:00:00.000Z",
      updated_at: "2026-08-23T00:00:00.000Z",
      expires_at: "2026-08-30T00:00:00.000Z",
      author_display_name: "Revan",
      author_avatar_url: null,
      distance_meters: 532.4,
      total_count: 1,
    };
    const single = vi.fn().mockResolvedValue({
      data: requestRow,
      error: null,
    });
    const rpc = vi.fn((name: string) => {
      if (name === "create_commuter_request_v1") {
        return { single };
      }

      if (name === "get_commuter_request_detail_v1") {
        return { single };
      }

      return Promise.resolve({
        data: [requestRow],
        error: null,
      });
    });
    const repository = new SupabaseCommunityRepository({ rpc } as any);

    await expect(
      repository.createCommuterRequest({
        authorId: "user-1",
        requestId: "request-1",
        title: "Paket makan mahasiswa",
        description: "Butuh nasi dan minum",
        category: "FOOD",
        maxBudget: 20000,
        location: {
          longitude: 106.8272,
          latitude: -6.1754,
          visibility: "APPROXIMATE",
        },
        radiusMeters: 1000,
        expiresInDays: 7,
      }),
    ).resolves.toMatchObject({
      id: "request-1",
      category: "FOOD",
      maxBudget: 20000,
      distanceMeters: 532.4,
    });

    await expect(
      repository.listCommuterRequests({
        page: 1,
        limit: 20,
        category: "FOOD",
        longitude: 106.8272,
        latitude: -6.1754,
        radius_meters: 1000,
      }),
    ).resolves.toMatchObject({
      total: 1,
      items: [
        {
          id: "request-1",
          radiusMeters: 1000,
        },
      ],
    });

    await expect(repository.getCommuterRequest("request-1")).resolves.toMatchObject({
      id: "request-1",
      title: "Paket makan mahasiswa",
    });

    expect(rpc).toHaveBeenCalledWith("create_commuter_request_v1", {
      p_request_id: "request-1",
      p_title: "Paket makan mahasiswa",
      p_description: "Butuh nasi dan minum",
      p_category: "FOOD",
      p_max_budget: 20000,
      p_longitude: 106.8272,
      p_latitude: -6.1754,
      p_location_visibility: "APPROXIMATE",
      p_location_accuracy_m: null,
      p_radius_meters: 1000,
      p_expires_in_days: 7,
    });
    expect(rpc).toHaveBeenCalledWith("list_commuter_requests_v1", {
      p_limit: 20,
      p_offset: 0,
      p_category: "FOOD",
      p_longitude: 106.8272,
      p_latitude: -6.1754,
      p_radius_meters: 1000,
    });
    expect(rpc).toHaveBeenCalledWith("get_commuter_request_detail_v1", {
      p_request_id: "request-1",
    });
  });

  it("lists demand signals and upserts verified merchant responses through RPCs", async () => {
    const signalRow = {
      id: "signal-1",
      category: "FOOD",
      request_count: 3,
      budget_min: 15000,
      budget_max: 25000,
      budget_median: 20000,
      center_longitude: 106.827,
      center_latitude: -6.175,
      cluster_radius_meters: 1000,
      window_start: "2026-08-16T00:00:00.000Z",
      window_end: "2026-08-23T00:00:00.000Z",
      latest_activity_at: "2026-08-23T00:00:00.000Z",
      status: "ACTIVE",
      total_count: 1,
    };
    const responseRow = {
      id: "response-1",
      signal_id: "signal-1",
      merchant_id: "merchant-1",
      merchant_display_name: "Warung ABC",
      status: "PREPARING",
      message: "Kami sedang menyiapkan paket Rp18.000.",
      created_at: "2026-08-23T00:00:00.000Z",
      updated_at: "2026-08-23T00:00:00.000Z",
    };
    const signalSingle = vi.fn().mockResolvedValue({
      data: signalRow,
      error: null,
    });
    const responseSingle = vi.fn().mockResolvedValue({
      data: responseRow,
      error: null,
    });
    const rpc = vi.fn((name: string) => {
      if (name === "get_community_demand_signal_detail_v1") {
        return { single: signalSingle };
      }

      if (name === "upsert_community_demand_signal_response_v1") {
        return { single: responseSingle };
      }

      if (name === "list_community_response_merchants_v1") {
        return Promise.resolve({
          data: [{ id: "merchant-1", display_name: "Warung ABC" }],
          error: null,
        });
      }

      if (name === "list_community_demand_signal_responses_v1") {
        return Promise.resolve({
          data: [responseRow],
          error: null,
        });
      }

      return Promise.resolve({
        data: [signalRow],
        error: null,
      });
    });
    const repository = new SupabaseCommunityRepository({ rpc } as any);

    await expect(
      repository.listDemandSignals({ page: 1, limit: 20, category: "FOOD" }),
    ).resolves.toMatchObject({
      total: 1,
      items: [
        {
          id: "signal-1",
          requestCount: 3,
          budgetMedian: 20000,
          center: {
            visibility: "APPROXIMATE",
          },
        },
      ],
    });
    await expect(repository.getDemandSignal("signal-1")).resolves.toMatchObject({
      id: "signal-1",
      category: "FOOD",
    });
    await expect(repository.listResponseMerchants()).resolves.toEqual([
      {
        id: "merchant-1",
        displayName: "Warung ABC",
      },
    ]);
    await expect(
      repository.listDemandSignalResponses("signal-1"),
    ).resolves.toMatchObject([
      {
        id: "response-1",
        merchant: {
          displayName: "Warung ABC",
        },
        status: "PREPARING",
      },
    ]);
    await expect(
      repository.upsertDemandSignalResponse({
        signalId: "signal-1",
        merchantId: "merchant-1",
        status: "PREPARING",
        message: "Kami sedang menyiapkan paket Rp18.000.",
      }),
    ).resolves.toMatchObject({
      id: "response-1",
      status: "PREPARING",
    });

    expect(rpc).toHaveBeenCalledWith("list_community_demand_signals_v1", {
      p_limit: 20,
      p_offset: 0,
      p_category: "FOOD",
    });
    expect(rpc).toHaveBeenCalledWith(
      "upsert_community_demand_signal_response_v1",
      {
        p_signal_id: "signal-1",
        p_merchant_id: "merchant-1",
        p_status: "PREPARING",
        p_message: "Kami sedang menyiapkan paket Rp18.000.",
      },
    );
  });

  it("lists and creates comments through bounded thread RPCs", async () => {
    const rpc = vi.fn((name: string) => {
      if (name === "list_community_comments_v1") {
        return Promise.resolve({
          data: [
            {
              id: "comment-1",
              post_id: "post-1",
              author_id: "user-1",
              parent_comment_id: null,
              content: "Aku juga lihat 👍",
              depth: 0,
              created_at: "2026-08-23T00:00:00.000Z",
              updated_at: "2026-08-23T00:00:00.000Z",
              author_display_name: "Revan",
              author_avatar_url: null,
              total_root_count: 1,
            },
          ],
          error: null,
        });
      }

      return {
        single: vi.fn().mockResolvedValue({
          data: {
            id: "comment-2",
            post_id: "post-1",
            author_id: "user-1",
            parent_comment_id: "comment-1",
            content: "Betul",
            depth: 1,
            created_at: "2026-08-23T00:00:00.000Z",
            updated_at: "2026-08-23T00:00:00.000Z",
            author_display_name: "Revan",
            author_avatar_url: null,
            total_root_count: 1,
          },
          error: null,
        }),
      };
    });
    const repository = new SupabaseCommunityRepository({ rpc } as any);

    await expect(
      repository.listComments("post-1", { page: 1, limit: 20 }),
    ).resolves.toMatchObject({
      total: 1,
      items: [
        {
          id: "comment-1",
          content: "Aku juga lihat 👍",
          depth: 0,
        },
      ],
    });
    await expect(
      repository.createComment({
        authorId: "user-1",
        postId: "post-1",
        content: "Betul",
        parentCommentId: "comment-1",
      }),
    ).resolves.toMatchObject({
      id: "comment-2",
      depth: 1,
      parentCommentId: "comment-1",
    });
  });

  it("adds and removes reactions through idempotent RPCs", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        helpful_count: 1,
        interesting_count: 0,
        confirmed_count: 0,
        viewer_reactions: ["HELPFUL"],
      },
      error: null,
    });
    const rpc = vi.fn().mockReturnValue({ single });
    const repository = new SupabaseCommunityRepository({ rpc } as any);

    await expect(
      repository.addReaction("post-1", "HELPFUL"),
    ).resolves.toEqual({
      helpfulCount: 1,
      interestingCount: 0,
      confirmedCount: 0,
      viewerReactions: ["HELPFUL"],
    });
    await expect(
      repository.removeReaction("post-1", "HELPFUL"),
    ).resolves.toEqual({
      helpfulCount: 1,
      interestingCount: 0,
      confirmedCount: 0,
      viewerReactions: ["HELPFUL"],
    });

    expect(rpc).toHaveBeenCalledWith("add_community_reaction_v1", {
      p_post_id: "post-1",
      p_reaction_type: "HELPFUL",
    });
    expect(rpc).toHaveBeenCalledWith("remove_community_reaction_v1", {
      p_post_id: "post-1",
      p_reaction_type: "HELPFUL",
    });
  });
});
