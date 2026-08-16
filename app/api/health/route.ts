import { NextRequest } from 'next/server';
import { getRequestId } from "@/src/lib/request-id";
import { createSuccessResponse } from "@/src/lib/api-response";
import { HealthChecker, createHealthService } from "@/src/services/health.service";
import { withApiLogger } from "@/src/lib/api-logger";

export const createHealthHandler = (healthService: HealthChecker) => async (req: NextRequest | Request) => {
  const reqId = getRequestId(req as NextRequest);
  return withApiLogger(req as NextRequest, reqId, async () => {
    const data = await healthService.check();
    return createSuccessResponse(reqId, data);
  });
};

export const GET = createHealthHandler(createHealthService());

// Assuming default export or standard GET for Next.js App Router
// But wait, the test tests createHealthHandler.
// So we just leave it like this.
