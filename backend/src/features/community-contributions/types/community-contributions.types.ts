import type {
  COMMUNITY_CONTRIBUTION_FACILITY_TYPES,
  COMMUNITY_CONTRIBUTION_REJECTION_REASONS,
  COMMUNITY_CONTRIBUTION_REPORT_TYPES,
  COMMUNITY_CONTRIBUTION_STATUSES,
} from "../constants/community-contributions.constants";

export type CommunityContributionReportType =
  (typeof COMMUNITY_CONTRIBUTION_REPORT_TYPES)[number];

export type CommunityContributionStatus =
  (typeof COMMUNITY_CONTRIBUTION_STATUSES)[number];

export type CommunityContributionFacilityType =
  (typeof COMMUNITY_CONTRIBUTION_FACILITY_TYPES)[number];

export type CommunityContributionRejectionReason =
  (typeof COMMUNITY_CONTRIBUTION_REJECTION_REASONS)[number];

export type CommunityContributionPoint = {
  longitude: number;
  latitude: number;
};

export type CommunityContributionReportData =
  | {
      details: string;
      pedestrian_edge_id?: string;
    }
  | {
      facility_type: CommunityContributionFacilityType;
      details: string;
    }
  | {
      notes?: string;
    }
  | {
      reported_price_level: string;
      notes?: string;
    }
  | {
      reported_opening_hours: Record<string, string>;
      notes?: string;
    };

export type CommunityContribution = {
  id: string;
  authorId: string;
  reportType: CommunityContributionReportType;
  status: CommunityContributionStatus;
  location: CommunityContributionPoint;
  observedAt: string;
  reportData: CommunityContributionReportData;
  targetMerchantId: string | null;
  reportedNewLocation: CommunityContributionPoint | null;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  reviewReason: CommunityContributionRejectionReason | null;
};

export type CommunityContributionDatabaseRow = {
  id: string;
  author_id: string;
  report_type: CommunityContributionReportType;
  status: CommunityContributionStatus;
  location_longitude: number;
  location_latitude: number;
  observed_at: string;
  report_data: CommunityContributionReportData;
  target_merchant_id: string | null;
  reported_new_longitude: number | null;
  reported_new_latitude: number | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  review_reason: CommunityContributionRejectionReason | null;
};

export type CreateCommunityContributionInput = {
  authorId: string;
  reportType: CommunityContributionReportType;
  location: CommunityContributionPoint;
  observedAt: string;
  reportData: CommunityContributionReportData;
  targetMerchantId?: string;
  reportedNewLocation?: CommunityContributionPoint;
};

export type CommunityContributionHistoryItem = {
  id: string;
  reportType: CommunityContributionReportType;
  status: CommunityContributionStatus;
  observedAt: string;
  submittedAt: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewReason: CommunityContributionRejectionReason | null;
  locationSummary: string;
  targetMerchantId: string | null;
  targetName: string | null;
  pointsAwarded: number;
};

export type CommunityContributionSummary = {
  totalContributions: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  contributionPoints: number;
  trustScore: number;
  reviewedContributions: number;
  trustApprovedContributions: number;
  trustRejectedContributions: number;
};

export type CommunityContributionPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

export type CommunityContributionHistoryResult = {
  items: CommunityContributionHistoryItem[];
  summary: CommunityContributionSummary;
  pagination: CommunityContributionPagination;
};

export type CommunityContributionHistoryQuery = {
  page: number;
  limit: number;
  status?: CommunityContributionStatus;
  reportType?: CommunityContributionReportType;
};

export type CommunityContributionMapQuery = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
  limit: number;
};

export type CommunityContributionMapProjectionSource =
  | "CANONICAL_MERCHANT_LOCATION"
  | "CONFIRMED_REPORTED_MERCHANT_LOCATION"
  | "CONFIRMED_OBSERVATION_LOCATION";

export type CommunityContributionMapFeature = {
  id: string;
  reportType: CommunityContributionReportType;
  observedAt: string;
  reviewedAt: string | null;
  targetMerchantId: string | null;
  targetName: string | null;
  location: CommunityContributionPoint;
  projectionSource: CommunityContributionMapProjectionSource;
};

export type CommunityContributionMapFeatureDatabaseRow = {
  id: string;
  report_type: CommunityContributionReportType;
  observed_at: string;
  reviewed_at: string | null;
  target_merchant_id: string | null;
  target_name: string | null;
  public_longitude: number;
  public_latitude: number;
  projection_source: CommunityContributionMapProjectionSource;
};

export type CommunityContributionHistoryDatabaseRow = {
  id: string;
  report_type: CommunityContributionReportType;
  status: CommunityContributionStatus;
  observed_at: string;
  submitted_at: string;
  created_at: string;
  reviewed_at: string | null;
  review_reason: CommunityContributionRejectionReason | null;
  location_summary: string;
  target_merchant_id: string | null;
  target_name: string | null;
  points_awarded: number;
  total_count: number;
};

export type CommunityContributionSummaryDatabaseRow = {
  total_contributions: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  contribution_points: number;
  trust_score: number;
  reviewed_contributions: number;
  trust_approved_contributions: number;
  trust_rejected_contributions: number;
};

export type CommunityContributionModerationQueueItem = {
  id: string;
  authorId: string;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
  reportType: CommunityContributionReportType;
  status: CommunityContributionStatus;
  observedAt: string;
  submittedAt: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewReason: CommunityContributionRejectionReason | null;
  locationSummary: string;
  targetMerchantId: string | null;
  targetName: string | null;
  pointsAwarded: number;
};

export type CommunityContributionModerationDetail =
  CommunityContribution & {
    authorDisplayName: string;
    authorAvatarUrl: string | null;
    targetName: string | null;
    pointsAwarded: number;
  };

export type CommunityContributionModerationQuery = {
  page: number;
  limit: number;
  status?: CommunityContributionStatus;
  reportType?: CommunityContributionReportType;
};

export type CommunityContributionModerationResult = {
  items: CommunityContributionModerationQueueItem[];
  pagination: CommunityContributionPagination;
};

export type CommunityContributionModerationQueueDatabaseRow = {
  id: string;
  author_id: string;
  author_display_name: string;
  author_avatar_url: string | null;
  report_type: CommunityContributionReportType;
  status: CommunityContributionStatus;
  observed_at: string;
  submitted_at: string;
  created_at: string;
  reviewed_at: string | null;
  review_reason: CommunityContributionRejectionReason | null;
  location_summary: string;
  target_merchant_id: string | null;
  target_name: string | null;
  points_awarded: number;
  total_count: number;
};

export type CommunityContributionModerationDetailDatabaseRow = {
  id: string;
  author_id: string;
  author_display_name: string;
  author_avatar_url: string | null;
  report_type: CommunityContributionReportType;
  status: CommunityContributionStatus;
  location_longitude: number;
  location_latitude: number;
  observed_at: string;
  report_data: CommunityContributionReportData;
  target_merchant_id: string | null;
  target_name: string | null;
  reported_new_longitude: number | null;
  reported_new_latitude: number | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  review_reason: CommunityContributionRejectionReason | null;
  points_awarded: number;
};

export interface CommunityContributionRepository {
  create(
    input: CreateCommunityContributionInput,
  ): Promise<CommunityContribution>;
  getOwn(contributionId: string): Promise<CommunityContribution>;
  listOwnHistory(
    query: CommunityContributionHistoryQuery,
  ): Promise<CommunityContributionHistoryResult>;
  listMapFeatures(
    query: CommunityContributionMapQuery,
  ): Promise<CommunityContributionMapFeature[]>;
  listModerationQueue(
    query: CommunityContributionModerationQuery,
  ): Promise<CommunityContributionModerationResult>;
  getModerationDetail(
    contributionId: string,
  ): Promise<CommunityContributionModerationDetail>;
  confirm(
    contributionId: string,
  ): Promise<CommunityContributionModerationDetail>;
  reject(
    contributionId: string,
    reason: CommunityContributionRejectionReason,
  ): Promise<CommunityContributionModerationDetail>;
}
