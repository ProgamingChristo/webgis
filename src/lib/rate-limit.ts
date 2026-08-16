import { NextRequest } from "next/server";

export interface RateLimiter {
  checkLimit(req: NextRequest, identifier: string): Promise<void>;
}

export class NoOpRateLimiter implements RateLimiter {
  async checkLimit(req: NextRequest, identifier: string): Promise<void> {
    // Phase 3 Foundation: Abstract implementation.
    // Replace with Redis or similar when required in production.
    void req;
    void identifier;
    return Promise.resolve();
  }
}

// Default exported singleton for immediate use in routes
export const rateLimiter = new NoOpRateLimiter();
