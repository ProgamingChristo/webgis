import {
  communityCommentQuerySchema,
  communityCulturalMapQuerySchema,
  commuterRequestIdSchema,
  commuterRequestQuerySchema,
  communityFeedQuerySchema,
  communityPostIdSchema,
  communityReactionTypeSchema,
  createCommuterRequestSchema,
  createCommunityCommentSchema,
  createCommunityPostSchema,
} from "../schemas/community.schema";
import { ApplicationError } from "@/src/lib/errors";
import type { RepositoryError } from "@/src/repositories/errors";
import type { CommunityMediaService } from "./community-media.service";
import type {
  CommunityComment,
  CommunityCommentPage,
  CommunityCulturalMapItem,
  CommunityFeedItem,
  CommunityFeedPage,
  CommunityPhotoUpload,
  CommunityPostRepository,
  CommunityReactionSummary,
  CommuterRequestItem,
  CommuterRequestPage,
} from "../types/community.types";

export class CommunityService {
  constructor(
    private readonly repository: CommunityPostRepository,
    private readonly mediaService?: CommunityMediaService,
  ) {}

  async createPost(
    authorId: string,
    input: unknown,
    photo?: CommunityPhotoUpload,
  ): Promise<CommunityFeedItem> {
    const parsed = createCommunityPostSchema.safeParse(input);

    if (!parsed.success) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    const postId = crypto.randomUUID();
    const mediaId = photo ? crypto.randomUUID() : undefined;
    const processedPhoto = photo
      ? await this.requireMediaService().processPhoto(photo, {
          mediaId: mediaId!,
          postId,
          userId: authorId,
        })
      : undefined;

    if (processedPhoto) {
      await this.requireMediaService().uploadPhoto(processedPhoto);
    }

    try {
      return await this.repository.createPost({
        authorId,
        postId,
        content: parsed.data.content,
        type: parsed.data.type,
        category: parsed.data.category,
        ...(parsed.data.location
          ? {
              location: parsed.data.location,
            }
          : {}),
        ...(processedPhoto
          ? {
              media: processedPhoto.metadata,
            }
          : {}),
      });
    } catch (error) {
      if (processedPhoto) {
        await this.requireMediaService().removePhoto(
          processedPhoto.metadata.storagePath,
        );
      }

      throw mapCommunityRepositoryError(error);
    }
  }

  async listFeed(input: unknown): Promise<CommunityFeedPage> {
    const parsed = communityFeedQuerySchema.safeParse(input);

    if (!parsed.success) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    const query = parsed.data;
    try {
      return await this.repository.listFeed(query);
    } catch (error) {
      throw mapCommunityRepositoryError(error);
    }
  }

  async listCulturalMap(input: unknown): Promise<CommunityCulturalMapItem[]> {
    const parsed = communityCulturalMapQuerySchema.safeParse(input);

    if (!parsed.success) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    try {
      return await this.repository.listCulturalMap(parsed.data);
    } catch (error) {
      throw mapCommunityRepositoryError(error);
    }
  }

  async createCommuterRequest(
    authorId: string,
    input: unknown,
  ): Promise<CommuterRequestItem> {
    const parsed = createCommuterRequestSchema.safeParse(input);

    if (!parsed.success) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    try {
      return await this.repository.createCommuterRequest({
        authorId,
        requestId: crypto.randomUUID(),
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
        maxBudget: parsed.data.max_budget,
        location: parsed.data.location,
        radiusMeters: parsed.data.radius_meters,
        expiresInDays: parsed.data.expires_in_days,
      });
    } catch (error) {
      throw mapCommunityRepositoryError(error);
    }
  }

  async listCommuterRequests(input: unknown): Promise<CommuterRequestPage> {
    const parsed = commuterRequestQuerySchema.safeParse(input);

    if (!parsed.success) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    try {
      return await this.repository.listCommuterRequests(parsed.data);
    } catch (error) {
      throw mapCommunityRepositoryError(error);
    }
  }

  async getCommuterRequest(requestId: unknown): Promise<CommuterRequestItem> {
    const parsedRequestId = commuterRequestIdSchema.safeParse(requestId);

    if (!parsedRequestId.success) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    try {
      return await this.repository.getCommuterRequest(parsedRequestId.data);
    } catch (error) {
      throw mapCommunityRepositoryError(error);
    }
  }

  async getPost(postId: unknown): Promise<CommunityFeedItem> {
    const parsedPostId = communityPostIdSchema.safeParse(postId);

    if (!parsedPostId.success) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    try {
      return await this.repository.getPost(parsedPostId.data);
    } catch (error) {
      throw mapCommunityRepositoryError(error);
    }
  }

  async listComments(
    postId: unknown,
    input: unknown,
  ): Promise<CommunityCommentPage> {
    const parsedPostId = communityPostIdSchema.safeParse(postId);
    const parsedQuery = communityCommentQuerySchema.safeParse(input);

    if (!parsedPostId.success || !parsedQuery.success) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    try {
      return await this.repository.listComments(
        parsedPostId.data,
        parsedQuery.data,
      );
    } catch (error) {
      throw mapCommunityRepositoryError(error);
    }
  }

  async createComment(
    authorId: string,
    postId: unknown,
    input: unknown,
  ): Promise<CommunityComment> {
    const parsedPostId = communityPostIdSchema.safeParse(postId);
    const parsedInput = createCommunityCommentSchema.safeParse(input);

    if (!parsedPostId.success || !parsedInput.success) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    try {
      return await this.repository.createComment({
        authorId,
        postId: parsedPostId.data,
        content: parsedInput.data.content,
        parentCommentId: parsedInput.data.parent_comment_id,
      });
    } catch (error) {
      throw mapCommunityRepositoryError(error);
    }
  }

  async addReaction(
    postId: unknown,
    reactionType: unknown,
  ): Promise<CommunityReactionSummary> {
    const parsedPostId = communityPostIdSchema.safeParse(postId);
    const parsedReactionType =
      communityReactionTypeSchema.safeParse(reactionType);

    if (!parsedPostId.success || !parsedReactionType.success) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    try {
      return await this.repository.addReaction(
        parsedPostId.data,
        parsedReactionType.data,
      );
    } catch (error) {
      throw mapCommunityRepositoryError(error);
    }
  }

  async removeReaction(
    postId: unknown,
    reactionType: unknown,
  ): Promise<CommunityReactionSummary> {
    const parsedPostId = communityPostIdSchema.safeParse(postId);
    const parsedReactionType =
      communityReactionTypeSchema.safeParse(reactionType);

    if (!parsedPostId.success || !parsedReactionType.success) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    try {
      return await this.repository.removeReaction(
        parsedPostId.data,
        parsedReactionType.data,
      );
    } catch (error) {
      throw mapCommunityRepositoryError(error);
    }
  }

  private requireMediaService(): CommunityMediaService {
    if (!this.mediaService) {
      throw new ApplicationError("INTERNAL_ERROR");
    }

    return this.mediaService;
  }
}

function mapCommunityRepositoryError(error: unknown): ApplicationError {
  if (
    error &&
    typeof error === "object" &&
    "code" in error
  ) {
    const code = (error as RepositoryError).code;

    if (code === "VALIDATION_ERROR") {
      return new ApplicationError("VALIDATION_ERROR");
    }

    if (code === "FORBIDDEN") {
      return new ApplicationError("FORBIDDEN");
    }

    if (code === "NOT_FOUND") {
      return new ApplicationError("NOT_FOUND");
    }

    if (code === "CONFLICT") {
      return new ApplicationError("CONFLICT");
    }
  }

  if (error instanceof ApplicationError) {
    return error;
  }

  return new ApplicationError("DATABASE_ERROR");
}
