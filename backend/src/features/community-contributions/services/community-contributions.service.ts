import { ApplicationError } from "@/src/lib/errors";
import type { RepositoryError } from "@/src/repositories/errors";
import {
  communityContributionIdSchema,
  communityContributionHistoryQuerySchema,
  communityContributionMapQuerySchema,
  communityContributionModerationQuerySchema,
  createCommunityContributionSchema,
  rejectCommunityContributionSchema,
  type CreateCommunityContributionRequest,
} from "../schemas/community-contributions.schema";
import type {
  CommunityContribution,
  CommunityContributionHistoryResult,
  CommunityContributionMapFeature,
  CommunityContributionModerationDetail,
  CommunityContributionModerationResult,
  CommunityContributionRepository,
  CreateCommunityContributionInput,
} from "../types/community-contributions.types";

export class CommunityContributionService {
  constructor(private readonly repository: CommunityContributionRepository) {}

  async create(
    authorId: string,
    input: unknown,
  ): Promise<CommunityContribution> {
    const parsed = createCommunityContributionSchema.safeParse(input);

    if (!parsed.success) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    try {
      return await this.repository.create(
        mapCreateInput(authorId, parsed.data),
      );
    } catch (error) {
      throw mapCommunityContributionRepositoryError(error);
    }
  }

  async getOwn(contributionId: unknown): Promise<CommunityContribution> {
    const parsed = communityContributionIdSchema.safeParse(contributionId);

    if (!parsed.success) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    try {
      return await this.repository.getOwn(parsed.data);
    } catch (error) {
      throw mapCommunityContributionRepositoryError(error);
    }
  }

  async listOwnHistory(input: unknown): Promise<CommunityContributionHistoryResult> {
    const parsed = communityContributionHistoryQuerySchema.safeParse(input);

    if (!parsed.success) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    try {
      return await this.repository.listOwnHistory({
        page: parsed.data.page,
        limit: parsed.data.limit,
        status: parsed.data.status,
        reportType: parsed.data.report_type,
      });
    } catch (error) {
      throw mapCommunityContributionRepositoryError(error);
    }
  }

  async listMapFeatures(
    input: unknown,
  ): Promise<CommunityContributionMapFeature[]> {
    const parsed = communityContributionMapQuerySchema.safeParse(input);

    if (!parsed.success) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    try {
      return await this.repository.listMapFeatures({
        minLng: parsed.data.min_lng,
        minLat: parsed.data.min_lat,
        maxLng: parsed.data.max_lng,
        maxLat: parsed.data.max_lat,
        limit: parsed.data.limit,
      });
    } catch (error) {
      throw mapCommunityContributionRepositoryError(error);
    }
  }

  async listModerationQueue(
    input: unknown,
  ): Promise<CommunityContributionModerationResult> {
    const parsed = communityContributionModerationQuerySchema.safeParse(input);

    if (!parsed.success) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    try {
      return await this.repository.listModerationQueue({
        page: parsed.data.page,
        limit: parsed.data.limit,
        status: parsed.data.status,
        reportType: parsed.data.report_type,
      });
    } catch (error) {
      throw mapCommunityContributionRepositoryError(error);
    }
  }

  async getModerationDetail(
    contributionId: unknown,
  ): Promise<CommunityContributionModerationDetail> {
    const parsed = communityContributionIdSchema.safeParse(contributionId);

    if (!parsed.success) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    try {
      return await this.repository.getModerationDetail(parsed.data);
    } catch (error) {
      throw mapCommunityContributionRepositoryError(error);
    }
  }

  async confirm(
    contributionId: unknown,
  ): Promise<CommunityContributionModerationDetail> {
    const parsed = communityContributionIdSchema.safeParse(contributionId);

    if (!parsed.success) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    try {
      return await this.repository.confirm(parsed.data);
    } catch (error) {
      throw mapCommunityContributionRepositoryError(error);
    }
  }

  async reject(
    contributionId: unknown,
    input: unknown,
  ): Promise<CommunityContributionModerationDetail> {
    const parsedId = communityContributionIdSchema.safeParse(contributionId);
    const parsedBody = rejectCommunityContributionSchema.safeParse(input);

    if (!parsedId.success || !parsedBody.success) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    try {
      return await this.repository.reject(parsedId.data, parsedBody.data.reason);
    } catch (error) {
      throw mapCommunityContributionRepositoryError(error);
    }
  }
}

function mapCreateInput(
  authorId: string,
  input: CreateCommunityContributionRequest,
): CreateCommunityContributionInput {
  switch (input.report_type) {
    case "SIDEWALK_OBSTRUCTION":
      return {
        authorId,
        reportType: input.report_type,
        location: input.location,
        observedAt: input.observed_at,
        reportData: {
          details: input.details,
          ...(input.pedestrian_edge_id
            ? { pedestrian_edge_id: input.pedestrian_edge_id }
            : {}),
        },
      };
    case "RAMP_OR_GUIDING_BLOCK":
      return {
        authorId,
        reportType: input.report_type,
        location: input.location,
        observedAt: input.observed_at,
        reportData: {
          facility_type: input.facility_type,
          details: input.details,
        },
      };
    case "CROSSING":
      return {
        authorId,
        reportType: input.report_type,
        location: input.location,
        observedAt: input.observed_at,
        reportData: {
          details: input.details,
        },
      };
    case "MERCHANT_LOCATION_CHANGED":
      return {
        authorId,
        reportType: input.report_type,
        location: input.location,
        observedAt: input.observed_at,
        targetMerchantId: input.target_merchant_id,
        reportedNewLocation: input.reported_new_location,
        reportData: optionalNotes(input.notes),
      };
    case "MERCHANT_PRICE_CHANGED":
      return {
        authorId,
        reportType: input.report_type,
        location: input.location,
        observedAt: input.observed_at,
        targetMerchantId: input.target_merchant_id,
        reportData: {
          reported_price_level: input.reported_price_level,
          ...optionalNotes(input.notes),
        },
      };
    case "MERCHANT_HOURS_CHANGED":
      return {
        authorId,
        reportType: input.report_type,
        location: input.location,
        observedAt: input.observed_at,
        targetMerchantId: input.target_merchant_id,
        reportData: {
          reported_opening_hours: input.reported_opening_hours,
          ...optionalNotes(input.notes),
        },
      };
  }
}

function optionalNotes(notes: string | undefined): { notes?: string } {
  return notes ? { notes } : {};
}

function mapCommunityContributionRepositoryError(
  error: unknown,
): ApplicationError {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as RepositoryError).code;

    if (code === "VALIDATION_ERROR") {
      return new ApplicationError("VALIDATION_ERROR");
    }

    if (code === "FORBIDDEN") {
      return new ApplicationError("FORBIDDEN");
    }

    if (code === "NOT_FOUND") {
      return new ApplicationError("NOT_FOUND");
    }

    if (code === "CONFLICT") {
      return new ApplicationError("CONFLICT");
    }

    if (code === "CONTRIBUTION_RATE_LIMITED") {
      return new ApplicationError("CONTRIBUTION_RATE_LIMITED");
    }

    if (code === "CONTRIBUTION_DUPLICATE") {
      return new ApplicationError("CONTRIBUTION_DUPLICATE");
    }

    if (code === "INVALID_OBSERVATION_TIME") {
      return new ApplicationError("INVALID_OBSERVATION_TIME");
    }

    if (code === "INVALID_TARGET_LOCATION") {
      return new ApplicationError("INVALID_TARGET_LOCATION");
    }
  }

  if (error instanceof ApplicationError) {
    return error;
  }

  return new ApplicationError("DATABASE_ERROR");
}
