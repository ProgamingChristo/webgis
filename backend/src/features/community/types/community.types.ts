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
export type CommunityDemandSignalStatus = "ACTIVE" | "STALE" | "CLOSED";
export type CommunityUmkmResponseStatus =
  | "AVAILABLE"
  | "WILL_TRY"
  | "PREPARING"
  | "UNAVAILABLE";
export type CommunityNotificationType =
  | "POST_REPLY"
  | "COMMENT_REPLY"
  | "POST_CONFIRMED"
  | "UMKM_RESPONSE"
  | "FRIEND_REQUEST"
  | "FRIEND_ACCEPTED";
export type CommunityReportTargetType = "POST" | "COMMENT" | "UMKM_RESPONSE";
export type CommunityReportReason =
  | "SPAM"
  | "INCORRECT_INFORMATION"
  | "INVALID_PRICE"
  | "INAPPROPRIATE_CONTENT"
  | "WRONG_LOCATION"
  | "DUPLICATE";
export type CommunityReportStatus =
  | "OPEN"
  | "REVIEWED"
  | "ACTIONED"
  | "DISMISSED";
export type CommunityModerationAction =
  | "HIDE"
  | "REMOVE"
  | "RESTORE"
  | "DISMISS";
export type CommunityFriendshipStatus =
  | "PENDING"
  | "ACCEPTED"
  | "DECLINED"
  | "CANCELLED";
export type CommunityFriendshipAction =
  | "ACCEPT"
  | "DECLINE"
  | "CANCEL"
  | "UNFRIEND";
export type CommunityFriendshipView =
  | "FRIENDS"
  | "INCOMING"
  | "OUTGOING";
export type CommunityRelationshipState =
  | "SELF"
  | "NONE"
  | "PENDING_OUTGOING"
  | "PENDING_INCOMING"
  | "FRIENDS";

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

export type CommunityDemandSignalQuery = {
  page: number;
  limit: number;
  category?: CommuterRequestCategory;
};

export type CommunityDemandSignalPage = {
  items: CommunityDemandSignal[];
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

export type CreateCommunityUmkmResponseInput = {
  signalId: string;
  merchantId: string;
  status: CommunityUmkmResponseStatus;
  message?: string | null;
};

export type CommunityNotification = {
  id: string;
  type: CommunityNotificationType;
  entityType: "POST" | "COMMENT" | "DEMAND_SIGNAL" | "UMKM_RESPONSE" | "FRIENDSHIP";
  entityId: string;
  actorUserId: string | null;
  actorDisplayName: string | null;
  actorAvatarUrl: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  readAt: string | null;
};

export type CommunityNotificationPage = {
  items: CommunityNotification[];
  page: number;
  limit: number;
  total: number;
  unreadCount: number;
};

export type CommunityNotificationQuery = {
  page: number;
  limit: number;
};

export type CommunityReport = {
  id: string;
  targetType: CommunityReportTargetType;
  targetId: string;
  reason: CommunityReportReason;
  details: string | null;
  status: CommunityReportStatus;
  createdAt: string;
};

export type CreateCommunityReportInput = {
  targetType: CommunityReportTargetType;
  targetId: string;
  reason: CommunityReportReason;
  details?: string | null;
};

export type AdminCommunityReport = CommunityReport & {
  reporterUserId: string;
  reporterDisplayName: string | null;
  moderationAction: CommunityModerationAction | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
};

export type AdminCommunityReportPage = {
  items: AdminCommunityReport[];
  page: number;
  limit: number;
  total: number;
};

export type AdminCommunityReportQuery = {
  page: number;
  limit: number;
  status?: CommunityReportStatus;
};

export type CommunityReputation = {
  userId: string;
  confirmedContributions: number;
  helpfulReceived: number;
  findingsCount: number;
  reputationLabel: string;
};

export type CommunityAnalytics = {
  activePosts: number;
  activeFindings: number;
  activeRequests: number;
  activeSignals: number;
  umkmResponses: number;
  openReports: number;
  unreadNotifications: number;
};

export type CommunityUserProfile = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  reputationLabel: string;
  confirmedContributions: number;
  helpfulReceived: number;
  findingsCount: number;
  friendCount: number;
  relationshipState: CommunityRelationshipState;
  friendshipId: string | null;
};

export type CommunityFriendListItem = {
  friendshipId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  status: CommunityFriendshipStatus;
  direction: "INCOMING" | "OUTGOING";
  updatedAt: string;
};

export type CommunityFriendListPage = {
  items: CommunityFriendListItem[];
  page: number;
  limit: number;
  total: number;
};

export type CommunityFriendListQuery = {
  view: CommunityFriendshipView;
  page: number;
  limit: number;
};

export type CommunityResponseMerchant = {
  id: string;
  displayName: string;
};

export type CommunityPostRepository = {
  createPost(input: CreateCommunityPostInput): Promise<CommunityFeedItem>;
  listFeed(query: CommunityFeedQuery): Promise<CommunityFeedPage>;
  getPost(postId: string): Promise<CommunityFeedItem>;
  deletePost(postId: string): Promise<{ deletionActorRole: "OWNER" | "ADMIN" }>;
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
  listDemandSignals(
    query: CommunityDemandSignalQuery,
  ): Promise<CommunityDemandSignalPage>;
  getDemandSignal(signalId: string): Promise<CommunityDemandSignal>;
  listDemandSignalResponses(
    signalId: string,
  ): Promise<CommunityUmkmResponse[]>;
  listResponseMerchants(): Promise<CommunityResponseMerchant[]>;
  upsertDemandSignalResponse(
    input: CreateCommunityUmkmResponseInput,
  ): Promise<CommunityUmkmResponse>;
  listNotifications(
    query: CommunityNotificationQuery,
  ): Promise<CommunityNotificationPage>;
  markNotificationRead(notificationId: string): Promise<void>;
  markAllNotificationsRead(): Promise<void>;
  createReport(input: CreateCommunityReportInput): Promise<CommunityReport>;
  listAdminReports(
    query: AdminCommunityReportQuery,
  ): Promise<AdminCommunityReportPage>;
  moderateReport(
    reportId: string,
    action: CommunityModerationAction,
  ): Promise<void>;
  getReputation(userId: string): Promise<CommunityReputation>;
  getAnalytics(): Promise<CommunityAnalytics>;
  getCommunityUserProfile(userId: string): Promise<CommunityUserProfile>;
  createFriendRequest(targetUserId: string): Promise<CommunityUserProfile>;
  actOnFriendship(
    friendshipId: string,
    action: CommunityFriendshipAction,
  ): Promise<void>;
  listFriendships(query: CommunityFriendListQuery): Promise<CommunityFriendListPage>;
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

export type CommunityDemandSignal = {
  id: string;
  category: CommuterRequestCategory;
  requestCount: number;
  budgetMin: number;
  budgetMax: number;
  budgetMedian: number;
  center: CommunityPublicLocation;
  clusterRadiusMeters: number;
  windowStart: string;
  windowEnd: string;
  latestActivityAt: string;
  status: CommunityDemandSignalStatus;
};

export type CommunityDemandSignalDatabaseRow = {
  id: string;
  category: CommuterRequestCategory;
  request_count: number;
  budget_min: number;
  budget_max: number;
  budget_median: number;
  center_longitude: number;
  center_latitude: number;
  cluster_radius_meters: number;
  window_start: string;
  window_end: string;
  latest_activity_at: string;
  status: CommunityDemandSignalStatus;
  total_count?: number | null;
};

export type CommunityUmkmResponse = {
  id: string;
  signalId: string;
  merchant: CommunityResponseMerchant;
  status: CommunityUmkmResponseStatus;
  message: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommunityUmkmResponseDatabaseRow = {
  id: string;
  signal_id: string;
  merchant_id: string;
  merchant_display_name: string;
  status: CommunityUmkmResponseStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
};

export type CommunityResponseMerchantDatabaseRow = {
  id: string;
  display_name: string;
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

export type CommunityNotificationDatabaseRow = {
  id: string;
  type: CommunityNotificationType;
  entity_type: "POST" | "COMMENT" | "DEMAND_SIGNAL" | "UMKM_RESPONSE" | "FRIENDSHIP";
  entity_id: string;
  actor_user_id: string | null;
  actor_display_name: string | null;
  actor_avatar_url: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  read_at: string | null;
  total_count?: number | null;
};

export type CommunityReportDatabaseRow = {
  id: string;
  reporter_user_id?: string | null;
  reporter_display_name?: string | null;
  target_type: CommunityReportTargetType;
  target_id: string;
  reason: CommunityReportReason;
  details: string | null;
  status: CommunityReportStatus;
  moderation_action?: CommunityModerationAction | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  total_count?: number | null;
};

export type CommunityReputationDatabaseRow = {
  user_id: string;
  confirmed_contributions: number | null;
  helpful_received: number | null;
  findings_count: number | null;
  reputation_label: string;
};

export type CommunityAnalyticsDatabaseRow = {
  active_posts: number | null;
  active_findings: number | null;
  active_requests: number | null;
  active_signals: number | null;
  umkm_responses: number | null;
  open_reports: number | null;
  unread_notifications: number | null;
};

export type CommunityUserProfileDatabaseRow = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  reputation_label: string;
  confirmed_contributions: number | null;
  helpful_received: number | null;
  findings_count: number | null;
  friend_count: number | null;
  relationship_state: CommunityRelationshipState;
  friendship_id: string | null;
};

export type CommunityFriendListDatabaseRow = {
  friendship_id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  status: CommunityFriendshipStatus;
  direction: "INCOMING" | "OUTGOING";
  updated_at: string;
  total_count?: number | null;
};
