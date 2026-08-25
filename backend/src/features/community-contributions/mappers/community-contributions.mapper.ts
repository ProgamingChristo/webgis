import type {
  CommunityContribution,
  CommunityContributionDatabaseRow,
  CommunityContributionHistoryDatabaseRow,
  CommunityContributionHistoryItem,
  CommunityContributionMapFeature,
  CommunityContributionMapFeatureDatabaseRow,
  CommunityContributionModerationDetail,
  CommunityContributionModerationDetailDatabaseRow,
  CommunityContributionModerationQueueDatabaseRow,
  CommunityContributionModerationQueueItem,
  CommunityContributionSummary,
  CommunityContributionSummaryDatabaseRow,
} from "../types/community-contributions.types";

export function mapCommunityContributionRow(
  row: CommunityContributionDatabaseRow,
): CommunityContribution {
  return {
    id: row.id,
    authorId: row.author_id,
    reportType: row.report_type,
    status: row.status,
    location: {
      longitude: row.location_longitude,
      latitude: row.location_latitude,
    },
    observedAt: row.observed_at,
    reportData: row.report_data,
    targetMerchantId: row.target_merchant_id,
    reportedNewLocation:
      row.reported_new_longitude === null ||
      row.reported_new_latitude === null
        ? null
        : {
            longitude: row.reported_new_longitude,
            latitude: row.reported_new_latitude,
          },
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reviewedAt: row.reviewed_at,
    reviewReason: row.review_reason,
  };
}

export function mapCommunityContributionHistoryRow(
  row: CommunityContributionHistoryDatabaseRow,
): CommunityContributionHistoryItem {
  return {
    id: row.id,
    reportType: row.report_type,
    status: row.status,
    observedAt: row.observed_at,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reviewReason: row.review_reason,
    locationSummary: row.location_summary,
    targetMerchantId: row.target_merchant_id,
    targetName: row.target_name,
    pointsAwarded: row.points_awarded,
  };
}

export function mapCommunityContributionMapFeatureRow(
  row: CommunityContributionMapFeatureDatabaseRow,
): CommunityContributionMapFeature {
  return {
    id: row.id,
    reportType: row.report_type,
    observedAt: row.observed_at,
    reviewedAt: row.reviewed_at,
    targetMerchantId: row.target_merchant_id,
    targetName: row.target_name,
    location: {
      longitude: row.public_longitude,
      latitude: row.public_latitude,
    },
    projectionSource: row.projection_source,
  };
}

export function mapCommunityContributionModerationQueueRow(
  row: CommunityContributionModerationQueueDatabaseRow,
): CommunityContributionModerationQueueItem {
  return {
    id: row.id,
    authorId: row.author_id,
    authorDisplayName: row.author_display_name,
    authorAvatarUrl: row.author_avatar_url,
    reportType: row.report_type,
    status: row.status,
    observedAt: row.observed_at,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reviewReason: row.review_reason,
    locationSummary: row.location_summary,
    targetMerchantId: row.target_merchant_id,
    targetName: row.target_name,
    pointsAwarded: row.points_awarded,
  };
}

export function mapCommunityContributionModerationDetailRow(
  row: CommunityContributionModerationDetailDatabaseRow,
): CommunityContributionModerationDetail {
  return {
    ...mapCommunityContributionRow(row),
    authorDisplayName: row.author_display_name,
    authorAvatarUrl: row.author_avatar_url,
    targetName: row.target_name,
    pointsAwarded: row.points_awarded,
  };
}

export function mapCommunityContributionSummaryRow(
  row: CommunityContributionSummaryDatabaseRow | null,
): CommunityContributionSummary {
  return {
    totalContributions: row?.total_contributions ?? 0,
    pendingCount: row?.pending_count ?? 0,
    approvedCount: row?.approved_count ?? 0,
    rejectedCount: row?.rejected_count ?? 0,
    contributionPoints: row?.contribution_points ?? 0,
    trustScore: row?.trust_score ?? 50,
    reviewedContributions: row?.reviewed_contributions ?? 0,
    trustApprovedContributions: row?.trust_approved_contributions ?? 0,
    trustRejectedContributions: row?.trust_rejected_contributions ?? 0,
  };
}
