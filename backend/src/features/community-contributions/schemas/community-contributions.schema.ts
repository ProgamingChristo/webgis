import { z } from "zod";

import {
  COMMUNITY_CONTRIBUTION_DETAILS_MAX_LENGTH,
  COMMUNITY_CONTRIBUTION_FACILITY_TYPES,
  COMMUNITY_CONTRIBUTION_HOURS_KEY_MAX_LENGTH,
  COMMUNITY_CONTRIBUTION_HOURS_MAX_ENTRIES,
  COMMUNITY_CONTRIBUTION_HOURS_VALUE_MAX_LENGTH,
  COMMUNITY_CONTRIBUTION_PRICE_LEVEL_MAX_LENGTH,
  COMMUNITY_CONTRIBUTION_REJECTION_REASONS,
  COMMUNITY_CONTRIBUTION_REPORT_TYPES,
  COMMUNITY_CONTRIBUTION_STATUSES,
} from "../constants/community-contributions.constants";

const detailsSchema = z.string().trim().min(1).max(
  COMMUNITY_CONTRIBUTION_DETAILS_MAX_LENGTH,
);

export const communityContributionIdSchema = z.uuid();

export const communityContributionPointSchema = z
  .object({
    longitude: z.number().finite().min(-180).max(180),
    latitude: z.number().finite().min(-90).max(90),
  })
  .strict();

const observedAtSchema = z
  .string()
  .datetime({ offset: true });

const baseContributionSchema = z
  .object({
    location: communityContributionPointSchema,
    observed_at: observedAtSchema,
  })
  .strict();

const notesSchema = detailsSchema.optional();

const merchantTargetSchema = z.object({
  target_merchant_id: z.uuid(),
});

const reportedOpeningHoursSchema = z
  .record(
    z.string().trim().min(1).max(COMMUNITY_CONTRIBUTION_HOURS_KEY_MAX_LENGTH),
    z.string().trim().min(1).max(COMMUNITY_CONTRIBUTION_HOURS_VALUE_MAX_LENGTH),
  )
  .refine(
    (value) => {
      const count = Object.keys(value).length;
      return count >= 1 && count <= COMMUNITY_CONTRIBUTION_HOURS_MAX_ENTRIES;
    },
    { message: "reported_opening_hours must contain 1-14 entries" },
  );

export const createCommunityContributionSchema = z.discriminatedUnion(
  "report_type",
  [
    baseContributionSchema.extend({
      report_type: z.literal("SIDEWALK_OBSTRUCTION"),
      details: detailsSchema,
      pedestrian_edge_id: z.uuid().optional(),
    }).strict(),
    baseContributionSchema.extend({
      report_type: z.literal("RAMP_OR_GUIDING_BLOCK"),
      facility_type: z.enum(COMMUNITY_CONTRIBUTION_FACILITY_TYPES),
      details: detailsSchema,
    }).strict(),
    baseContributionSchema.extend({
      report_type: z.literal("CROSSING"),
      details: detailsSchema,
    }).strict(),
    baseContributionSchema.extend({
      report_type: z.literal("MERCHANT_LOCATION_CHANGED"),
      ...merchantTargetSchema.shape,
      reported_new_location: communityContributionPointSchema,
      notes: notesSchema,
    }).strict(),
    baseContributionSchema.extend({
      report_type: z.literal("MERCHANT_PRICE_CHANGED"),
      ...merchantTargetSchema.shape,
      reported_price_level: z.string().trim().min(1).max(
        COMMUNITY_CONTRIBUTION_PRICE_LEVEL_MAX_LENGTH,
      ),
      notes: notesSchema,
    }).strict(),
    baseContributionSchema.extend({
      report_type: z.literal("MERCHANT_HOURS_CHANGED"),
      ...merchantTargetSchema.shape,
      reported_opening_hours: reportedOpeningHoursSchema,
      notes: notesSchema,
    }).strict(),
  ],
);

export type CreateCommunityContributionRequest = z.infer<
  typeof createCommunityContributionSchema
>;

export const communityContributionReportTypeSchema = z.enum(
  COMMUNITY_CONTRIBUTION_REPORT_TYPES,
);

export const communityContributionStatusSchema = z.enum(
  COMMUNITY_CONTRIBUTION_STATUSES,
);

export const communityContributionRejectionReasonSchema = z.enum(
  COMMUNITY_CONTRIBUTION_REJECTION_REASONS,
);

export const communityContributionHistoryQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    status: communityContributionStatusSchema.optional(),
    report_type: communityContributionReportTypeSchema.optional(),
  })
  .strict();

export type CommunityContributionHistoryQueryRequest = z.infer<
  typeof communityContributionHistoryQuerySchema
>;

export const communityContributionMapQuerySchema = z
  .object({
    min_lng: z.coerce.number().finite().min(-180).max(180),
    min_lat: z.coerce.number().finite().min(-90).max(90),
    max_lng: z.coerce.number().finite().min(-180).max(180),
    max_lat: z.coerce.number().finite().min(-90).max(90),
    limit: z.coerce
      .number()
      .int()
      .default(250)
      .transform((value) => Math.min(Math.max(value, 1), 500)),
  })
  .strict()
  .refine((value) => value.min_lng < value.max_lng, {
    message: "min_lng must be less than max_lng",
    path: ["min_lng"],
  })
  .refine((value) => value.min_lat < value.max_lat, {
    message: "min_lat must be less than max_lat",
    path: ["min_lat"],
  })
  .refine(
    (value) =>
      value.max_lng - value.min_lng <= 2 &&
      value.max_lat - value.min_lat <= 2,
    {
      message: "bbox is too large",
      path: ["max_lng"],
    },
  );

export type CommunityContributionMapQueryRequest = z.infer<
  typeof communityContributionMapQuerySchema
>;

export const communityContributionModerationQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    status: communityContributionStatusSchema.default("PENDING"),
    report_type: communityContributionReportTypeSchema.optional(),
  })
  .strict();

export const rejectCommunityContributionSchema = z
  .object({
    reason: communityContributionRejectionReasonSchema,
  })
  .strict();

export type CommunityContributionModerationQueryRequest = z.infer<
  typeof communityContributionModerationQuerySchema
>;

export type RejectCommunityContributionRequest = z.infer<
  typeof rejectCommunityContributionSchema
>;
