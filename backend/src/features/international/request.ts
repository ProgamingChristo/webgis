import { NextRequest, NextResponse } from "next/server";
import { withApiLogger } from "@/src/lib/api-logger";
import { getRequestId } from "@/src/lib/request-id";
import { getTrustedClientIp, rateLimiter } from "@/src/lib/rate-limit";
import { loadApiSecurityConfig } from "@/src/lib/api-security/config";

export function internationalRequest(request: NextRequest, handler: (requestId: string) => Promise<Response>) {
  const id = getRequestId(request);
  return withApiLogger(request, id, async () => {
    const client = getTrustedClientIp(request, loadApiSecurityConfig()) ?? "shared-untrusted";
    // Same quota across GET data, registry and POST interpretation.
    await rateLimiter.checkLimit(request, `public:spatial:international:${client}`);
    const response = await handler(id);
    const headers = new Headers(response.headers);
    headers.set("x-request-id", id); headers.set("Cache-Control", "no-store");
    return new NextResponse(response.body, { status: response.status, headers });
  });
}
