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
