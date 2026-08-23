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
