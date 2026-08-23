import { describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

import { createCommunityPostsHandler } from "@/app/api/community/posts/route";
import { ApplicationError } from "@/src/lib/errors";

describe("POST /api/community/posts", () => {
  const post = {
    id: "post-1",
    authorId: "user-1",
    author: {
      id: "user-1",
      displayName: "Revan",
      avatarUrl: null,
    },
    content: "Nemunya warung murah 🍜🔥 Mantap 👍",
    type: "GENERAL",
    category: null,
    location: null,
    media: [],
    reactions: {
      helpfulCount: 0,
      interestingCount: 0,
      confirmedCount: 0,
      viewerReactions: [],
    },
    replyCount: 0,
    status: "VISIBLE",
    createdAt: "2026-08-23T00:00:00.000Z",
    updatedAt: "2026-08-23T00:00:00.000Z",
  };

  function createRequest(body: unknown) {
    return new Request("http://localhost/api/community/posts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer test-token",
      },
      body: JSON.stringify(body),
    }) as NextRequest;
  }

  function createMultipartRequest(
    payload: unknown,
    entries: Array<[string, string | File]> = [],
  ) {
    const formData = new FormData();
    formData.append("payload", JSON.stringify(payload));

    for (const [key, value] of entries) {
      formData.append(key, value);
    }

    return new Request("http://localhost/api/community/posts", {
      method: "POST",
      headers: {
        authorization: "Bearer test-token",
      },
      body: formData,
    }) as NextRequest;
  }

  function createDependencies(service = {
    createPost: vi.fn().mockResolvedValue(post),
  }) {
    return {
      authenticate: vi.fn().mockResolvedValue("user-1"),
      createService: vi.fn(() => service),
      rateLimiter: {
        checkLimit: vi.fn().mockResolvedValue(undefined),
      },
    };
  }

  it("creates an authenticated text-only emoji post with canonical author", async () => {
    const service = {
      createPost: vi.fn().mockResolvedValue(post),
    };
    const dependencies = createDependencies(service);

    const response = await createCommunityPostsHandler(dependencies)(
      createRequest({
        content: "Nemunya warung murah 🍜🔥 Mantap 👍",
      }),
    );

    await expect(response.json()).resolves.toEqual({
      success: true,
      data: post,
      request_id: expect.any(String),
    });
    expect(response.status).toBe(201);
    expect(service.createPost).toHaveBeenCalledWith(
      "user-1",
      {
        content: "Nemunya warung murah 🍜🔥 Mantap 👍",
      },
      undefined,
    );
  });

  it("passes an authenticated approximate location post payload", async () => {
    const locationPost = {
      ...post,
      location: {
        longitude: 106.827,
        latitude: -6.175,
        visibility: "APPROXIMATE",
      },
    };
    const service = {
      createPost: vi.fn().mockResolvedValue(locationPost),
    };
    const dependencies = createDependencies(service);

    const response = await createCommunityPostsHandler(dependencies)(
      createRequest({
        content: "Ada tempat menarik di sini 📍",
        location: {
          longitude: 106.8272,
          latitude: -6.1754,
          visibility: "APPROXIMATE",
        },
      }),
    );

    expect(response.status).toBe(201);
    expect(service.createPost).toHaveBeenCalledWith(
      "user-1",
      {
        content: "Ada tempat menarik di sini 📍",
        location: {
          longitude: 106.8272,
          latitude: -6.1754,
          visibility: "APPROXIMATE",
        },
      },
      undefined,
    );
  });

  it("passes an authenticated exact location post payload", async () => {
    const exactPost = {
      ...post,
      location: {
        longitude: 106.8272,
        latitude: -6.1754,
        visibility: "EXACT",
      },
    };
    const service = {
      createPost: vi.fn().mockResolvedValue(exactPost),
    };
    const dependencies = createDependencies(service);

    const response = await createCommunityPostsHandler(dependencies)(
      createRequest({
        content: "Titik presisi untuk meetup",
        location: {
          longitude: 106.8272,
          latitude: -6.1754,
          visibility: "EXACT",
          accuracy_m: 18,
        },
      }),
    );

    expect(response.status).toBe(201);
    expect(service.createPost).toHaveBeenCalledWith(
      "user-1",
      {
        content: "Titik presisi untuk meetup",
        location: {
          longitude: 106.8272,
          latitude: -6.1754,
          visibility: "EXACT",
          accuracy_m: 18,
        },
      },
      undefined,
    );
  });

  it("passes an authenticated Temuan Komuter payload", async () => {
    const findingPost = {
      ...post,
      type: "FINDING",
      category: "LOCAL_FOOD",
      location: {
        longitude: 106.827,
        latitude: -6.175,
        visibility: "APPROXIMATE",
      },
    };
    const service = {
      createPost: vi.fn().mockResolvedValue(findingPost),
    };
    const dependencies = createDependencies(service);

    const response = await createCommunityPostsHandler(dependencies)(
      createRequest({
        type: "FINDING",
        content: "Nasi uduk khas dekat peron",
        category: "LOCAL_FOOD",
        location: {
          longitude: 106.8272,
          latitude: -6.1754,
          visibility: "APPROXIMATE",
        },
      }),
    );

    expect(response.status).toBe(201);
    expect(service.createPost).toHaveBeenCalledWith(
      "user-1",
      {
        type: "FINDING",
        content: "Nasi uduk khas dekat peron",
        category: "LOCAL_FOOD",
        location: {
          longitude: 106.8272,
          latitude: -6.1754,
          visibility: "APPROXIMATE",
        },
      },
      undefined,
    );
  });

  it("passes one multipart photo with the JSON payload", async () => {
    const photoPost = {
      ...post,
      media: [
        {
          id: "media-1",
          type: "IMAGE",
          url: "https://signed.example/photo.webp",
          mimeType: "image/webp",
          sizeBytes: 128,
          width: 640,
          height: 480,
        },
      ],
    };
    const service = {
      createPost: vi.fn().mockResolvedValue(photoPost),
    };
    const dependencies = createDependencies(service);
    const photo = new File([new Uint8Array([1, 2, 3])], "temuan.jpg", {
      type: "image/jpeg",
    });

    const response = await createCommunityPostsHandler(dependencies)(
      createMultipartRequest(
        {
          content: "Ada foto rambu baru",
        },
        [["photo", photo]],
      ),
    );

    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        media: [
          {
            id: "media-1",
            mimeType: "image/webp",
          },
        ],
      },
    });
    expect(response.status).toBe(201);
    expect(service.createPost).toHaveBeenCalledWith(
      "user-1",
      {
        content: "Ada foto rambu baru",
      },
      expect.any(File),
    );
  });

  it("rejects multipart requests with more than one photo", async () => {
    const service = {
      createPost: vi.fn(),
    };
    const dependencies = createDependencies(service);

    const response = await createCommunityPostsHandler(dependencies)(
      createMultipartRequest(
        {
          content: "Ada dua foto",
        },
        [
          [
            "photo",
            new File([new Uint8Array([1])], "satu.jpg", {
              type: "image/jpeg",
            }),
          ],
          [
            "photo",
            new File([new Uint8Array([2])], "dua.jpg", {
              type: "image/jpeg",
            }),
          ],
        ],
      ),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(service.createPost).not.toHaveBeenCalled();
  });

  it("returns validation error for invalid coordinate", async () => {
    const service = {
      createPost: vi
        .fn()
        .mockRejectedValue(new ApplicationError("VALIDATION_ERROR")),
    };
    const dependencies = createDependencies(service);

    const response = await createCommunityPostsHandler(dependencies)(
      createRequest({
        content: "Valid content",
        location: {
          longitude: 200,
          latitude: -6,
          visibility: "APPROXIMATE",
        },
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
  });

  it("denies anonymous location create before service invocation", async () => {
    const service = {
      createPost: vi.fn(),
    };
    const dependencies = {
      authenticate: vi
        .fn()
        .mockRejectedValue(new ApplicationError("UNAUTHORIZED")),
      createService: vi.fn(() => service),
      rateLimiter: {
        checkLimit: vi.fn(),
      },
    };

    const response = await createCommunityPostsHandler(dependencies)(
      createRequest({
        content: "Valid content",
        location: {
          longitude: 106.8272,
          latitude: -6.1754,
          visibility: "APPROXIMATE",
        },
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
    expect(service.createPost).not.toHaveBeenCalled();
  });

  it("returns validation error for location plus author_id spoof", async () => {
    const service = {
      createPost: vi
        .fn()
        .mockRejectedValue(new ApplicationError("VALIDATION_ERROR")),
    };
    const dependencies = createDependencies(service);

    const response = await createCommunityPostsHandler(dependencies)(
      createRequest({
        author_id: "user-2",
        content: "Valid content",
        location: {
          longitude: 106.8272,
          latitude: -6.1754,
          visibility: "APPROXIMATE",
        },
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
  });
});
