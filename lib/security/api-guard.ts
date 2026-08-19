import { z, type ZodType } from "zod";

type GuardOptions = {
  maxBodyBytes?: number;
  rateLimit?: number;
  rateWindowMs?: number;
};

type RateEntry = {
  count: number;
  resetAt: number;
};

const rateEntries = new Map<string, RateEntry>();

const securityHeaders = {
  "Cache-Control": "no-store",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
} as const;

function requestIdentity(request: Request) {
  return request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "anonymous";
}

function allowedOrigins(request: Request) {
  const configured = process.env.APP_ORIGIN
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return new Set(configured?.length ? configured : [new URL(request.url).origin]);
}

function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = rateEntries.get(key);

  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs;
    rateEntries.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  current.count += 1;
  return {
    allowed: current.count <= limit,
    remaining: Math.max(0, limit - current.count),
    resetAt: current.resetAt,
  };
}

export function secureJson(
  body: unknown,
  options: { status?: number; requestId?: string; headers?: HeadersInit } = {},
) {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  Object.entries(securityHeaders).forEach(([name, value]) => headers.set(name, value));
  if (options.requestId) headers.set("X-Request-ID", options.requestId);

  return new Response(JSON.stringify(body), {
    status: options.status ?? 200,
    headers,
  });
}

export async function guardJsonRequest<T>(
  request: Request,
  schema: ZodType<T>,
  options: GuardOptions = {},
): Promise<
  | { ok: true; data: T; requestId: string; rateHeaders: HeadersInit }
  | { ok: false; response: Response }
> {
  const requestId = request.headers.get("x-request-id")?.slice(0, 100) || crypto.randomUUID();
  const origin = request.headers.get("origin");
  if (origin && !allowedOrigins(request).has(origin)) {
    return { ok: false, response: secureJson({ error: "Origin tidak diizinkan" }, { status: 403, requestId }) };
  }

  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return { ok: false, response: secureJson({ error: "Content-Type harus application/json" }, { status: 415, requestId }) };
  }

  const maxBodyBytes = options.maxBodyBytes ?? 8_192;
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > maxBodyBytes) {
    return { ok: false, response: secureJson({ error: "Ukuran request melebihi batas" }, { status: 413, requestId }) };
  }

  const rateLimit = options.rateLimit ?? 20;
  const rateWindowMs = options.rateWindowMs ?? 60_000;
  const rate = checkRateLimit(`${new URL(request.url).pathname}:${requestIdentity(request)}`, rateLimit, rateWindowMs);
  const rateHeaders = {
    "RateLimit-Limit": String(rateLimit),
    "RateLimit-Remaining": String(rate.remaining),
    "RateLimit-Reset": String(Math.ceil(rate.resetAt / 1000)),
  };
  if (!rate.allowed) {
    return {
      ok: false,
      response: secureJson(
        { error: "Terlalu banyak request. Coba lagi nanti." },
        {
          status: 429,
          requestId,
          headers: {
            ...rateHeaders,
            "Retry-After": String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))),
          },
        },
      ),
    };
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return { ok: false, response: secureJson({ error: "Request tidak dapat dibaca" }, { status: 400, requestId }) };
  }

  if (new TextEncoder().encode(rawBody).byteLength > maxBodyBytes) {
    return { ok: false, response: secureJson({ error: "Ukuran request melebihi batas" }, { status: 413, requestId }) };
  }

  try {
    const data = schema.parse(JSON.parse(rawBody));
    return { ok: true, data, requestId, rateHeaders };
  } catch (error) {
    const message = error instanceof z.ZodError ? "Format request tidak valid" : "JSON tidak valid";
    return { ok: false, response: secureJson({ error: message }, { status: 400, requestId }) };
  }
}
