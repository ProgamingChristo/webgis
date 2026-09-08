import type { SupabaseClient } from "@supabase/supabase-js";

import { mapDatabaseError } from "@/src/repositories/errors";
import {
  COMMUNITY_MEDIA_BUCKET,
  COMMUNITY_PHOTO_SIGNED_URL_SECONDS,
} from "../constants/community.constants";
import {
  mapAdminCommunityReportRow,
  mapCommunityAnalyticsRow,
  mapCommunityCulturalMapRow,
  mapCommunityDemandSignalRow,
  mapCommunityCommentRow,
  mapCommunityNotificationRow,
  mapCommunityFriendListRow,
  mapCommunityUserProfileRow,
  mapCommunityPostRow,
  mapCommunityReportRow,
  mapCommunityReputationRow,
  mapCommunityResponseMerchantRow,
  mapCommunityUmkmResponseRow,
  mapCommuterRequestRow,
} from "../mappers/community.mapper";
import type {
  AdminCommunityReportPage,
  AdminCommunityReportQuery,
  CommunityAnalytics,
  CommunityComment,
  CommunityCommentDatabaseRow,
  CommunityCommentPage,
  CommunityCommentQuery,
  CommunityCulturalMapDatabaseRow,
  CommunityCulturalMapItem,
  CommunityCulturalMapQuery,
  CommunityDemandSignal,
  CommunityDemandSignalDatabaseRow,
  CommunityDemandSignalPage,
  CommunityDemandSignalQuery,
  CommunityFeedItem,
  CommunityFeedPage,
  CommunityFeedQuery,
  CommunityModerationAction,
  CommunityFriendListDatabaseRow,
  CommunityFriendListPage,
  CommunityFriendListQuery,
  CommunityFriendshipAction,
  CommunityNotificationDatabaseRow,
  CommunityNotificationPage,
  CommunityNotificationQuery,
  CommunityPostDatabaseRow,
  CommunityPostRepository,
  CommunityReactionSummary,
  CommunityReactionSummaryDatabaseRow,
  CommunityReactionType,
  CommunityReport,
  CommunityReportDatabaseRow,
  CommunityReputation,
  CommunityReputationDatabaseRow,
  CommunityUserProfile,
  CommunityUserProfileDatabaseRow,
  CommunityResponseMerchant,
  CommunityResponseMerchantDatabaseRow,
  CommunityUmkmResponse,
  CommunityAnalyticsDatabaseRow,
  CommunityUmkmResponseDatabaseRow,
  CommuterRequestDatabaseRow,
  CommuterRequestItem,
  CommuterRequestPage,
  CommuterRequestQuery,
  CreateCommuterRequestInput,
  CreateCommunityCommentInput,
  CreateCommunityPostInput,
  CreateCommunityReportInput,
  CreateCommunityUmkmResponseInput,
} from "../types/community.types";

export class SupabaseCommunityRepository
  implements CommunityPostRepository
{
  constructor(
    private readonly client: SupabaseClient,
    private readonly storageClient: SupabaseClient = client,
  ) {}

  async createPost(
    input: CreateCommunityPostInput,
  ): Promise<CommunityFeedItem> {
    const { data, error } = await (this.client as any)
      .rpc("create_community_post_v4", {
        p_post_id: input.postId ?? crypto.randomUUID(),
        p_content: input.content,
        p_post_type: input.type ?? "GENERAL",
        p_category: input.category ?? null,
        p_longitude: input.location?.longitude ?? null,
        p_latitude: input.location?.latitude ?? null,
        p_location_visibility:
          input.location?.visibility ?? null,
        p_location_accuracy_m:
          input.location?.accuracy_m ?? null,
        p_media_id: input.media?.id ?? null,
        p_media_storage_path: input.media?.storagePath ?? null,
        p_media_mime_type: input.media?.mimeType ?? null,
        p_media_size_bytes: input.media?.sizeBytes ?? null,
        p_media_width: input.media?.width ?? null,
        p_media_height: input.media?.height ?? null,
      })
      .single();

    if (error) {
      throw mapDatabaseError(
        error,
        "community_posts.createPost",
      );
    }

    return this.attachSignedMediaUrlsToItem(
      mapCommunityPostRow(data as CommunityPostDatabaseRow),
      data as CommunityPostDatabaseRow,
    );
  }

  async listFeed(query: CommunityFeedQuery): Promise<CommunityFeedPage> {
    const from = (query.page - 1) * query.limit;

    const { data, error } = await (this.client as any)
      .rpc("list_community_feed_v4", {
        p_limit: query.limit,
        p_offset: from,
        p_post_type: query.type ?? null,
        p_category: query.category ?? null,
      });

    if (error) {
      throw mapDatabaseError(
        error,
        "community_posts.listFeed",
      );
    }

    const rows = (data ?? []) as CommunityPostDatabaseRow[];
    const items = rows.map((row) => mapCommunityPostRow(row));

    return {
      items: await this.attachSignedMediaUrlsToItems(items, rows),
      page: query.page,
      limit: query.limit,
      total: Number(rows[0]?.total_count ?? 0),
    };
  }

  async getPost(postId: string): Promise<CommunityFeedItem> {
    const { data, error } = await (this.client as any)
      .rpc("get_community_post_detail_v2", {
        p_post_id: postId,
      })
      .single();

    if (error) {
      throw mapDatabaseError(error, "community_posts.getPost");
    }

    return this.attachSignedMediaUrlsToItem(
      mapCommunityPostRow(data as CommunityPostDatabaseRow),
      data as CommunityPostDatabaseRow,
    );
  }

  async deletePost(postId: string): Promise<{ deletionActorRole: "OWNER" | "ADMIN" }> {
    const { data, error } = await (this.client as any)
      .rpc("delete_community_post_v1", { p_post_id: postId })
      .single();
    if (error) throw mapDatabaseError(error, "community_posts.deletePost");
    return { deletionActorRole: data.deletion_actor_role };
  }

  async listComments(
    postId: string,
    query: CommunityCommentQuery,
  ): Promise<CommunityCommentPage> {
    const { data, error } = await (this.client as any)
      .rpc("list_community_comments_v1", {
        p_post_id: postId,
        p_limit: query.limit,
        p_offset: (query.page - 1) * query.limit,
      });

    if (error) {
      throw mapDatabaseError(
        error,
        "community_comments.listComments",
      );
    }

    const rows = (data ?? []) as CommunityCommentDatabaseRow[];

    return {
      items: rows.map((row) => mapCommunityCommentRow(row)),
      page: query.page,
      limit: query.limit,
      total: Number(rows[0]?.total_root_count ?? 0),
    };
  }

  async createComment(
    input: CreateCommunityCommentInput,
  ): Promise<CommunityComment> {
    const { data, error } = await (this.client as any)
      .rpc("create_community_comment_v1", {
        p_post_id: input.postId,
        p_content: input.content,
        p_parent_comment_id: input.parentCommentId ?? null,
      })
      .single();

    if (error) {
      throw mapDatabaseError(
        error,
        "community_comments.createComment",
      );
    }

    return mapCommunityCommentRow(data as CommunityCommentDatabaseRow);
  }

  async addReaction(
    postId: string,
    reactionType: CommunityReactionType,
  ): Promise<CommunityReactionSummary> {
    const { data, error } = await (this.client as any)
      .rpc("add_community_reaction_v1", {
        p_post_id: postId,
        p_reaction_type: reactionType,
      })
      .single();

    if (error) {
      throw mapDatabaseError(error, "community_reactions.addReaction");
    }

    return mapReactionSummaryRow(
      data as CommunityReactionSummaryDatabaseRow,
    );
  }

  async removeReaction(
    postId: string,
    reactionType: CommunityReactionType,
  ): Promise<CommunityReactionSummary> {
    const { data, error } = await (this.client as any)
      .rpc("remove_community_reaction_v1", {
        p_post_id: postId,
        p_reaction_type: reactionType,
      })
      .single();

    if (error) {
      throw mapDatabaseError(
        error,
        "community_reactions.removeReaction",
      );
    }

    return mapReactionSummaryRow(
      data as CommunityReactionSummaryDatabaseRow,
    );
  }

  async listCulturalMap(
    query: CommunityCulturalMapQuery,
  ): Promise<CommunityCulturalMapItem[]> {
    const { data, error } = await (this.client as any)
      .rpc("list_community_cultural_map_v1", {
        p_west: query.west,
        p_south: query.south,
        p_east: query.east,
        p_north: query.north,
        p_categories: query.categories ?? null,
        p_limit: query.limit,
      });

    if (error) {
      throw mapDatabaseError(
        error,
        "community_posts.listCulturalMap",
      );
    }

    return ((data ?? []) as CommunityCulturalMapDatabaseRow[]).map((row) =>
      mapCommunityCulturalMapRow(row),
    );
  }

  async createCommuterRequest(
    input: CreateCommuterRequestInput,
  ): Promise<CommuterRequestItem> {
    const { data, error } = await (this.client as any)
      .rpc("create_commuter_request_v1", {
        p_request_id: input.requestId ?? crypto.randomUUID(),
        p_title: input.title,
        p_description: input.description,
        p_category: input.category,
        p_max_budget: input.maxBudget,
        p_longitude: input.location.longitude,
        p_latitude: input.location.latitude,
        p_location_visibility: input.location.visibility,
        p_location_accuracy_m: input.location.accuracy_m ?? null,
        p_radius_meters: input.radiusMeters,
        p_expires_in_days: input.expiresInDays,
      })
      .single();

    if (error) {
      throw mapDatabaseError(
        error,
        "commuter_requests.create",
      );
    }

    return mapCommuterRequestRow(data as CommuterRequestDatabaseRow);
  }

  async listCommuterRequests(
    query: CommuterRequestQuery,
  ): Promise<CommuterRequestPage> {
    const { data, error } = await (this.client as any)
      .rpc("list_commuter_requests_v1", {
        p_limit: query.limit,
        p_offset: (query.page - 1) * query.limit,
        p_category: query.category ?? null,
        p_longitude: query.longitude ?? null,
        p_latitude: query.latitude ?? null,
        p_radius_meters: query.radius_meters ?? null,
      });

    if (error) {
      throw mapDatabaseError(
        error,
        "commuter_requests.list",
      );
    }

    const rows = (data ?? []) as CommuterRequestDatabaseRow[];

    return {
      items: rows.map((row) => mapCommuterRequestRow(row)),
      page: query.page,
      limit: query.limit,
      total: Number(rows[0]?.total_count ?? 0),
    };
  }

  async getCommuterRequest(requestId: string): Promise<CommuterRequestItem> {
    const { data, error } = await (this.client as any)
      .rpc("get_commuter_request_detail_v1", {
        p_request_id: requestId,
      })
      .single();

    if (error) {
      throw mapDatabaseError(
        error,
        "commuter_requests.get",
      );
    }

    return mapCommuterRequestRow(data as CommuterRequestDatabaseRow);
  }

  async listDemandSignals(
    query: CommunityDemandSignalQuery,
  ): Promise<CommunityDemandSignalPage> {
    const { data, error } = await (this.client as any)
      .rpc("list_community_demand_signals_v1", {
        p_limit: query.limit,
        p_offset: (query.page - 1) * query.limit,
        p_category: query.category ?? null,
      });

    if (error) {
      throw mapDatabaseError(error, "community_demand_signals.list");
    }

    const rows = (data ?? []) as CommunityDemandSignalDatabaseRow[];

    return {
      items: rows.map((row) => mapCommunityDemandSignalRow(row)),
      page: query.page,
      limit: query.limit,
      total: Number(rows[0]?.total_count ?? 0),
    };
  }

  async getDemandSignal(signalId: string): Promise<CommunityDemandSignal> {
    const { data, error } = await (this.client as any)
      .rpc("get_community_demand_signal_detail_v1", {
        p_signal_id: signalId,
      })
      .single();

    if (error) {
      throw mapDatabaseError(error, "community_demand_signals.get");
    }

    return mapCommunityDemandSignalRow(data as CommunityDemandSignalDatabaseRow);
  }

  async listDemandSignalResponses(
    signalId: string,
  ): Promise<CommunityUmkmResponse[]> {
    const { data, error } = await (this.client as any)
      .rpc("list_community_demand_signal_responses_v1", {
        p_signal_id: signalId,
      });

    if (error) {
      throw mapDatabaseError(error, "community_demand_responses.list");
    }

    return ((data ?? []) as CommunityUmkmResponseDatabaseRow[]).map((row) =>
      mapCommunityUmkmResponseRow(row),
    );
  }

  async listResponseMerchants(): Promise<CommunityResponseMerchant[]> {
    const { data, error } = await (this.client as any)
      .rpc("list_community_response_merchants_v1");

    if (error) {
      throw mapDatabaseError(error, "community_response_merchants.list");
    }

    return ((data ?? []) as CommunityResponseMerchantDatabaseRow[]).map((row) =>
      mapCommunityResponseMerchantRow(row),
    );
  }

  async upsertDemandSignalResponse(
    input: CreateCommunityUmkmResponseInput,
  ): Promise<CommunityUmkmResponse> {
    const { data, error } = await (this.client as any)
      .rpc("upsert_community_demand_signal_response_v1", {
        p_signal_id: input.signalId,
        p_merchant_id: input.merchantId,
        p_status: input.status,
        p_message: input.message ?? null,
      })
      .single();

    if (error) {
      throw mapDatabaseError(error, "community_demand_responses.upsert");
    }

    return mapCommunityUmkmResponseRow(data as CommunityUmkmResponseDatabaseRow);
  }

  async listNotifications(
    query: CommunityNotificationQuery,
  ): Promise<CommunityNotificationPage> {
    const { data, error } = await (this.client as any)
      .rpc("list_community_notifications_v1", {
        p_limit: query.limit,
        p_offset: (query.page - 1) * query.limit,
      });

    if (error) {
      throw mapDatabaseError(error, "community_notifications.list");
    }

    const rows = (data ?? []) as CommunityNotificationDatabaseRow[];
    const { data: unreadData, error: unreadError } = await (this.client as any)
      .rpc("count_community_unread_notifications_v1");

    if (unreadError) {
      throw mapDatabaseError(unreadError, "community_notifications.countUnread");
    }

    return {
      items: rows.map((row) => mapCommunityNotificationRow(row)),
      page: query.page,
      limit: query.limit,
      total: Number(rows[0]?.total_count ?? 0),
      unreadCount: Number(unreadData ?? 0),
    };
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    const { error } = await (this.client as any)
      .rpc("mark_community_notification_read_v1", {
        p_notification_id: notificationId,
      });

    if (error) {
      throw mapDatabaseError(error, "community_notifications.markRead");
    }
  }

  async markAllNotificationsRead(): Promise<void> {
    const { error } = await (this.client as any)
      .rpc("mark_all_community_notifications_read_v1");

    if (error) {
      throw mapDatabaseError(error, "community_notifications.markAllRead");
    }
  }

  async createReport(
    input: CreateCommunityReportInput,
  ): Promise<CommunityReport> {
    const { data, error } = await (this.client as any)
      .rpc("create_community_report_v1", {
        p_target_type: input.targetType,
        p_target_id: input.targetId,
        p_reason: input.reason,
        p_details: input.details ?? null,
      })
      .single();

    if (error) {
      throw mapDatabaseError(error, "community_reports.create");
    }

    return mapCommunityReportRow(data as CommunityReportDatabaseRow);
  }

  async listAdminReports(
    query: AdminCommunityReportQuery,
  ): Promise<AdminCommunityReportPage> {
    const { data, error } = await (this.client as any)
      .rpc("list_admin_community_reports_v1", {
        p_limit: query.limit,
        p_offset: (query.page - 1) * query.limit,
        p_status: query.status ?? null,
      });

    if (error) {
      throw mapDatabaseError(error, "community_reports.adminList");
    }

    const rows = (data ?? []) as CommunityReportDatabaseRow[];

    return {
      items: rows.map((row) => mapAdminCommunityReportRow(row)),
      page: query.page,
      limit: query.limit,
      total: Number(rows[0]?.total_count ?? 0),
    };
  }

  async moderateReport(
    reportId: string,
    action: CommunityModerationAction,
  ): Promise<void> {
    const { error } = await (this.client as any)
      .rpc("moderate_community_target_v1", {
        p_report_id: reportId,
        p_action: action,
      });

    if (error) {
      throw mapDatabaseError(error, "community_reports.moderate");
    }
  }

  async getReputation(userId: string): Promise<CommunityReputation> {
    const { data, error } = await (this.client as any)
      .rpc("get_community_reputation_v1", {
        p_user_id: userId,
      })
      .single();

    if (error) {
      throw mapDatabaseError(error, "community_reputation.get");
    }

    return mapCommunityReputationRow(data as CommunityReputationDatabaseRow);
  }

  async getAnalytics(): Promise<CommunityAnalytics> {
    const { data, error } = await (this.client as any)
      .rpc("get_community_analytics_v1")
      .single();

    if (error) {
      throw mapDatabaseError(error, "community_analytics.get");
    }

    return mapCommunityAnalyticsRow(data as CommunityAnalyticsDatabaseRow);
  }

  async getCommunityUserProfile(userId: string): Promise<CommunityUserProfile> {
    const { data, error } = await (this.client as any)
      .rpc("get_community_friendship_profile_v1", {
        p_user_id: userId,
      })
      .single();

    if (error) {
      throw mapDatabaseError(error, "community_friendships.profile");
    }

    return mapCommunityUserProfileRow(data as CommunityUserProfileDatabaseRow);
  }

  async createFriendRequest(targetUserId: string): Promise<CommunityUserProfile> {
    const { data, error } = await (this.client as any)
      .rpc("create_community_friend_request_v1", {
        p_user_id: targetUserId,
      })
      .single();

    if (error) {
      throw mapDatabaseError(error, "community_friendships.createRequest");
    }

    return mapCommunityUserProfileRow(data as CommunityUserProfileDatabaseRow);
  }

  async actOnFriendship(
    friendshipId: string,
    action: CommunityFriendshipAction,
  ): Promise<void> {
    const { error } = await (this.client as any)
      .rpc("act_on_community_friendship_v1", {
        p_friendship_id: friendshipId,
        p_action: action,
      });

    if (error) {
      throw mapDatabaseError(error, "community_friendships.act");
    }
  }

  async listFriendships(
    query: CommunityFriendListQuery,
  ): Promise<CommunityFriendListPage> {
    const { data, error } = await (this.client as any)
      .rpc("list_community_friendships_v1", {
        p_view: query.view,
        p_limit: query.limit,
        p_offset: (query.page - 1) * query.limit,
      });

    if (error) {
      throw mapDatabaseError(error, "community_friendships.list");
    }

    const rows = (data ?? []) as CommunityFriendListDatabaseRow[];

    return {
      items: rows.map((row) => mapCommunityFriendListRow(row)),
      page: query.page,
      limit: query.limit,
      total: Number(rows[0]?.total_count ?? 0),
    };
  }

  private async attachSignedMediaUrlsToItem(
    item: CommunityFeedItem,
    row: CommunityPostDatabaseRow,
  ): Promise<CommunityFeedItem> {
    if (!row.media_storage_path || item.media.length === 0) {
      return item;
    }

    const { data, error } = await this.storageClient.storage
      .from(COMMUNITY_MEDIA_BUCKET)
      .createSignedUrl(
        row.media_storage_path,
        COMMUNITY_PHOTO_SIGNED_URL_SECONDS,
      );

    if (error) {
      return item;
    }

    return {
      ...item,
      media: item.media.map((media) => ({
        ...media,
        url: data.signedUrl,
      })),
    };
  }

  private async attachSignedMediaUrlsToItems(
    items: CommunityFeedItem[],
    rows: CommunityPostDatabaseRow[],
  ): Promise<CommunityFeedItem[]> {
    const mediaRows = rows
      .map((row, index) => ({
        index,
        path: row.media_storage_path,
      }))
      .filter(
        (entry): entry is { index: number; path: string } =>
          typeof entry.path === "string" && entry.path.length > 0,
      );

    if (mediaRows.length === 0) {
      return items;
    }

    const { data, error } = await this.storageClient.storage
      .from(COMMUNITY_MEDIA_BUCKET)
      .createSignedUrls(
        mediaRows.map((entry) => entry.path),
        COMMUNITY_PHOTO_SIGNED_URL_SECONDS,
      );

    if (error || !data) {
      return items;
    }

    const signedUrlsByPath = new Map<string, string>();

    data.forEach((result, index) => {
      const path = mediaRows[index]?.path;

      if (path && result.signedUrl) {
        signedUrlsByPath.set(path, result.signedUrl);
      }
    });

    return items.map((item, index) => {
      const path = rows[index]?.media_storage_path;
      const signedUrl = path ? signedUrlsByPath.get(path) : undefined;

      if (!signedUrl || item.media.length === 0) {
        return item;
      }

      return {
        ...item,
        media: item.media.map((media) => ({
          ...media,
          url: signedUrl,
        })),
      };
    });
  }
}

function mapReactionSummaryRow(
  row: CommunityReactionSummaryDatabaseRow,
): CommunityReactionSummary {
  return {
    helpfulCount: row.helpful_count ?? 0,
    interestingCount: row.interesting_count ?? 0,
    confirmedCount: row.confirmed_count ?? 0,
    viewerReactions: row.viewer_reactions ?? [],
  };
}
