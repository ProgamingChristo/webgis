export type CommunityNavigationItem = {
  label: string;
  status: "available" | "planned";
};

export type CommunityShellState = {
  contributionCount: number;
  statusLabel: string;
};

export type CommunityPostAuthor = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

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
export type CommunityFriendshipAction =
  | "ACCEPT"
  | "DECLINE"
  | "CANCEL"
  | "UNFRIEND";
export type CommunityFriendshipView =
  | "FRIENDS"
  | "INCOMING"
  | "OUTGOING";
export type CommunityFriendshipStatus =
  | "PENDING"
  | "ACCEPTED"
  | "DECLINED"
  | "CANCELLED";
export type CommunityRelationshipState =
  | "SELF"
  | "NONE"
  | "PENDING_OUTGOING"
  | "PENDING_INCOMING"
  | "FRIENDS";

export type CommunityPostLocation = {
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

export type CommunityReactionSummary = {
  helpfulCount: number;
  interestingCount: number;
  confirmedCount: number;
  viewerReactions: CommunityReactionType[];
};

export type CommunityLocationInput = {
  longitude: number;
  latitude: number;
  visibility: CommunityLocationVisibility;
  accuracy_m?: number;
};

export type CommunityFeedItem = {
  id: string;
  authorId: string;
  author: CommunityPostAuthor;
  content: string;
  type: CommunityPostType;
  category: CommunityFindingCategory | null;
  location: CommunityPostLocation | null;
  media: CommunityPostMedia[];
  reactions: CommunityReactionSummary;
  replyCount: number;
  status: "VISIBLE";
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

export type CommunityFeedMeta = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

export type CommunityFeedResponse = {
  items: CommunityFeedItem[];
  meta: CommunityFeedMeta;
};

export type CommunityCommentResponse = {
  items: CommunityComment[];
  meta: CommunityFeedMeta;
};

export type CreateCommunityPostInput = {
  type?: CommunityPostType;
  content: string;
  category?: CommunityFindingCategory;
  location?: CommunityLocationInput;
  photo?: File;
};

export type CommuterRequestItem = {
  id: string;
  authorId: string;
  author: CommunityPostAuthor;
  title: string;
  description: string;
  category: CommuterRequestCategory;
  maxBudget: number;
  location: CommunityPostLocation;
  radiusMeters: number;
  status: CommuterRequestStatus;
  distanceMeters: number | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
};

export type CommuterRequestResponse = {
  items: CommuterRequestItem[];
  meta: CommunityFeedMeta;
};

export type CommunityDemandSignal = {
  id: string;
  category: CommuterRequestCategory;
  requestCount: number;
  budgetMin: number;
  budgetMax: number;
  budgetMedian: number;
  center: CommunityPostLocation;
  clusterRadiusMeters: number;
  windowStart: string;
  windowEnd: string;
  latestActivityAt: string;
  status: CommunityDemandSignalStatus;
};

export type CommunityDemandSignalResponse = {
  items: CommunityDemandSignal[];
  meta: CommunityFeedMeta;
};

export type CommunityResponseMerchant = {
  id: string;
  displayName: string;
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

export type CommunityDemandSignalResponsesPayload = {
  responses: CommunityUmkmResponse[];
  ownedMerchants: CommunityResponseMerchant[];
};

export type CreateCommunityUmkmResponseInput = {
  merchant_id: string;
  status: CommunityUmkmResponseStatus;
  message?: string | null;
};

export type CreateCommuterRequestInput = {
  title: string;
  description: string;
  category: CommuterRequestCategory;
  max_budget: number;
  location: CommunityLocationInput;
  radius_meters: number;
  expires_in_days: 1 | 3 | 7;
};

export type CreateCommunityCommentInput = {
  content: string;
  parentCommentId?: string;
};

export type CommunityCulturalMapItem = {
  id: string;
  authorId: string;
  author: CommunityPostAuthor;
  content: string;
  type: "FINDING";
  category: CommunityFindingCategory;
  location: CommunityPostLocation;
  confirmedCount: number;
  replyCount: number;
  createdAt: string;
};

export type CommunityNotification = {
  id: string;
  type: CommunityNotificationType;
  entityType: "POST" | "COMMENT" | "DEMAND_SIGNAL" | "UMKM_RESPONSE";
  entityId: string;
  actorUserId: string | null;
  actorDisplayName: string | null;
  actorAvatarUrl: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  readAt: string | null;
};

export type CommunityNotificationResponse = {
  items: CommunityNotification[];
  page: number;
  limit: number;
  total: number;
  unreadCount: number;
};

export type CreateCommunityReportInput = {
  target_type: CommunityReportTargetType;
  target_id: string;
  reason: CommunityReportReason;
  details?: string | null;
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

export type CommunityFriendListResponse = {
  items: CommunityFriendListItem[];
  page: number;
  limit: number;
  total: number;
};
