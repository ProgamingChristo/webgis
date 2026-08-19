import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/src/lib/logger";
import { createErrorResponse } from "@/src/lib/api-response";
import { ApplicationError, toApplicationError } from "@/src/lib/errors";
import {
  applyCorsHeaders,
  evaluateActualCors,
  type CorsDecision,
} from "@/src/lib/api-security/cors";
import {
  loadApiSecurityConfig,
  type ApiSecurityConfig,
} from "@/src/lib/api-security/config";
import {
  applyProductionHsts,
  applyStaticSecurityHeaders,
} from "@/src/lib/api-security/security-headers";

function secureResponse(
  response: NextResponse,
  config?: ApiSecurityConfig,
  corsDecision?: CorsDecision,
): NextResponse {
  applyStaticSecurityHeaders(response.headers);
  if (config) {
    applyProductionHsts(response.headers, config.appEnv, config.appBaseUrl);
  }
  if (corsDecision?.allowed) {
    applyCorsHeaders(response.headers, corsDecision);
  }
  return response;
}

export async function withApiLogger(
  req: NextRequest,
  requestId: string,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const method = req.method;
  const url = new URL(req.url);
  const path = url.pathname;
  const start = Date.now();
  let securityConfig: ApiSecurityConfig | undefined;
  let corsDecision: CorsDecision | undefined;

  try {
    securityConfig = loadApiSecurityConfig();
    corsDecision = evaluateActualCors(req, securityConfig.allowedOrigins);
    if (!corsDecision.allowed) {
      throw new ApplicationError("CORS_ORIGIN_DENIED");
    }

    const res = await handler();
    const duration = Date.now() - start;
    
    // Do not log sensitive data or full response bodies in production.
    logger.info(`[API] ${method} ${path}`, {
      request_id: requestId,
      status: res.status,
      duration_ms: duration,
    });
    
    return secureResponse(res, securityConfig, corsDecision);
  } catch (error: unknown) {
    const duration = Date.now() - start;
    const applicationError = toApplicationError(error);
    
    const logPayload: Record<string, string | number | boolean> = {
      request_id: requestId,
      error_code: applicationError.code,
      duration_ms: duration,
    };
    
    if (error && typeof error === "object" && "name" in error && error.name === "RateLimitExceededError") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      logPayload.source = (error as any).source as string;
    }
    
    logger.error(`[API] ${method} ${path} - Failed`, logPayload);
    
    return secureResponse(
      createErrorResponse(requestId, applicationError),
      securityConfig,
      corsDecision,
    );
  }
}
