import { z } from "zod";

import {
  COMMUNITY_FEED_DEFAULT_LIMIT,
  COMMUNITY_FEED_MAX_LIMIT,
  COMMUNITY_COMMENT_DEFAULT_LIMIT,
  COMMUNITY_COMMENT_MAX_LIMIT,
  COMMUNITY_COMMENT_MAX_LENGTH,
  COMMUTER_REQUEST_BUDGET_MAX_IDR,
  COMMUTER_REQUEST_CATEGORIES,
  COMMUTER_REQUEST_DEFAULT_EXPIRY_DAYS,
  COMMUTER_REQUEST_DEFAULT_RADIUS_M,
  COMMUTER_REQUEST_DESCRIPTION_MAX_LENGTH,
  COMMUTER_REQUEST_RADIUS_MAX_M,
  COMMUTER_REQUEST_RADIUS_MIN_M,
  COMMUTER_REQUEST_TITLE_MAX_LENGTH,
  COMMUNITY_FINDING_CATEGORIES,
  COMMUNITY_LOCATION_MAX_ACCURACY_M,
  COMMUNITY_MAP_DEFAULT_LIMIT,
  COMMUNITY_MAP_MAX_LIMIT,
  COMMUNITY_DEMAND_SIGNAL_DEFAULT_LIMIT,
  COMMUNITY_DEMAND_SIGNAL_MAX_LIMIT,
  COMMUNITY_UMKM_RESPONSE_MESSAGE_MAX_LENGTH,
  COMMUNITY_UMKM_RESPONSE_STATUSES,
  COMMUNITY_MODERATION_ACTIONS,
  COMMUNITY_FRIENDSHIP_ACTIONS,
  COMMUNITY_FRIENDSHIP_VIEWS,
  COMMUNITY_NOTIFICATION_TYPES,
  COMMUNITY_PHOTO_MAX_OUTPUT_BYTES,
  COMMUNITY_POST_TYPES,
  COMMUNITY_POST_MAX_LENGTH,
  COMMUNITY_REACTION_TYPES,
  COMMUNITY_REPORT_DETAILS_MAX_LENGTH,
  COMMUNITY_REPORT_REASONS,
  COMMUNITY_REPORT_TARGET_TYPES,
} from "../constants/community.constants";

export const communityPostContentSchema = z
  .string()
  .trim()
  .min(1)
  .max(COMMUNITY_POST_MAX_LENGTH);

export const communityCommentContentSchema = z
  .string()
  .trim()
  .min(1)
  .max(COMMUNITY_COMMENT_MAX_LENGTH);

export const communityReactionTypeSchema = z.enum(COMMUNITY_REACTION_TYPES);
export const communityPostTypeSchema = z.enum(COMMUNITY_POST_TYPES);
export const communityFindingCategorySchema = z.enum(COMMUNITY_FINDING_CATEGORIES);
export const commuterRequestCategorySchema = z.enum(COMMUTER_REQUEST_CATEGORIES);
export const communityUmkmResponseStatusSchema = z.enum(
  COMMUNITY_UMKM_RESPONSE_STATUSES,
);
export const communityNotificationTypeSchema = z.enum(
  COMMUNITY_NOTIFICATION_TYPES,
);
export const communityReportTargetTypeSchema = z.enum(
  COMMUNITY_REPORT_TARGET_TYPES,
);
export const communityReportReasonSchema = z.enum(COMMUNITY_REPORT_REASONS);
export const communityModerationActionSchema = z.enum(
  COMMUNITY_MODERATION_ACTIONS,
);
export const communityFriendshipActionSchema = z.enum(
  COMMUNITY_FRIENDSHIP_ACTIONS,
);
export const communityFriendshipViewSchema = z.enum(
  COMMUNITY_FRIENDSHIP_VIEWS,
);
export const commuterRequestExpiryDaysSchema = z.union([
  z.literal(1),
  z.literal(3),
  z.literal(7),
]);

export const communityLocationVisibilitySchema = z.enum([
  "APPROXIMATE",
  "EXACT",
]);

export const communityLocationInputSchema = z
  .object({
    longitude: z.number().finite().min(-180).max(180),
    latitude: z.number().finite().min(-90).max(90),
    visibility: communityLocationVisibilitySchema,
    accuracy_m: z
      .number()
      .finite()
      .positive()
      .max(COMMUNITY_LOCATION_MAX_ACCURACY_M)
      .optional(),
  })
  .strict();

export const createCommunityPostSchema = z
  .object({
    type: communityPostTypeSchema.default("GENERAL"),
    content: communityPostContentSchema,
    category: communityFindingCategorySchema.optional(),
    location: communityLocationInputSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.type === "FINDING") {
      if (!value.category) {
        context.addIssue({
          code: "custom",
          message: "Finding category is required",
          path: ["category"],
        });
      }

      if (!value.location) {
        context.addIssue({
          code: "custom",
          message: "Finding location is required",
          path: ["location"],
        });
      }
    }

    if (value.type === "GENERAL" && value.category) {
      context.addIssue({
        code: "custom",
        message: "General posts cannot use finding category",
        path: ["category"],
      });
    }
  });

export const communityMediaMetadataSchema = z
  .object({
    id: z.uuid(),
    storagePath: z
      .string()
      .regex(
        /^[0-9a-fA-F-]{36}\/[0-9a-fA-F-]{36}\/[0-9a-fA-F-]{36}\.webp$/,
      ),
    mimeType: z.literal("image/webp"),
    sizeBytes: z.number().int().positive().max(COMMUNITY_PHOTO_MAX_OUTPUT_BYTES),
    width: z.number().int().positive().max(2048),
    height: z.number().int().positive().max(2048),
  })
  .strict();

export const communityFeedQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(COMMUNITY_FEED_MAX_LIMIT)
    .default(COMMUNITY_FEED_DEFAULT_LIMIT),
  type: communityPostTypeSchema.optional(),
  category: communityFindingCategorySchema.optional(),
});

export const communityCommentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(COMMUNITY_COMMENT_MAX_LIMIT)
    .default(COMMUNITY_COMMENT_DEFAULT_LIMIT),
});

export const communityPostIdSchema = z.uuid();
export const communityUserIdSchema = z.uuid();
export const communityNotificationIdSchema = z.uuid();
export const communityReportIdSchema = z.uuid();
export const communityFriendshipIdSchema = z.uuid();
export const commuterRequestIdSchema = z.uuid();
export const communityDemandSignalIdSchema = z.uuid();
export const communityMerchantIdSchema = z.uuid();

export const createCommunityCommentSchema = z
  .object({
    content: communityCommentContentSchema,
    parent_comment_id: z.uuid().optional(),
  })
  .strict();

export const communityCulturalMapQuerySchema = z
  .object({
    west: z.coerce.number().finite().min(-180).max(180),
    south: z.coerce.number().finite().min(-90).max(90),
    east: z.coerce.number().finite().min(-180).max(180),
    north: z.coerce.number().finite().min(-90).max(90),
    categories: z
      .union([
        communityFindingCategorySchema,
        z.array(communityFindingCategorySchema),
      ])
      .optional()
      .transform((value) =>
        value === undefined ? undefined : Array.isArray(value) ? value : [value],
      ),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(COMMUNITY_MAP_MAX_LIMIT)
      .default(COMMUNITY_MAP_DEFAULT_LIMIT),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.south >= value.north) {
      context.addIssue({
        code: "custom",
        message: "south must be lower than north",
        path: ["south"],
      });
    }

    if (value.west >= value.east) {
      context.addIssue({
        code: "custom",
        message: "west must be lower than east",
        path: ["west"],
      });
    }
  });

export const createCommuterRequestSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1)
      .max(COMMUTER_REQUEST_TITLE_MAX_LENGTH),
    description: z
      .string()
      .trim()
      .min(1)
      .max(COMMUTER_REQUEST_DESCRIPTION_MAX_LENGTH),
    category: commuterRequestCategorySchema,
    max_budget: z
      .number()
      .int()
      .positive()
      .max(COMMUTER_REQUEST_BUDGET_MAX_IDR),
    location: communityLocationInputSchema,
    radius_meters: z
      .number()
      .int()
      .min(COMMUTER_REQUEST_RADIUS_MIN_M)
      .max(COMMUTER_REQUEST_RADIUS_MAX_M)
      .default(COMMUTER_REQUEST_DEFAULT_RADIUS_M),
    expires_in_days: commuterRequestExpiryDaysSchema.default(
      COMMUTER_REQUEST_DEFAULT_EXPIRY_DAYS,
    ),
  })
  .strict();

export const commuterRequestQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(COMMUNITY_FEED_MAX_LIMIT)
      .default(COMMUNITY_FEED_DEFAULT_LIMIT),
    category: commuterRequestCategorySchema.optional(),
    longitude: z.coerce.number().finite().min(-180).max(180).optional(),
    latitude: z.coerce.number().finite().min(-90).max(90).optional(),
    radius_meters: z.coerce
      .number()
      .int()
      .min(COMMUTER_REQUEST_RADIUS_MIN_M)
      .max(COMMUTER_REQUEST_RADIUS_MAX_M)
      .optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if ((value.longitude === undefined) !== (value.latitude === undefined)) {
      context.addIssue({
        code: "custom",
        message: "longitude and latitude must be provided together",
        path: ["longitude"],
      });
    }
  });

export const communityDemandSignalQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(COMMUNITY_DEMAND_SIGNAL_MAX_LIMIT)
      .default(COMMUNITY_DEMAND_SIGNAL_DEFAULT_LIMIT),
    category: commuterRequestCategorySchema.optional(),
  })
  .strict();

export const createCommunityUmkmResponseSchema = z
  .object({
    merchant_id: communityMerchantIdSchema,
    status: communityUmkmResponseStatusSchema,
    message: z
      .string()
      .trim()
      .max(COMMUNITY_UMKM_RESPONSE_MESSAGE_MAX_LENGTH)
      .optional()
      .nullable(),
  })
  .strict();

export const communityNotificationQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export const createCommunityReportSchema = z
  .object({
    target_type: communityReportTargetTypeSchema,
    target_id: z.uuid(),
    reason: communityReportReasonSchema,
    details: z
      .string()
      .trim()
      .max(COMMUNITY_REPORT_DETAILS_MAX_LENGTH)
      .optional()
      .nullable(),
  })
  .strict();

export const adminCommunityReportQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    status: z.enum(["OPEN", "REVIEWED", "ACTIONED", "DISMISSED"]).optional(),
  })
  .strict();

export const moderateCommunityReportSchema = z
  .object({
    action: communityModerationActionSchema,
  })
  .strict();

export const createCommunityFriendRequestSchema = z
  .object({
    user_id: communityUserIdSchema,
  })
  .strict();

export const actOnCommunityFriendshipSchema = z
  .object({
    action: communityFriendshipActionSchema,
  })
  .strict();

export const communityFriendshipListQuerySchema = z
  .object({
    view: communityFriendshipViewSchema.default("FRIENDS"),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();
