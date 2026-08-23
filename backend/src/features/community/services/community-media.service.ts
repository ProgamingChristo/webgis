import sharp, { type Metadata } from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/src/lib/errors";
import {
  COMMUNITY_MEDIA_BUCKET,
  COMMUNITY_PHOTO_MAX_DIMENSION_PX,
  COMMUNITY_PHOTO_MAX_INPUT_BYTES,
  COMMUNITY_PHOTO_MAX_INPUT_PIXELS,
  COMMUNITY_PHOTO_MAX_OUTPUT_BYTES,
  COMMUNITY_PHOTO_OUTPUT_MIME_TYPE,
} from "../constants/community.constants";
import type {
  CommunityPhotoUpload,
  CommunityStoredMedia,
} from "../types/community.types";

const SUPPORTED_INPUT_FORMATS = new Set(["jpeg", "png", "webp"]);

export type ProcessedCommunityPhoto = {
  buffer: Buffer;
  metadata: CommunityStoredMedia;
};

export class CommunityMediaService {
  constructor(private readonly storageClient: SupabaseClient) {}

  async processPhoto(
    photo: CommunityPhotoUpload,
    pathContext: {
      mediaId: string;
      postId: string;
      userId: string;
    },
  ): Promise<ProcessedCommunityPhoto> {
    if (
      !Number.isSafeInteger(photo.size) ||
      photo.size <= 0 ||
      photo.size > COMMUNITY_PHOTO_MAX_INPUT_BYTES
    ) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    const input = Buffer.from(await photo.arrayBuffer());

    if (input.byteLength !== photo.size) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    let metadata: Metadata;

    try {
      metadata = await sharp(input, {
        animated: false,
        limitInputPixels: COMMUNITY_PHOTO_MAX_INPUT_PIXELS,
      }).metadata();
    } catch {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    if (
      !metadata.format ||
      !SUPPORTED_INPUT_FORMATS.has(metadata.format) ||
      !metadata.width ||
      !metadata.height ||
      (metadata.pages !== undefined && metadata.pages > 1)
    ) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    try {
      const normalized = sharp(input, {
        animated: false,
        limitInputPixels: COMMUNITY_PHOTO_MAX_INPUT_PIXELS,
      })
        .rotate()
        .resize({
          width: COMMUNITY_PHOTO_MAX_DIMENSION_PX,
          height: COMMUNITY_PHOTO_MAX_DIMENSION_PX,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({
          effort: 5,
          quality: 82,
        });

      const { data, info } = await normalized.toBuffer({
        resolveWithObject: true,
      });

      if (
        data.byteLength <= 0 ||
        data.byteLength > COMMUNITY_PHOTO_MAX_OUTPUT_BYTES ||
        info.width <= 0 ||
        info.height <= 0 ||
        info.width > COMMUNITY_PHOTO_MAX_DIMENSION_PX ||
        info.height > COMMUNITY_PHOTO_MAX_DIMENSION_PX
      ) {
        throw new ApplicationError("VALIDATION_ERROR");
      }

      return {
        buffer: data,
        metadata: {
          id: pathContext.mediaId,
          storagePath: this.createStoragePath(pathContext),
          mimeType: COMMUNITY_PHOTO_OUTPUT_MIME_TYPE,
          sizeBytes: data.byteLength,
          width: info.width,
          height: info.height,
        },
      };
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }

      throw new ApplicationError("VALIDATION_ERROR");
    }
  }

  async uploadPhoto(media: ProcessedCommunityPhoto): Promise<void> {
    const { error } = await this.storageClient.storage
      .from(COMMUNITY_MEDIA_BUCKET)
      .upload(media.metadata.storagePath, media.buffer, {
        cacheControl: "3600",
        contentType: media.metadata.mimeType,
        upsert: false,
      });

    if (error) {
      throw new ApplicationError("DATABASE_ERROR");
    }
  }

  async removePhoto(storagePath: string): Promise<void> {
    await this.storageClient.storage
      .from(COMMUNITY_MEDIA_BUCKET)
      .remove([storagePath]);
  }

  private createStoragePath(context: {
    mediaId: string;
    postId: string;
    userId: string;
  }): string {
    return `${context.userId}/${context.postId}/${context.mediaId}.webp`;
  }
}
