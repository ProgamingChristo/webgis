import { NextRequest, NextResponse } from "next/server";

import { withApiLogger } from "@/src/lib/api-logger";
import { createPreflightResponse } from "@/src/lib/api-security/cors";
import {
  API_ENDPOINT_POLICIES,
  getAllowedMethodsForPath,
} from "@/src/lib/api-security/endpoint-policy";
import { loadApiSecurityConfig } from "@/src/lib/api-security/config";
import { ApplicationError } from "@/src/lib/errors";
import { getRequestId } from "@/src/lib/request-id";

export function createOptionsHandler(path: string) {
  const methods = getAllowedMethodsForPath(path);
  const headers = [
    ...new Set(
      API_ENDPOINT_POLICIES.filter((policy) => policy.path === path).flatMap(
        (policy) => policy.allowedRequestHeaders,
      ),
    ),
  ];

  return async function OPTIONS(request: NextRequest): Promise<NextResponse> {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      if (methods.length === 0) {
        throw new ApplicationError("NOT_FOUND");
      }
      const config = loadApiSecurityConfig();
      const response = createPreflightResponse(
        request,
        config.allowedOrigins,
        methods,
        headers,
      );
      response.headers.set("Cache-Control", "no-store");
      response.headers.set("x-request-id", requestId);
      return new NextResponse(null, {
        headers: response.headers,
        status: response.status,
      });
    });
  };
}
