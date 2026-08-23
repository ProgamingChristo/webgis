import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

import {
  COMMUNITY_MEDIA_BUCKET,
  COMMUNITY_PHOTO_MAX_DIMENSION_PX,
  COMMUNITY_PHOTO_MAX_INPUT_BYTES,
  CommunityMediaService,
  type CommunityPhotoUpload,
} from "@/src/features/community";

function createPhoto(
  buffer: Buffer,
  options: {
    name?: string;
    type?: string;
    size?: number;
  } = {},
) : CommunityPhotoUpload {
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;

  return {
    name: options.name ?? "temuan.jpg",
    type: options.type ?? "image/jpeg",
    size: options.size ?? buffer.byteLength,
    arrayBuffer: vi.fn(async () => arrayBuffer),
  };
}

function createStorageClient() {
  const upload = vi.fn().mockResolvedValue({ error: null });
  const remove = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn().mockReturnValue({ upload, remove });

  return {
    client: {
      storage: {
        from,
      },
    },
    from,
    upload,
    remove,
  };
}

describe("CommunityMediaService", () => {
  it("normalizes supported photos into bounded WebP without metadata", async () => {
    const input = await sharp({
      create: {
        width: 3200,
        height: 1600,
        channels: 3,
        background: { r: 24, g: 128, b: 96 },
      },
    })
      .jpeg()
      .withMetadata()
      .toBuffer();
    const storage = createStorageClient();
    const service = new CommunityMediaService(storage.client as any);

    const processed = await service.processPhoto(createPhoto(input), {
      mediaId: "33333333-3333-4333-8333-333333333333",
      postId: "22222222-2222-4222-8222-222222222222",
      userId: "11111111-1111-4111-8111-111111111111",
    });
    const outputMetadata = await sharp(processed.buffer).metadata();

    expect(processed.metadata).toMatchObject({
      storagePath:
        "11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333.webp",
      mimeType: "image/webp",
      width: COMMUNITY_PHOTO_MAX_DIMENSION_PX,
      height: 1024,
    });
    expect(outputMetadata.format).toBe("webp");
    expect(outputMetadata.exif).toBeUndefined();
    expect(outputMetadata.iptc).toBeUndefined();
    expect(outputMetadata.xmp).toBeUndefined();
  });

  it("accepts PNG and WebP input formats", async () => {
    const png = await sharp({
      create: {
        width: 640,
        height: 360,
        channels: 3,
        background: { r: 16, g: 48, b: 128 },
      },
    })
      .png()
      .toBuffer();
    const webp = await sharp({
      create: {
        width: 640,
        height: 360,
        channels: 3,
        background: { r: 128, g: 48, b: 16 },
      },
    })
      .webp()
      .toBuffer();
    const service = new CommunityMediaService(createStorageClient().client as any);

    await expect(
      service.processPhoto(createPhoto(png, { type: "image/png" }), {
        mediaId: "media-png",
        postId: "post-png",
        userId: "user-png",
      }),
    ).resolves.toMatchObject({
      metadata: {
        mimeType: "image/webp",
      },
    });
    await expect(
      service.processPhoto(createPhoto(webp, { type: "image/webp" }), {
        mediaId: "media-webp",
        postId: "post-webp",
        userId: "user-webp",
      }),
    ).resolves.toMatchObject({
      metadata: {
        mimeType: "image/webp",
      },
    });
  });

  it("rejects SVG, malformed bytes, and oversized declared input", async () => {
    const service = new CommunityMediaService(createStorageClient().client as any);
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>',
    );

    await expect(
      service.processPhoto(createPhoto(svg, { type: "image/svg+xml" }), {
        mediaId: "media-svg",
        postId: "post-svg",
        userId: "user-svg",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      service.processPhoto(createPhoto(Buffer.from("not-an-image")), {
        mediaId: "media-random",
        postId: "post-random",
        userId: "user-random",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      service.processPhoto(
        createPhoto(Buffer.from("small"), {
          size: COMMUNITY_PHOTO_MAX_INPUT_BYTES + 1,
        }),
        {
          mediaId: "media-large",
          postId: "post-large",
          userId: "user-large",
        },
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("uploads and removes photos in the private community media bucket", async () => {
    const storage = createStorageClient();
    const service = new CommunityMediaService(storage.client as any);
    const media = {
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

    await service.uploadPhoto(media);
    await service.removePhoto(media.metadata.storagePath);

    expect(storage.from).toHaveBeenCalledWith(COMMUNITY_MEDIA_BUCKET);
    expect(storage.upload).toHaveBeenCalledWith(
      media.metadata.storagePath,
      media.buffer,
      {
        cacheControl: "3600",
        contentType: "image/webp",
        upsert: false,
      },
    );
    expect(storage.remove).toHaveBeenCalledWith([media.metadata.storagePath]);
  });
});
