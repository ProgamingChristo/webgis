export type CommunityContributionReportType =
  | "SIDEWALK_OBSTRUCTION"
  | "RAMP_OR_GUIDING_BLOCK"
  | "CROSSING"
  | "MERCHANT_LOCATION_CHANGED"
  | "MERCHANT_PRICE_CHANGED"
  | "MERCHANT_HOURS_CHANGED";

export type CommunityContributionFacilityType = "RAMP" | "GUIDING_BLOCK";

export type CommunityContributionPoint = {
  longitude: number;
  latitude: number;
};

export type CommunityContributionStatus = "PENDING" | "APPROVED" | "REJECTED";

export type CommunityContributionRejectionReason =
  | "DUPLICATE"
  | "INSUFFICIENT_INFORMATION"
  | "INVALID_LOCATION"
  | "INVALID_TARGET"
  | "OUTDATED_INFORMATION"
  | "OTHER";

export type CommunityContribution = {
  id: string;
  authorId: string;
  reportType: CommunityContributionReportType;
  status: CommunityContributionStatus;
  location: CommunityContributionPoint;
  observedAt: string;
  reportData: unknown;
  targetMerchantId: string | null;
  reportedNewLocation: CommunityContributionPoint | null;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  reviewReason: CommunityContributionRejectionReason | null;
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

export type CommunityContributionHistoryPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

export type CommunityContributionHistoryResult = {
  items: CommunityContributionHistoryItem[];
  summary: CommunityContributionSummary;
  pagination: CommunityContributionHistoryPagination;
};

export type CommunityContributionHistoryFilters = {
  status?: CommunityContributionStatus;
  reportType?: CommunityContributionReportType;
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

export type CommunityContributionMapBounds = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
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

export type CommunityContributionModerationDetail = CommunityContribution & {
  authorDisplayName: string;
  authorAvatarUrl: string | null;
  targetName: string | null;
  pointsAwarded: number;
};

export type CommunityContributionModerationResult = {
  items: CommunityContributionModerationQueueItem[];
  pagination: CommunityContributionHistoryPagination;
};

export type CommunityContributionModerationFilters = {
  status?: CommunityContributionStatus;
  reportType?: CommunityContributionReportType;
};

export type CommunityContributionMerchant = {
  id: string;
  name: string;
  address: string | null;
  priceLevel: string | null;
  openingHours: Record<string, string> | null;
};

export type CommunityContributionFormState = {
  reportType: CommunityContributionReportType;
  location: CommunityContributionPoint | null;
  reportedNewLocation: CommunityContributionPoint | null;
  observedAtLocal: string;
  details: string;
  notes: string;
  facilityType: CommunityContributionFacilityType;
  targetMerchant: CommunityContributionMerchant | null;
  reportedPriceLevel: string;
  reportedOpeningHours: Record<string, string>;
};

export type CreateCommunityContributionPayload =
  | {
      report_type: "SIDEWALK_OBSTRUCTION";
      location: CommunityContributionPoint;
      observed_at: string;
      details: string;
    }
  | {
      report_type: "RAMP_OR_GUIDING_BLOCK";
      location: CommunityContributionPoint;
      observed_at: string;
      facility_type: CommunityContributionFacilityType;
      details: string;
    }
  | {
      report_type: "CROSSING";
      location: CommunityContributionPoint;
      observed_at: string;
      details: string;
    }
  | {
      report_type: "MERCHANT_LOCATION_CHANGED";
      location: CommunityContributionPoint;
      observed_at: string;
      target_merchant_id: string;
      reported_new_location: CommunityContributionPoint;
      notes?: string;
    }
  | {
      report_type: "MERCHANT_PRICE_CHANGED";
      location: CommunityContributionPoint;
      observed_at: string;
      target_merchant_id: string;
      reported_price_level: string;
      notes?: string;
    }
  | {
      report_type: "MERCHANT_HOURS_CHANGED";
      location: CommunityContributionPoint;
      observed_at: string;
      target_merchant_id: string;
      reported_opening_hours: Record<string, string>;
      notes?: string;
    };
