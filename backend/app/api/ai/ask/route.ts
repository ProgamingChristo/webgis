import { NextRequest } from "next/server";
import { AiAskRequestSchema } from "@/src/modules/ai/ai.schema";
import { AiService } from "@/src/modules/ai/ai.service";
import { readBoundedJsonBody } from "@/src/lib/spatial/request";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { rateLimiter } from "@/src/lib/rate-limit";
import { getRequestId } from "@/src/lib/request-id";
import { withApiLogger } from "@/src/lib/api-logger";
import { createSuccessResponse } from "@/src/lib/api-response";
import { ApplicationError } from "@/src/lib/errors";
import { createOptionsHandler } from "@/src/lib/api-security";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);

  return withApiLogger(req, requestId, async () => {
      const authorization = req.headers.get("authorization");

      const userId = await requireAuthenticatedUser(req);
      // requireAuthenticatedUser has already verified the canonical Bearer form.
      if (!authorization) throw new ApplicationError("UNAUTHORIZED");

      // Check rate limit for the authenticated user
      await rateLimiter.checkLimit(req, `${userId}:mutation:ai:ask`);

      const body = await readBoundedJsonBody(req, 8192);
      if (!body) {
        throw new ApplicationError("VALIDATION_ERROR");
      }

      const parsed = AiAskRequestSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApplicationError("VALIDATION_ERROR");
      }

      const aiService = new AiService(authorization);
      const result = await aiService.handleAskRequest(parsed.data);

      return createSuccessResponse(requestId, result);
  });
}

export const OPTIONS = createOptionsHandler("/api/ai/ask");
