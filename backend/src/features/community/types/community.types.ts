export type CommunityPostStatus = "VISIBLE";
export type CommunityLocationVisibility = "APPROXIMATE" | "EXACT";
export type CommunityReactionType = "HELPFUL" | "INTERESTING" | "CONFIRMED";
export type CommunityPostType = "GENERAL" | "FINDING";
export type CommunityFindingCategory =
  | "LEGENDARY_EATERY"
  | "LOCAL_FOOD"
  | "CRAFT_CENTER"
  | "LANDMARK"
  | "LOCAL_HISTORY"
  | "COMMUNITY_ACTIVITY";
export type CommuterRequestCategory =
  | "FOOD"
  | "DRINK"
  | "DAILY_NEEDS"
  | "SERVICE"
  | "OTHER_LOCAL_NEED";
export type CommuterRequestStatus = "ACTIVE" | "CLOSED" | "EXPIRED";

export type CommunityPublicLocation = {
  longitude: number;
  latitude: number;
  visibility: CommunityLocationVisibility;
};

export type CommunityPostMedia = {
  id: string;
  type: "IMAGE";
  url: string | null;
  width: number;
  height: number;
  mimeType: "image/webp";
  sizeBytes: number;
};

export type CommunityStoredMedia = {
  id: string;
  storagePath: string;
  mimeType: "image/webp";
  sizeBytes: number;
  width: number;
  height: number;
};

export type CommunityPhotoUpload = {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
};

export type CommunityPostAuthor = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

export type CommunityReactionSummary = {
  helpfulCount: number;
  interestingCount: number;
  confirmedCount: number;
  viewerReactions: CommunityReactionType[];
};

export type CommunityFeedItem = {
  id: string;
  authorId: string;
  author: CommunityPostAuthor;
  content: string;
  type: CommunityPostType;
  category: CommunityFindingCategory | null;
  location: CommunityPublicLocation | null;
  media: CommunityPostMedia[];
  reactions: CommunityReactionSummary;
  replyCount: number;
  status: CommunityPostStatus;
  createdAt: string;
  updatedAt: string;
};

export type CommunityComment = {
  id: string;
  postId: string;
  authorId: string;
  author: CommunityPostAuthor;
  parentCommentId: string | null;
  content: string;
  depth: 0 | 1 | 2;
  createdAt: string;
  updatedAt: string;
};

export type CommunityFeedQuery = {
  page: number;
  limit: number;
  type?: CommunityPostType;
  category?: CommunityFindingCategory;
};

export type CommuterRequestQuery = {
  page: number;
  limit: number;
  category?: CommuterRequestCategory;
  longitude?: number;
  latitude?: number;
  radius_meters?: number;
};

export type CommuterRequestPage = {
  items: CommuterRequestItem[];
  page: number;
  limit: number;
  total: number;
};

export type CommunityFeedPage = {
  items: CommunityFeedItem[];
  page: number;
  limit: number;
  total: number;
};

export type CommunityCommentQuery = {
  page: number;
  limit: number;
};

export type CommunityCommentPage = {
  items: CommunityComment[];
  page: number;
  limit: number;
  total: number;
};

export type CreateCommunityCommentInput = {
  postId: string;
  authorId: string;
  content: string;
  parentCommentId?: string;
};

export type CreateCommunityPostInput = {
  authorId: string;
  postId?: string;
  content: string;
  type?: CommunityPostType;
  category?: CommunityFindingCategory;
  location?: {
    longitude: number;
    latitude: number;
    visibility: CommunityLocationVisibility;
    accuracy_m?: number;
  };
  media?: CommunityStoredMedia;
};

export type CreateCommuterRequestInput = {
  authorId: string;
  requestId?: string;
  title: string;
  description: string;
  category: CommuterRequestCategory;
  maxBudget: number;
  location: {
    longitude: number;
    latitude: number;
    visibility: CommunityLocationVisibility;
    accuracy_m?: number;
  };
  radiusMeters: number;
  expiresInDays: 1 | 3 | 7;
};

export type CommunityPostRepository = {
  createPost(input: CreateCommunityPostInput): Promise<CommunityFeedItem>;
  listFeed(query: CommunityFeedQuery): Promise<CommunityFeedPage>;
  getPost(postId: string): Promise<CommunityFeedItem>;
  listComments(
    postId: string,
    query: CommunityCommentQuery,
  ): Promise<CommunityCommentPage>;
  createComment(
    input: CreateCommunityCommentInput,
  ): Promise<CommunityComment>;
  addReaction(
    postId: string,
    reactionType: CommunityReactionType,
  ): Promise<CommunityReactionSummary>;
  removeReaction(
    postId: string,
    reactionType: CommunityReactionType,
  ): Promise<CommunityReactionSummary>;
  listCulturalMap(
    query: CommunityCulturalMapQuery,
  ): Promise<CommunityCulturalMapItem[]>;
  createCommuterRequest(
    input: CreateCommuterRequestInput,
  ): Promise<CommuterRequestItem>;
  listCommuterRequests(
    query: CommuterRequestQuery,
  ): Promise<CommuterRequestPage>;
  getCommuterRequest(requestId: string): Promise<CommuterRequestItem>;
};

export type CommunityPostDatabaseRow = {
  id: string;
  author_id: string;
  content: string;
  post_type?: CommunityPostType | null;
  category?: CommunityFindingCategory | null;
  created_at: string;
  updated_at: string;
  author_display_name: string | null;
  author_avatar_url: string | null;
  location_longitude: number | null;
  location_latitude: number | null;
  location_visibility: CommunityLocationVisibility | null;
  media_id: string | null;
  media_storage_path: string | null;
  media_mime_type: "image/webp" | null;
  media_size_bytes: number | null;
  media_width: number | null;
  media_height: number | null;
  helpful_count?: number | null;
  interesting_count?: number | null;
  confirmed_count?: number | null;
  viewer_reactions?: CommunityReactionType[] | null;
  reply_count?: number | null;
  total_count?: number | null;
};

export type CommunityCulturalMapQuery = {
  west: number;
  south: number;
  east: number;
  north: number;
  categories?: CommunityFindingCategory[];
  limit: number;
};

export type CommunityCulturalMapItem = {
  id: string;
  authorId: string;
  author: CommunityPostAuthor;
  content: string;
  type: "FINDING";
  category: CommunityFindingCategory;
  location: CommunityPublicLocation;
  confirmedCount: number;
  replyCount: number;
  createdAt: string;
};

export type CommunityCulturalMapDatabaseRow = {
  id: string;
  author_id: string;
  content: string;
  post_type: "FINDING";
  category: CommunityFindingCategory;
  created_at: string;
  author_display_name: string | null;
  location_longitude: number;
  location_latitude: number;
  location_visibility: CommunityLocationVisibility;
  confirmed_count: number | null;
  reply_count: number | null;
};

export type CommuterRequestItem = {
  id: string;
  authorId: string;
  author: CommunityPostAuthor;
  title: string;
  description: string;
  category: CommuterRequestCategory;
  maxBudget: number;
  location: CommunityPublicLocation;
  radiusMeters: number;
  status: CommuterRequestStatus;
  distanceMeters: number | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
};

export type CommuterRequestDatabaseRow = {
  id: string;
  author_id: string;
  title: string;
  description: string;
  category: CommuterRequestCategory;
  max_budget: number;
  location_longitude: number;
  location_latitude: number;
  location_visibility: CommunityLocationVisibility;
  radius_meters: number;
  status: CommuterRequestStatus;
  created_at: string;
  updated_at: string;
  expires_at: string;
  author_display_name: string | null;
  author_avatar_url: string | null;
  distance_meters: number | null;
  total_count?: number | null;
};

export type CommunityCommentDatabaseRow = {
  id: string;
  post_id: string;
  author_id: string;
  parent_comment_id: string | null;
  content: string;
  depth: 0 | 1 | 2;
  created_at: string;
  updated_at: string;
  author_display_name: string | null;
  author_avatar_url: string | null;
  total_root_count?: number | null;
};

export type CommunityReactionSummaryDatabaseRow = {
  helpful_count: number | null;
  interesting_count: number | null;
  confirmed_count: number | null;
  viewer_reactions: CommunityReactionType[] | null;
};
