import { describe, expect, it, vi } from "vitest";

import {
  CommunityService,
  type CommunityMediaService,
  type CommunityPostRepository,
} from "@/src/features/community";

function asRepository(
  repository:
    Partial<CommunityPostRepository>,
): CommunityPostRepository {
  return repository as CommunityPostRepository;
}

function asMediaService(
  mediaService:
    Partial<CommunityMediaService>,
): CommunityMediaService {
  return mediaService as CommunityMediaService;
}

describe("CommunityService", () => {
  const post = {
    id: "post-1",
    authorId: "user-1",
    author: {
      id: "user-1",
      displayName: "Revan",
      avatarUrl: null,
    },
    content: "Nemunya warung murah 🍜🔥 Mantap 👍",
    location: null,
    media: [],
    status: "VISIBLE" as const,
    createdAt: "2026-08-23T00:00:00.000Z",
    updatedAt: "2026-08-23T00:00:00.000Z",
  };

  it("uses authenticated user ID as author when creating a text-only post", async () => {
    const repository = {
      createPost: vi.fn().mockResolvedValue(post),
      listFeed: vi.fn(),
    };

    const service = new CommunityService(asRepository(repository));
    const result = await service.createPost("user-1", {
      content: "  Nemunya warung murah 🍜🔥 Mantap 👍  ",
    });

    expect(result).toEqual(post);
    expect(repository.createPost).toHaveBeenCalledWith(
      expect.objectContaining({
        authorId: "user-1",
        content: "Nemunya warung murah 🍜🔥 Mantap 👍",
        postId: expect.any(String),
      }),
    );
  });

  it("passes validated optional location to the repository", async () => {
    const locationPost = {
      ...post,
      content: "Ada tempat menarik di sini 📍",
      location: {
        longitude: 106.827,
        latitude: -6.175,
        visibility: "APPROXIMATE" as const,
      },
    };
    const repository = {
      createPost: vi.fn().mockResolvedValue(locationPost),
      listFeed: vi.fn(),
    };

    const service = new CommunityService(asRepository(repository));
    const result = await service.createPost("user-1", {
      content: "Ada tempat menarik di sini 📍",
      location: {
        longitude: 106.8272,
        latitude: -6.1754,
        visibility: "APPROXIMATE",
      },
    });

    expect(result).toEqual(locationPost);
    expect(repository.createPost).toHaveBeenCalledWith(
      expect.objectContaining({
        authorId: "user-1",
        content: "Ada tempat menarik di sini 📍",
        postId: expect.any(String),
        location: {
          longitude: 106.8272,
          latitude: -6.1754,
          visibility: "APPROXIMATE",
        },
      }),
    );
  });

  it("rejects client author override before repository insert", async () => {
    const repository = {
      createPost: vi.fn(),
      listFeed: vi.fn(),
    };

    const service = new CommunityService(asRepository(repository));

    await expect(
      service.createPost("user-1", {
        author_id: "user-2",
        content: "Valid content",
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect(repository.createPost).not.toHaveBeenCalled();
  });

  it("rejects invalid location before repository insert", async () => {
    const repository = {
      createPost: vi.fn(),
      listFeed: vi.fn(),
    };

    const service = new CommunityService(asRepository(repository));

    await expect(
      service.createPost("user-1", {
        content: "Valid content",
        location: {
          longitude: 200,
          latitude: -6.1754,
          visibility: "APPROXIMATE",
        },
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect(repository.createPost).not.toHaveBeenCalled();
  });

  it("processes and uploads one photo before creating the post", async () => {
    const photo = {
      name: "temuan.jpg",
      type: "image/jpeg",
      size: 128,
      arrayBuffer: vi.fn(),
    };
    const processedPhoto = {
      buffer: Buffer.from("webp"),
      metadata: {
        id: "media-1",
        storagePath: "user-1/post-1/media-1.webp",
        mimeType: "image/webp" as const,
        sizeBytes: 4,
        width: 800,
        height: 600,
      },
    };
    const repository = {
      createPost: vi.fn().mockResolvedValue({
        ...post,
        media: [
          {
            id: "media-1",
            type: "IMAGE" as const,
            url: "https://signed.example/photo.webp",
            mimeType: "image/webp" as const,
            sizeBytes: 4,
            width: 800,
            height: 600,
          },
        ],
      }),
      listFeed: vi.fn(),
    };
    const mediaService = {
      processPhoto: vi.fn().mockResolvedValue(processedPhoto),
      uploadPhoto: vi.fn().mockResolvedValue(undefined),
      removePhoto: vi.fn(),
    };

    const service = new CommunityService(
      asRepository(repository),
      asMediaService(mediaService),
    );
    const result = await service.createPost(
      "user-1",
      { content: "Ada halte baru dekat stasiun" },
      photo,
    );

    expect(result.media).toHaveLength(1);
    expect(mediaService.processPhoto).toHaveBeenCalledWith(photo, {
      mediaId: expect.any(String),
      postId: expect.any(String),
      userId: "user-1",
    });
    expect(mediaService.uploadPhoto).toHaveBeenCalledWith(processedPhoto);
    expect(repository.createPost).toHaveBeenCalledWith(
      expect.objectContaining({
        authorId: "user-1",
        content: "Ada halte baru dekat stasiun",
        postId: expect.any(String),
        media: processedPhoto.metadata,
      }),
    );
  });

  it("removes uploaded photo when post creation fails", async () => {
    const processedPhoto = {
      buffer: Buffer.from("webp"),
      metadata: {
        id: "media-1",
        storagePath: "user-1/post-1/media-1.webp",
        mimeType: "image/webp" as const,
        sizeBytes: 4,
        width: 800,
        height: 600,
      },
    };
    const repository = {
      createPost: vi.fn().mockRejectedValue(new Error("insert failed")),
      listFeed: vi.fn(),
    };
    const mediaService = {
      processPhoto: vi.fn().mockResolvedValue(processedPhoto),
      uploadPhoto: vi.fn().mockResolvedValue(undefined),
      removePhoto: vi.fn().mockResolvedValue(undefined),
    };
    const service = new CommunityService(
      asRepository(repository),
      asMediaService(mediaService),
    );

    await expect(
      service.createPost(
        "user-1",
        { content: "Ada halte baru dekat stasiun" },
        {
          name: "temuan.jpg",
          type: "image/jpeg",
          size: 128,
          arrayBuffer: vi.fn(),
        },
      ),
    ).rejects.toMatchObject({
      code: "DATABASE_ERROR",
    });

    expect(mediaService.removePhoto).toHaveBeenCalledWith(
      "user-1/post-1/media-1.webp",
    );
  });

  it("returns persistent feed through the repository contract", async () => {
    const repository = {
      createPost: vi.fn(),
      listFeed: vi.fn().mockResolvedValue({
        items: [post],
        page: 1,
        limit: 20,
        total: 1,
      }),
    };

    const service = new CommunityService(asRepository(repository));

    await expect(service.listFeed({})).resolves.toEqual({
      items: [post],
      page: 1,
      limit: 20,
      total: 1,
    });

    expect(repository.listFeed).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
    });
  });

  it("rejects invalid pagination as a validation error", async () => {
    const service = new CommunityService(asRepository({
      createPost: vi.fn(),
      listFeed: vi.fn(),
    }));

    await expect(
      service.listFeed({
        limit: "999",
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("delegates validated Phase 9 report payloads to the repository", async () => {
    const repository = {
      createReport: vi.fn().mockResolvedValue({
        id: "report-1",
        targetType: "POST",
        targetId: "11111111-1111-4111-8111-111111111111",
        reason: "SPAM",
        details: null,
        status: "OPEN",
        createdAt: "2026-08-23T00:00:00.000Z",
      }),
    };
    const service = new CommunityService(asRepository(repository));

    await expect(
      service.createReport({
        target_type: "POST",
        target_id: "11111111-1111-4111-8111-111111111111",
        reason: "SPAM",
      }),
    ).resolves.toMatchObject({
      id: "report-1",
    });
    expect(repository.createReport).toHaveBeenCalledWith({
      targetType: "POST",
      targetId: "11111111-1111-4111-8111-111111111111",
      reason: "SPAM",
      details: undefined,
    });
  });

  it("rejects invalid Phase 9 moderation action before repository call", async () => {
    const repository = {
      moderateReport: vi.fn(),
    };
    const service = new CommunityService(asRepository(repository));

    await expect(
      service.moderateReport(
        "11111111-1111-4111-8111-111111111111",
        { action: "NUKE" },
      ),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect(repository.moderateReport).not.toHaveBeenCalled();
  });

  it("delegates validated Phase 10 friend request target only", async () => {
    const repository = {
      createFriendRequest: vi.fn().mockResolvedValue({
        userId: "22222222-2222-4222-8222-222222222222",
        displayName: "Sari",
        avatarUrl: null,
        reputationLabel: "Kontributor Baru",
        confirmedContributions: 0,
        helpfulReceived: 0,
        findingsCount: 0,
        friendCount: 0,
        relationshipState: "PENDING_OUTGOING",
        friendshipId: "33333333-3333-4333-8333-333333333333",
      }),
    };
    const service = new CommunityService(asRepository(repository));

    await expect(
      service.createFriendRequest({
        user_id: "22222222-2222-4222-8222-222222222222",
      }),
    ).resolves.toMatchObject({
      relationshipState: "PENDING_OUTGOING",
    });
    expect(repository.createFriendRequest).toHaveBeenCalledWith(
      "22222222-2222-4222-8222-222222222222",
    );
  });

  it("rejects trusted Phase 10 friendship fields before repository call", async () => {
    const repository = {
      createFriendRequest: vi.fn(),
      actOnFriendship: vi.fn(),
    };
    const service = new CommunityService(asRepository(repository));

    await expect(
      service.createFriendRequest({
        user_id: "22222222-2222-4222-8222-222222222222",
        requester_id: "11111111-1111-4111-8111-111111111111",
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    await expect(
      service.actOnFriendship(
        "33333333-3333-4333-8333-333333333333",
        { action: "FOLLOW" },
      ),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect(repository.createFriendRequest).not.toHaveBeenCalled();
    expect(repository.actOnFriendship).not.toHaveBeenCalled();
  });
});
