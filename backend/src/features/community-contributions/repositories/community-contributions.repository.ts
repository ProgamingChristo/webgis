import type { SupabaseClient } from "@supabase/supabase-js";

import { mapDatabaseError } from "@/src/repositories/errors";
import {
  mapCommunityContributionHistoryRow,
  mapCommunityContributionMapFeatureRow,
  mapCommunityContributionModerationDetailRow,
  mapCommunityContributionModerationQueueRow,
  mapCommunityContributionRow,
  mapCommunityContributionSummaryRow,
} from "../mappers/community-contributions.mapper";
import type {
  CommunityContribution,
  CommunityContributionDatabaseRow,
  CommunityContributionHistoryDatabaseRow,
  CommunityContributionHistoryQuery,
  CommunityContributionHistoryResult,
  CommunityContributionMapFeature,
  CommunityContributionMapFeatureDatabaseRow,
  CommunityContributionMapQuery,
  CommunityContributionModerationDetail,
  CommunityContributionModerationDetailDatabaseRow,
  CommunityContributionModerationQuery,
  CommunityContributionModerationQueueDatabaseRow,
  CommunityContributionModerationResult,
  CommunityContributionRepository,
  CommunityContributionRejectionReason,
  CommunityContributionSummaryDatabaseRow,
  CreateCommunityContributionInput,
} from "../types/community-contributions.types";

export class SupabaseCommunityContributionRepository
  implements CommunityContributionRepository
{
  constructor(private readonly client: SupabaseClient) {}

  async create(
    input: CreateCommunityContributionInput,
  ): Promise<CommunityContribution> {
    const { data, error } = await (this.client as any)
      .rpc("create_community_contribution_v1", {
        p_report_type: input.reportType,
        p_longitude: input.location.longitude,
        p_latitude: input.location.latitude,
        p_observed_at: input.observedAt,
        p_report_data: input.reportData,
        p_target_merchant_id: input.targetMerchantId ?? null,
        p_reported_new_longitude:
          input.reportedNewLocation?.longitude ?? null,
        p_reported_new_latitude:
          input.reportedNewLocation?.latitude ?? null,
      })
      .single();

    if (error) {
      throw mapDatabaseError(error, "community_contributions.create");
    }

    return mapCommunityContributionRow(
      data as CommunityContributionDatabaseRow,
    );
  }

  async getOwn(contributionId: string): Promise<CommunityContribution> {
    const { data, error } = await (this.client as any)
      .rpc("get_community_contribution_v1", {
        p_contribution_id: contributionId,
      })
      .single();

    if (error) {
      throw mapDatabaseError(error, "community_contributions.getOwn");
    }

    return mapCommunityContributionRow(
      data as CommunityContributionDatabaseRow,
    );
  }

  async listOwnHistory(
    query: CommunityContributionHistoryQuery,
  ): Promise<CommunityContributionHistoryResult> {
    const offset = (query.page - 1) * query.limit;
    const { data: rows, error: historyError } = await (this.client as any)
      .rpc("list_community_contribution_history_v1", {
        p_limit: query.limit,
        p_offset: offset,
        p_status: query.status ?? null,
        p_report_type: query.reportType ?? null,
      });

    if (historyError) {
      throw mapDatabaseError(
        historyError,
        "community_contributions.listOwnHistory",
      );
    }

    const { data: summaryRow, error: summaryError } = await (this.client as any)
      .rpc("get_community_contribution_summary_v1")
      .single();

    if (summaryError) {
      throw mapDatabaseError(
        summaryError,
        "community_contributions.getSummary",
      );
    }

    const historyRows = (rows ?? []) as CommunityContributionHistoryDatabaseRow[];
    const total = historyRows[0]?.total_count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / query.limit));

    return {
      items: historyRows.map(mapCommunityContributionHistoryRow),
      summary: mapCommunityContributionSummaryRow(
        summaryRow as CommunityContributionSummaryDatabaseRow | null,
      ),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        hasMore: query.page < totalPages,
      },
    };
  }

  async listMapFeatures(
    query: CommunityContributionMapQuery,
  ): Promise<CommunityContributionMapFeature[]> {
    const { data, error } = await (this.client as any)
      .rpc("list_community_contribution_map_features_v1", {
        p_min_lng: query.minLng,
        p_min_lat: query.minLat,
        p_max_lng: query.maxLng,
        p_max_lat: query.maxLat,
        p_limit: query.limit,
      });

    if (error) {
      throw mapDatabaseError(error, "community_contributions.listMapFeatures");
    }

    return ((data ?? []) as CommunityContributionMapFeatureDatabaseRow[]).map(
      mapCommunityContributionMapFeatureRow,
    );
  }

  async listModerationQueue(
    query: CommunityContributionModerationQuery,
  ): Promise<CommunityContributionModerationResult> {
    const offset = (query.page - 1) * query.limit;
    const { data: rows, error } = await (this.client as any)
      .rpc("list_community_contribution_moderation_queue_v1", {
        p_limit: query.limit,
        p_offset: offset,
        p_status: query.status ?? "PENDING",
        p_report_type: query.reportType ?? null,
      });

    if (error) {
      throw mapDatabaseError(
        error,
        "community_contributions.listModerationQueue",
      );
    }

    const moderationRows =
      (rows ?? []) as CommunityContributionModerationQueueDatabaseRow[];
    const total = moderationRows[0]?.total_count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / query.limit));

    return {
      items: moderationRows.map(mapCommunityContributionModerationQueueRow),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        hasMore: query.page < totalPages,
      },
    };
  }

  async getModerationDetail(
    contributionId: string,
  ): Promise<CommunityContributionModerationDetail> {
    const { data, error } = await (this.client as any)
      .rpc("get_community_contribution_moderation_detail_v1", {
        p_contribution_id: contributionId,
      })
      .single();

    if (error) {
      throw mapDatabaseError(
        error,
        "community_contributions.getModerationDetail",
      );
    }

    return mapCommunityContributionModerationDetailRow(
      data as CommunityContributionModerationDetailDatabaseRow,
    );
  }

  async confirm(
    contributionId: string,
  ): Promise<CommunityContributionModerationDetail> {
    return this.review(contributionId, "APPROVED", null);
  }

  async reject(
    contributionId: string,
    reason: CommunityContributionRejectionReason,
  ): Promise<CommunityContributionModerationDetail> {
    return this.review(contributionId, "REJECTED", reason);
  }

  private async review(
    contributionId: string,
    action: "APPROVED" | "REJECTED",
    reason: CommunityContributionRejectionReason | null,
  ): Promise<CommunityContributionModerationDetail> {
    const { data, error } = await (this.client as any)
      .rpc("review_community_contribution_v1", {
        p_contribution_id: contributionId,
        p_action: action,
        p_rejection_reason: reason,
      })
      .single();

    if (error) {
      throw mapDatabaseError(
        error,
        "community_contributions.reviewModeration",
      );
    }

    return mapCommunityContributionModerationDetailRow(
      data as CommunityContributionModerationDetailDatabaseRow,
    );
  }
}
