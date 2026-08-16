import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/src/lib/logger";
import { createErrorResponse } from "@/src/lib/api-response";
import { toApplicationError } from "@/src/lib/errors";

export async function withApiLogger(
  req: NextRequest,
  requestId: string,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const method = req.method;
  const url = new URL(req.url);
  const path = url.pathname;
  const start = Date.now();

  try {
    const res = await handler();
    const duration = Date.now() - start;
    
    // Do not log sensitive data or full response bodies in production.
    logger.info(`[API] ${method} ${path}`, {
      request_id: requestId,
      status: res.status,
      duration_ms: duration,
    });
    
    return res;
  } catch (error: unknown) {
    const duration = Date.now() - start;
    const applicationError = toApplicationError(error);
    
    logger.error(`[API] ${method} ${path} - Failed`, {
      request_id: requestId,
      error_code: applicationError.code,
      duration_ms: duration,
    });
    
    return createErrorResponse(requestId, applicationError);
  }
}
