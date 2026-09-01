import type { NextRequest } from "next/server";

import { withApiLogger } from "@/src/lib/api-logger";
import { createSuccessResponse } from "@/src/lib/api-response";
import { createOptionsHandler } from "@/src/lib/api-security";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { ApplicationError } from "@/src/lib/errors";
import { rateLimiter, type RateLimiter } from "@/src/lib/rate-limit";
import { readBoundedJsonBody } from "@/src/lib/request-body";
import { getRequestId } from "@/src/lib/request-id";
import {
  MerchantDescriptionRequestSchema,
  type MerchantDescriptionRequest,
  type MerchantDescriptionResponse,
} from "@/src/modules/ai/merchant-description.schema";
import { MerchantDescriptionService } from "@/src/modules/ai/merchant-description.service";

export const runtime = "nodejs";
export const maxDuration = 30;

interface MerchantDescriptionRouteDependencies {
  authorize(request: NextRequest): Promise<string>;
  limiter: RateLimiter;
  assist(input: MerchantDescriptionRequest): Promise<MerchantDescriptionResponse>;
}

const defaultDependencies: MerchantDescriptionRouteDependencies = {
  authorize: requireAuthenticatedUser,
  limiter: rateLimiter,
  assist: (input) => new MerchantDescriptionService().assist(input),
};

// Prevent accidental double-spend from concurrent requests handled by the
// same backend instance. The existing rate limiter remains the broader abuse
// control; a shared store is still required across multiple replicas.
const activeMerchantDescriptionUsers = new Set<string>();

async function assistOncePerUser(
  userId: string,
  operation: () => Promise<MerchantDescriptionResponse>,
): Promise<MerchantDescriptionResponse> {
  if (activeMerchantDescriptionUsers.has(userId)) {
    throw new ApplicationError("CONFLICT", "Permintaan AI sedang diproses.");
  }

  activeMerchantDescriptionUsers.add(userId);
  try {
    return await operation();
  } finally {
    activeMerchantDescriptionUsers.delete(userId);
  }
}

export function createMerchantDescriptionHandler(
  dependencies: MerchantDescriptionRouteDependencies = defaultDependencies,
) {
  return async (request: NextRequest) => {
    const requestId = getRequestId(request);

    return withApiLogger(request, requestId, async () => {
      const userId = await dependencies.authorize(request);
      await dependencies.limiter.checkLimit(
        request,
        `${userId}:ai:merchant-description`,
      );

      const body = await readBoundedJsonBody(request, 4_096);
      const parsed = MerchantDescriptionRequestSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApplicationError("VALIDATION_ERROR");
      }

      const result = await assistOncePerUser(
        userId,
        () => dependencies.assist(parsed.data),
      );
      return createSuccessResponse(requestId, result);
    });
  };
}

export const POST = createMerchantDescriptionHandler();
export const OPTIONS = createOptionsHandler("/api/ai/merchant-description");
