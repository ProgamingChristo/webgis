import "server-only";

import { isIP } from "node:net";

import type { NextRequest } from "next/server";

import {
  loadApiSecurityConfig,
  type ApiSecurityConfig,
} from "@/src/lib/api-security/config";
import { RateLimitExceededError } from "@/src/lib/errors";

export interface RateLimiter {
  checkLimit(req: NextRequest, identifier: string): Promise<void>;
}

export class NoOpRateLimiter implements RateLimiter {
  async checkLimit(req: NextRequest, identifier: string): Promise<void> {
    void req;
    void identifier;
    return Promise.resolve();
  }
}

type RateLimitPolicy = keyof ApiSecurityConfig["rateLimits"];
type RateLimitSecurityConfig = Pick<
  ApiSecurityConfig,
  "rateLimits" | "trustProxy" | "appEnv"
>;

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export interface InMemoryRateLimiterOptions {
  config?: RateLimitSecurityConfig | (() => RateLimitSecurityConfig);
  clock?: () => number;
  maxBuckets?: number;
}

const DEFAULT_MAX_BUCKETS = 10_000;
const SHARED_UNTRUSTED_CLIENT = "shared-untrusted-client";

function selectPolicy(identifier: string): RateLimitPolicy {
  if (identifier.startsWith("auth:register")) {
    return "auth_register";
  }

  if (identifier.startsWith("auth:login")) {
    return "auth_login";
  }

  if (identifier.startsWith("auth:")) {
    return "auth_general";
  }

  if (identifier.includes(":spatial:")) {
    return "spatial";
  }

  if (identifier.includes(":ai:")) {
    return "ai";
  }

  if (identifier.includes(":mutation:")) {
    return "mutation";
  }

  return "api";
}

function getTrustedClientIp(req: NextRequest, config: RateLimitSecurityConfig): string | null {
  let candidate = "";

  if (config.trustProxy) {
    const forwardedFor = req.headers.get("x-forwarded-for");
    candidate =
      forwardedFor?.split(",", 1)[0]?.trim() ??
      req.headers.get("x-real-ip")?.trim() ??
      "";
  }

   
  if (!candidate && (req as any).ip) {
     
    candidate = (req as any).ip;
  }
  
  if (!candidate && config.appEnv === "development") {
    // In local development Next.js dev server, req.ip might be undefined
    // but the headers might contain the local IP, or we can fallback to localhost loopback
    const forwardedFor = req.headers.get("x-forwarded-for");
    candidate = forwardedFor?.split(",", 1)[0]?.trim() ?? "127.0.0.1";
  }

  return isIP(candidate) === 0 ? null : candidate;
}

function resolveConfig(
  config: RateLimitSecurityConfig | (() => RateLimitSecurityConfig),
): RateLimitSecurityConfig {
  return typeof config === "function" ? config() : config;
}

/**
 * A bounded, process-local fixed-window rate limiter.
 *
 * This provides real enforcement for a single GETRA server instance. A shared
 * store remains necessary when requests are distributed across multiple
 * replicas.
 */
export class InMemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, RateLimitBucket>();
  private readonly config:
    | RateLimitSecurityConfig
    | (() => RateLimitSecurityConfig);
  private readonly clock: () => number;
  private readonly maxBuckets: number;

  constructor(options: InMemoryRateLimiterOptions = {}) {
    this.config = options.config ?? loadApiSecurityConfig;
    this.clock = options.clock ?? Date.now;
    this.maxBuckets = options.maxBuckets ?? DEFAULT_MAX_BUCKETS;

    if (!Number.isSafeInteger(this.maxBuckets) || this.maxBuckets < 1) {
      throw new TypeError("maxBuckets must be a positive safe integer");
    }
  }

  async checkLimit(req: NextRequest, identifier: string): Promise<void> {
    const config = resolveConfig(this.config);
    const policy = selectPolicy(identifier);
    const rule = config.rateLimits[policy];
    const now = this.clock();
    const key = this.createBucketKey(req, identifier, policy, config);

    this.removeExpiredBuckets(now);

    const current = this.buckets.get(key);
    if (!current) {
      this.ensureCapacity();
      this.buckets.set(key, {
        count: 1,
        resetAt: now + rule.windowMs,
      });
      return;
    }

    if (current.count >= rule.limit) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((current.resetAt - now) / 1_000),
      );
      throw new RateLimitExceededError(retryAfterSeconds);
    }

    current.count += 1;
  }

  get bucketCount(): number {
    return this.buckets.size;
  }

  private createBucketKey(
    req: NextRequest,
    identifier: string,
    policy: RateLimitPolicy,
    config: RateLimitSecurityConfig,
  ): string {
    if (!policy.startsWith("auth")) {
      return `${policy}:${identifier}`;
    }

    const client = getTrustedClientIp(req, config) ?? SHARED_UNTRUSTED_CLIENT;
    return `${policy}:${identifier}:${client}`;
  }

  private removeExpiredBuckets(now: number): void {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }

  private ensureCapacity(): void {
    if (this.buckets.size < this.maxBuckets) {
      return;
    }

    const oldestKey = this.buckets.keys().next().value as string | undefined;
    if (oldestKey) {
      this.buckets.delete(oldestKey);
    }
  }
}

// The default route dependency performs real, process-local enforcement.
export const rateLimiter: RateLimiter = new InMemoryRateLimiter();
