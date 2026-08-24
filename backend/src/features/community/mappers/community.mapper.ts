import type {
  CommunityComment,
  CommunityCommentDatabaseRow,
  CommuterRequestDatabaseRow,
  CommuterRequestItem,
  CommunityCulturalMapDatabaseRow,
  CommunityCulturalMapItem,
  CommunityFeedItem,
  CommunityPostDatabaseRow,
  CommunityPostAuthor,
  CommunityPublicLocation,
  CommunityPostMedia,
  CommunityDemandSignal,
  CommunityDemandSignalDatabaseRow,
  CommunityResponseMerchant,
  CommunityResponseMerchantDatabaseRow,
  CommunityUmkmResponse,
  CommunityUmkmResponseDatabaseRow,
  AdminCommunityReport,
  CommunityAnalytics,
  CommunityAnalyticsDatabaseRow,
  CommunityNotification,
  CommunityNotificationDatabaseRow,
  CommunityFriendListDatabaseRow,
  CommunityFriendListItem,
  CommunityUserProfile,
  CommunityUserProfileDatabaseRow,
  CommunityReport,
  CommunityReportDatabaseRow,
  CommunityReputation,
  CommunityReputationDatabaseRow,
} from "../types/community.types";

function resolveAuthor(
  row: CommunityPostDatabaseRow | CommunityCommentDatabaseRow,
): CommunityPostAuthor {
  return {
    id: row.author_id,
    displayName:
      row.author_display_name?.trim() ||
      "Pengguna GETRA",
    avatarUrl: row.author_avatar_url ?? null,
  };
}

function resolvePublicLocation(
  row: CommunityPostDatabaseRow,
): CommunityPublicLocation | null {
  if (
    row.location_longitude === null ||
    row.location_latitude === null ||
    row.location_visibility === null
  ) {
    return null;
  }

  return {
    longitude: row.location_longitude,
    latitude: row.location_latitude,
    visibility: row.location_visibility,
  };
}

function resolveMedia(row: CommunityPostDatabaseRow): CommunityPostMedia[] {
  if (
    row.media_id == null ||
    row.media_mime_type == null ||
    row.media_size_bytes == null ||
    row.media_width == null ||
    row.media_height == null
  ) {
    return [];
  }

  return [
    {
      id: row.media_id,
      type: "IMAGE",
      url: null,
      width: row.media_width,
      height: row.media_height,
      mimeType: row.media_mime_type,
      sizeBytes: row.media_size_bytes,
    },
  ];
}

export function mapCommunityPostRow(
  row: CommunityPostDatabaseRow,
): CommunityFeedItem {
  return {
    id: row.id,
    authorId: row.author_id,
    author: resolveAuthor(row),
    content: row.content,
    type: row.post_type ?? "GENERAL",
    category: row.category ?? null,
    location: resolvePublicLocation(row),
    media: resolveMedia(row),
    reactions: {
      helpfulCount: row.helpful_count ?? 0,
      interestingCount: row.interesting_count ?? 0,
      confirmedCount: row.confirmed_count ?? 0,
      viewerReactions: row.viewer_reactions ?? [],
    },
    replyCount: row.reply_count ?? 0,
    status: "VISIBLE",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCommunityCulturalMapRow(
  row: CommunityCulturalMapDatabaseRow,
): CommunityCulturalMapItem {
  return {
    id: row.id,
    authorId: row.author_id,
    author: {
      id: row.author_id,
      displayName:
        row.author_display_name?.trim() ||
        "Pengguna GETRA",
      avatarUrl: null,
    },
    content: row.content,
    type: "FINDING",
    category: row.category,
    location: {
      longitude: row.location_longitude,
      latitude: row.location_latitude,
      visibility: row.location_visibility,
    },
    confirmedCount: row.confirmed_count ?? 0,
    replyCount: row.reply_count ?? 0,
    createdAt: row.created_at,
  };
}

export function mapCommuterRequestRow(
  row: CommuterRequestDatabaseRow,
): CommuterRequestItem {
  return {
    id: row.id,
    authorId: row.author_id,
    author: {
      id: row.author_id,
      displayName:
        row.author_display_name?.trim() ||
        "Pengguna GETRA",
      avatarUrl: row.author_avatar_url ?? null,
    },
    title: row.title,
    description: row.description,
    category: row.category,
    maxBudget: Number(row.max_budget),
    location: {
      longitude: row.location_longitude,
      latitude: row.location_latitude,
      visibility: row.location_visibility,
    },
    radiusMeters: row.radius_meters,
    status: row.status,
    distanceMeters:
      row.distance_meters == null ? null : Number(row.distance_meters),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
  };
}

export function mapCommunityDemandSignalRow(
  row: CommunityDemandSignalDatabaseRow,
): CommunityDemandSignal {
  return {
    id: row.id,
    category: row.category,
    requestCount: Number(row.request_count),
    budgetMin: Number(row.budget_min),
    budgetMax: Number(row.budget_max),
    budgetMedian: Number(row.budget_median),
    center: {
      longitude: Number(row.center_longitude),
      latitude: Number(row.center_latitude),
      visibility: "APPROXIMATE",
    },
    clusterRadiusMeters: Number(row.cluster_radius_meters),
    windowStart: row.window_start,
    windowEnd: row.window_end,
    latestActivityAt: row.latest_activity_at,
    status: row.status,
  };
}

export function mapCommunityUmkmResponseRow(
  row: CommunityUmkmResponseDatabaseRow,
): CommunityUmkmResponse {
  return {
    id: row.id,
    signalId: row.signal_id,
    merchant: {
      id: row.merchant_id,
      displayName: row.merchant_display_name,
    },
    status: row.status,
    message: row.message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCommunityResponseMerchantRow(
  row: CommunityResponseMerchantDatabaseRow,
): CommunityResponseMerchant {
  return {
    id: row.id,
    displayName: row.display_name,
  };
}

export function mapCommunityCommentRow(
  row: CommunityCommentDatabaseRow,
): CommunityComment {
  return {
    id: row.id,
    postId: row.post_id,
    authorId: row.author_id,
    author: resolveAuthor(row),
    parentCommentId: row.parent_comment_id,
    content: row.content,
    depth: row.depth,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCommunityNotificationRow(
  row: CommunityNotificationDatabaseRow,
): CommunityNotification {
  return {
    id: row.id,
    type: row.type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    actorUserId: row.actor_user_id,
    actorDisplayName: row.actor_display_name,
    actorAvatarUrl: row.actor_avatar_url,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

export function mapCommunityReportRow(
  row: CommunityReportDatabaseRow,
): CommunityReport {
  return {
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    reason: row.reason,
    details: row.details,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function mapAdminCommunityReportRow(
  row: CommunityReportDatabaseRow,
): AdminCommunityReport {
  return {
    ...mapCommunityReportRow(row),
    reporterUserId: row.reporter_user_id ?? "",
    reporterDisplayName: row.reporter_display_name ?? null,
    moderationAction: row.moderation_action ?? null,
    reviewedBy: row.reviewed_by ?? null,
    reviewedAt: row.reviewed_at ?? null,
  };
}

export function mapCommunityReputationRow(
  row: CommunityReputationDatabaseRow,
): CommunityReputation {
  return {
    userId: row.user_id,
    confirmedContributions: row.confirmed_contributions ?? 0,
    helpfulReceived: row.helpful_received ?? 0,
    findingsCount: row.findings_count ?? 0,
    reputationLabel: row.reputation_label,
  };
}

export function mapCommunityAnalyticsRow(
  row: CommunityAnalyticsDatabaseRow,
): CommunityAnalytics {
  return {
    activePosts: row.active_posts ?? 0,
    activeFindings: row.active_findings ?? 0,
    activeRequests: row.active_requests ?? 0,
    activeSignals: row.active_signals ?? 0,
    umkmResponses: row.umkm_responses ?? 0,
    openReports: row.open_reports ?? 0,
    unreadNotifications: row.unread_notifications ?? 0,
  };
}

export function mapCommunityUserProfileRow(
  row: CommunityUserProfileDatabaseRow,
): CommunityUserProfile {
  return {
    userId: row.user_id,
    displayName: row.display_name?.trim() || "Pengguna GETRA",
    avatarUrl: row.avatar_url ?? null,
    reputationLabel: row.reputation_label,
    confirmedContributions: row.confirmed_contributions ?? 0,
    helpfulReceived: row.helpful_received ?? 0,
    findingsCount: row.findings_count ?? 0,
    friendCount: row.friend_count ?? 0,
    relationshipState: row.relationship_state,
    friendshipId: row.friendship_id ?? null,
  };
}

export function mapCommunityFriendListRow(
  row: CommunityFriendListDatabaseRow,
): CommunityFriendListItem {
  return {
    friendshipId: row.friendship_id,
    userId: row.user_id,
    displayName: row.display_name?.trim() || "Pengguna GETRA",
    avatarUrl: row.avatar_url ?? null,
    status: row.status,
    direction: row.direction,
    updatedAt: row.updated_at,
  };
}
