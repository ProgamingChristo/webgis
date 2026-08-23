import type { SupabaseClient } from "@supabase/supabase-js";

import { mapDatabaseError } from "@/src/repositories/errors";
import {
  COMMUNITY_MEDIA_BUCKET,
  COMMUNITY_PHOTO_SIGNED_URL_SECONDS,
} from "../constants/community.constants";
import {
  mapCommunityCulturalMapRow,
  mapCommunityCommentRow,
  mapCommunityPostRow,
  mapCommuterRequestRow,
} from "../mappers/community.mapper";
import type {
  CommunityComment,
  CommunityCommentDatabaseRow,
  CommunityCommentPage,
  CommunityCommentQuery,
  CommunityCulturalMapDatabaseRow,
  CommunityCulturalMapItem,
  CommunityCulturalMapQuery,
  CommunityFeedItem,
  CommunityFeedPage,
  CommunityFeedQuery,
  CommunityPostDatabaseRow,
  CommunityPostRepository,
  CommunityReactionSummary,
  CommunityReactionSummaryDatabaseRow,
  CommunityReactionType,
  CommuterRequestDatabaseRow,
  CommuterRequestItem,
  CommuterRequestPage,
  CommuterRequestQuery,
  CreateCommuterRequestInput,
  CreateCommunityCommentInput,
  CreateCommunityPostInput,
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
