import { NextRequest, NextResponse } from "next/server";
import { createSuccessResponse } from "@/src/lib/api-response";
import { getRequestId } from "@/src/lib/request-id";
import { withApiLogger } from "@/src/lib/api-logger";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { rateLimiter } from "@/src/lib/rate-limit";
import { createOptionsHandler } from "@/src/lib/api-security";

export const maxDuration = 15;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const reqId = getRequestId(req);
  
  return withApiLogger(req, reqId, async () => {
    const userId = await requireAuthenticatedUser(req);
    await rateLimiter.checkLimit(req, `${userId}:mutation:auth:logout`);

    // The API is bearer-token based and does not hold a server-side cookie/session.
    // A service-role credential is intentionally not used to revoke tokens here.
    return createSuccessResponse(reqId, {
      message: "Authenticated logout acknowledged",
      token_disposition: "client_discard_required",
    });
  });
}

export const OPTIONS = createOptionsHandler("/api/auth/logout");
