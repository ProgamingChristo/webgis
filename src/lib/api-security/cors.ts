import { ApplicationError } from "@/src/lib/errors";

export interface CorsDecision {
  allowed: boolean;
  origin?: string;
}

const EXPOSED_RESPONSE_HEADERS = "X-Request-ID, Retry-After";

function readRequestOrigin(request: Request): string | undefined {
  const origin = request.headers.get("origin");
  if (!origin) return undefined;
  if (origin.length > 2_048 || /[^\x20-\x7e]/u.test(origin)) return "invalid";
  return origin;
}

function isSameOrigin(request: Request, origin: string): boolean {
  try {
    return new URL(request.url).origin === origin;
  } catch {
    return false;
  }
}

export function evaluateActualCors(
  request: Request,
  allowedOrigins: readonly string[],
): CorsDecision {
  const origin = readRequestOrigin(request);
  if (!origin) return { allowed: true };
  if (
    origin === "invalid" ||
    origin === "null" ||
    (!allowedOrigins.includes(origin) && !isSameOrigin(request, origin))
  ) {
    return { allowed: false };
  }
  return { allowed: true, origin };
}

export function evaluatePreflightCors(
  request: Request,
  allowedOrigins: readonly string[],
  allowedMethods: readonly string[],
  allowedHeaders: readonly string[],
): CorsDecision {
  const actual = evaluateActualCors(request, allowedOrigins);
  const origin = readRequestOrigin(request);
  if (!actual.allowed || !origin) return { allowed: false };

  const requestedMethod = request.headers
    .get("access-control-request-method")
    ?.toUpperCase();
  if (!requestedMethod || !allowedMethods.includes(requestedMethod)) {
    return { allowed: false };
  }

  const requestedHeaders = (
    request.headers.get("access-control-request-headers") ?? ""
  )
    .split(",")
    .map((header) => header.trim().toLowerCase())
    .filter(Boolean);
  const allowedHeaderSet = new Set(allowedHeaders.map((header) => header.toLowerCase()));
  if (
    requestedHeaders.length > 16 ||
    requestedHeaders.some(
      (header) => !/^[a-z0-9-]+$/u.test(header) || !allowedHeaderSet.has(header),
    )
  ) {
    return { allowed: false };
  }

  return { allowed: true, origin };
}

function appendVary(headers: Headers, value: string): void {
  const current = headers.get("Vary")?.split(",").map((item) => item.trim()) ?? [];
  if (!current.some((item) => item.toLowerCase() === value.toLowerCase())) {
    current.push(value);
  }
  headers.set("Vary", current.join(", "));
}

export function applyCorsHeaders(headers: Headers, decision: CorsDecision): void {
  if (!decision.origin) return;
  headers.set("Access-Control-Allow-Origin", decision.origin);
  headers.set("Access-Control-Expose-Headers", EXPOSED_RESPONSE_HEADERS);
  appendVary(headers, "Origin");
}

export function createPreflightResponse(
  request: Request,
  allowedOrigins: readonly string[],
  allowedMethods: readonly string[],
  allowedHeaders: readonly string[],
): Response {
  const decision = evaluatePreflightCors(
    request,
    allowedOrigins,
    allowedMethods,
    allowedHeaders,
  );
  if (!decision.allowed) {
    throw new ApplicationError("CORS_PREFLIGHT_DENIED");
  }

  const headers = new Headers();
  applyCorsHeaders(headers, decision);
  headers.set("Access-Control-Allow-Methods", allowedMethods.join(", "));
  headers.set("Access-Control-Allow-Headers", allowedHeaders.join(", "));
  headers.set("Access-Control-Max-Age", "600");
  return new Response(null, { status: 204, headers });
}
