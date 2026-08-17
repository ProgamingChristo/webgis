import "server-only";

import { z } from "zod";

import { ApplicationError } from "@/src/lib/errors";

export type AppEnvironment = "development" | "staging" | "production";

export interface RateLimitRule {
  limit: number;
  windowMs: number;
}

export interface ApiSecurityConfig {
  allowedOrigins: readonly string[];
  appBaseUrl: string;
  appEnv: AppEnvironment;
  maxJsonBodyBytes: number;
  rateLimits: {
    api: RateLimitRule;
    auth: RateLimitRule;
    mutation: RateLimitRule;
    spatial: RateLimitRule;
  };
  supabaseRequestTimeoutMs: number;
  trustProxy: boolean;
}

export interface ApiSecurityEnvironmentInput {
  API_MAX_JSON_BODY_BYTES?: string;
  APP_BASE_URL?: string;
  APP_ENV?: string;
  FRONTEND_ALLOWED_ORIGINS?: string;
  RATE_LIMIT_API_MAX_REQUESTS?: string;
  RATE_LIMIT_AUTH_MAX_REQUESTS?: string;
  RATE_LIMIT_MUTATION_MAX_REQUESTS?: string;
  RATE_LIMIT_SPATIAL_MAX_REQUESTS?: string;
  RATE_LIMIT_WINDOW_MS?: string;
  SUPABASE_REQUEST_TIMEOUT_MS?: string;
  TRUST_PROXY?: string;
}

const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const environmentSchema = z
  .object({
    API_MAX_JSON_BODY_BYTES: z.preprocess(
      blankToUndefined,
      z.coerce.number().int().min(1_024).max(1_048_576).default(65_536),
    ),
    APP_BASE_URL: z.preprocess(
      blankToUndefined,
      z.string().trim().default("http://localhost:3000"),
    ),
    APP_ENV: z.preprocess(
      blankToUndefined,
      z.enum(["development", "staging", "production"]).default("development"),
    ),
    FRONTEND_ALLOWED_ORIGINS: z.preprocess(
      blankToUndefined,
      z.string().default(""),
    ),
    RATE_LIMIT_API_MAX_REQUESTS: z.preprocess(
      blankToUndefined,
      z.coerce.number().int().positive().max(100_000).default(60),
    ),
    RATE_LIMIT_AUTH_MAX_REQUESTS: z.preprocess(
      blankToUndefined,
      z.coerce.number().int().positive().max(10_000).default(5),
    ),
    RATE_LIMIT_MUTATION_MAX_REQUESTS: z.preprocess(
      blankToUndefined,
      z.coerce.number().int().positive().max(10_000).default(20),
    ),
    RATE_LIMIT_SPATIAL_MAX_REQUESTS: z.preprocess(
      blankToUndefined,
      z.coerce.number().int().positive().max(10_000).default(30),
    ),
    RATE_LIMIT_WINDOW_MS: z.preprocess(
      blankToUndefined,
      z.coerce.number().int().min(1_000).max(3_600_000).default(60_000),
    ),
    SUPABASE_REQUEST_TIMEOUT_MS: z.preprocess(
      blankToUndefined,
      z.coerce.number().int().min(1_000).max(60_000).default(10_000),
    ),
    TRUST_PROXY: z.preprocess(
      blankToUndefined,
      z.enum(["true", "false"]).default("false"),
    ),
  })
  .strict();

function normalizeHttpOrigin(value: string): string {
  if (/[^\x20-\x7e]/u.test(value) || value === "*" || value.toLowerCase() === "null") {
    throw new ApplicationError("INTERNAL_ERROR");
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ApplicationError("INTERNAL_ERROR");
  }

  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash ||
    value !== parsed.origin
  ) {
    throw new ApplicationError("INTERNAL_ERROR");
  }

  return parsed.origin;
}

function parseAllowedOrigins(value: string): readonly string[] {
  if (!value.trim()) return [];

  return [...new Set(value.split(",").map((origin) => normalizeHttpOrigin(origin.trim())))];
}

export function parseApiSecurityConfig(
  input: ApiSecurityEnvironmentInput,
): ApiSecurityConfig {
  const parsed = environmentSchema.safeParse(input);
  if (!parsed.success) {
    throw new ApplicationError("INTERNAL_ERROR");
  }

  const appBaseUrl = normalizeHttpOrigin(parsed.data.APP_BASE_URL);
  if (parsed.data.APP_ENV !== "development" && !appBaseUrl.startsWith("https://")) {
    throw new ApplicationError("INTERNAL_ERROR");
  }

  const windowMs = parsed.data.RATE_LIMIT_WINDOW_MS;
  return {
    allowedOrigins: parseAllowedOrigins(parsed.data.FRONTEND_ALLOWED_ORIGINS),
    appBaseUrl,
    appEnv: parsed.data.APP_ENV,
    maxJsonBodyBytes: parsed.data.API_MAX_JSON_BODY_BYTES,
    rateLimits: {
      api: { limit: parsed.data.RATE_LIMIT_API_MAX_REQUESTS, windowMs },
      auth: { limit: parsed.data.RATE_LIMIT_AUTH_MAX_REQUESTS, windowMs },
      mutation: {
        limit: parsed.data.RATE_LIMIT_MUTATION_MAX_REQUESTS,
        windowMs,
      },
      spatial: {
        limit: parsed.data.RATE_LIMIT_SPATIAL_MAX_REQUESTS,
        windowMs,
      },
    },
    supabaseRequestTimeoutMs: parsed.data.SUPABASE_REQUEST_TIMEOUT_MS,
    trustProxy: parsed.data.TRUST_PROXY === "true",
  };
}

export function loadApiSecurityConfig(): ApiSecurityConfig {
  return parseApiSecurityConfig({
    API_MAX_JSON_BODY_BYTES: process.env.API_MAX_JSON_BODY_BYTES,
    APP_BASE_URL: process.env.APP_BASE_URL,
    APP_ENV: process.env.APP_ENV,
    FRONTEND_ALLOWED_ORIGINS: process.env.FRONTEND_ALLOWED_ORIGINS,
    RATE_LIMIT_API_MAX_REQUESTS: process.env.RATE_LIMIT_API_MAX_REQUESTS,
    RATE_LIMIT_AUTH_MAX_REQUESTS: process.env.RATE_LIMIT_AUTH_MAX_REQUESTS,
    RATE_LIMIT_MUTATION_MAX_REQUESTS:
      process.env.RATE_LIMIT_MUTATION_MAX_REQUESTS,
    RATE_LIMIT_SPATIAL_MAX_REQUESTS:
      process.env.RATE_LIMIT_SPATIAL_MAX_REQUESTS,
    RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
    SUPABASE_REQUEST_TIMEOUT_MS: process.env.SUPABASE_REQUEST_TIMEOUT_MS,
    TRUST_PROXY: process.env.TRUST_PROXY,
  });
}
