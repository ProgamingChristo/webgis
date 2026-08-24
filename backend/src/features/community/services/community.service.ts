import {
  communityCommentQuerySchema,
  communityCulturalMapQuerySchema,
  communityDemandSignalIdSchema,
  communityDemandSignalQuerySchema,
  communityNotificationIdSchema,
  communityNotificationQuerySchema,
  communityFriendshipIdSchema,
  communityFriendshipListQuerySchema,
  communityReportIdSchema,
  communityUserIdSchema,
  commuterRequestIdSchema,
  commuterRequestQuerySchema,
  adminCommunityReportQuerySchema,
  communityFeedQuerySchema,
  communityPostIdSchema,
  communityReactionTypeSchema,
  createCommunityReportSchema,
  createCommunityFriendRequestSchema,
  createCommuterRequestSchema,
  createCommunityCommentSchema,
  createCommunityPostSchema,
  createCommunityUmkmResponseSchema,
  moderateCommunityReportSchema,
  actOnCommunityFriendshipSchema,
} from "../schemas/community.schema";
import { ApplicationError } from "@/src/lib/errors";
import type { RepositoryError } from "@/src/repositories/errors";
import type { CommunityMediaService } from "./community-media.service";
import type {
  CommunityComment,
  CommunityCommentPage,
  CommunityCulturalMapItem,
  CommunityDemandSignal,
  CommunityDemandSignalPage,
  CommunityFeedItem,
  CommunityFeedPage,
  AdminCommunityReportPage,
  CommunityAnalytics,
  CommunityNotificationPage,
  CommunityFriendListPage,
  CommunityPhotoUpload,
  CommunityPostRepository,
  CommunityReactionSummary,
  CommunityReport,
  CommunityReputation,
  CommunityUserProfile,
  CommunityResponseMerchant,
  CommunityUmkmResponse,
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

  async listDemandSignals(input: unknown): Promise<CommunityDemandSignalPage> {
    const parsed = communityDemandSignalQuerySchema.safeParse(input);

    if (!parsed.success) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    try {
      return await this.repository.listDemandSignals(parsed.data);
    } catch (error) {
      throw mapCommunityRepositoryError(error);
    }
  }

  async getDemandSignal(signalId: unknown): Promise<CommunityDemandSignal> {
    const parsedSignalId = communityDemandSignalIdSchema.safeParse(signalId);

    if (!parsedSignalId.success) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    try {
      return await this.repository.getDemandSignal(parsedSignalId.data);
    } catch (error) {
      throw mapCommunityRepositoryError(error);
    }
  }

  async listDemandSignalResponses(
    signalId: unknown,
  ): Promise<CommunityUmkmResponse[]> {
    const parsedSignalId = communityDemandSignalIdSchema.safeParse(signalId);

    if (!parsedSignalId.success) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    try {
      return await this.repository.listDemandSignalResponses(
        parsedSignalId.data,
      );
    } catch (error) {
      throw mapCommunityRepositoryError(error);
    }
  }

  async listResponseMerchants(): Promise<CommunityResponseMerchant[]> {
    try {
      return await this.repository.listResponseMerchants();
    } catch (error) {
      throw mapCommunityRepositoryError(error);
    }
  }

  async upsertDemandSignalResponse(
    signalId: unknown,
    input: unknown,
  ): Promise<CommunityUmkmResponse> {
    const parsedSignalId = communityDemandSignalIdSchema.safeParse(signalId);
    const parsedInput = createCommunityUmkmResponseSchema.safeParse(input);

    if (!parsedSignalId.success || !parsedInput.success) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    try {
      return await this.repository.upsertDemandSignalResponse({
        signalId: parsedSignalId.data,
        merchantId: parsedInput.data.merchant_id,
        status: parsedInput.data.status,
        message: parsedInput.data.message,
      });
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

  async listNotifications(input: unknown): Promise<CommunityNotificationPage> {
    const parsed = communityNotificationQuerySchema.safeParse(input);

    if (!parsed.success) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    try {
      return await this.repository.listNotifications(parsed.data);
    } catch (error) {
      throw mapCommunityRepositoryError(error);
    }
  }

  async markNotificationRead(notificationId: unknown): Promise<void> {
    const parsed = communityNotificationIdSchema.safeParse(notificationId);

    if (!parsed.success) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    try {
      await this.repository.markNotificationRead(parsed.data);
    } catch (error) {
      throw mapCommunityRepositoryError(error);
    }
  }

  async markAllNotificationsRead(): Promise<void> {
    try {
      await this.repository.markAllNotificationsRead();
    } catch (error) {
      throw mapCommunityRepositoryError(error);
    }
  }

  async createReport(input: unknown): Promise<CommunityReport> {
    const parsed = createCommunityReportSchema.safeParse(input);

    if (!parsed.success) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    try {
      return await this.repository.createReport({
        targetType: parsed.data.target_type,
        targetId: parsed.data.target_id,
        reason: parsed.data.reason,
        details: parsed.data.details,
      });
    } catch (error) {
      throw mapCommunityRepositoryError(error);
    }
  }

  async listAdminReports(input: unknown): Promise<AdminCommunityReportPage> {
    const parsed = adminCommunityReportQuerySchema.safeParse(input);

    if (!parsed.success) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    try {
      return await this.repository.listAdminReports(parsed.data);
    } catch (error) {
      throw mapCommunityRepositoryError(error);
    }
  }

  async moderateReport(reportId: unknown, input: unknown): Promise<void> {
    const parsedReportId = communityReportIdSchema.safeParse(reportId);
    const parsedInput = moderateCommunityReportSchema.safeParse(input);

    if (!parsedReportId.success || !parsedInput.success) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    try {
      await this.repository.moderateReport(
        parsedReportId.data,
        parsedInput.data.action,
      );
    } catch (error) {
      throw mapCommunityRepositoryError(error);
    }
  }

  async getReputation(userId: unknown): Promise<CommunityReputation> {
    const parsed = communityUserIdSchema.safeParse(userId);

    if (!parsed.success) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    try {
      return await this.repository.getReputation(parsed.data);
    } catch (error) {
      throw mapCommunityRepositoryError(error);
    }
  }

  async getAnalytics(): Promise<CommunityAnalytics> {
    try {
      return await this.repository.getAnalytics();
    } catch (error) {
      throw mapCommunityRepositoryError(error);
    }
  }

  async getCommunityUserProfile(userId: unknown): Promise<CommunityUserProfile> {
    const parsed = communityUserIdSchema.safeParse(userId);

    if (!parsed.success) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    try {
      return await this.repository.getCommunityUserProfile(parsed.data);
    } catch (error) {
      throw mapCommunityRepositoryError(error);
    }
  }

  async createFriendRequest(input: unknown): Promise<CommunityUserProfile> {
    const parsed = createCommunityFriendRequestSchema.safeParse(input);

    if (!parsed.success) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    try {
      return await this.repository.createFriendRequest(parsed.data.user_id);
    } catch (error) {
      throw mapCommunityRepositoryError(error);
    }
  }

  async actOnFriendship(friendshipId: unknown, input: unknown): Promise<void> {
    const parsedFriendshipId = communityFriendshipIdSchema.safeParse(friendshipId);
    const parsedInput = actOnCommunityFriendshipSchema.safeParse(input);

    if (!parsedFriendshipId.success || !parsedInput.success) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    try {
      await this.repository.actOnFriendship(
        parsedFriendshipId.data,
        parsedInput.data.action,
      );
    } catch (error) {
      throw mapCommunityRepositoryError(error);
    }
  }

  async listFriendships(input: unknown): Promise<CommunityFriendListPage> {
    const parsed = communityFriendshipListQuerySchema.safeParse(input);

    if (!parsed.success) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    try {
      return await this.repository.listFriendships(parsed.data);
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
