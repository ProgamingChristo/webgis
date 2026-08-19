import { describe, expect, it } from "vitest";

import { createErrorResponse } from "@/src/lib/api-response";
import { RateLimitExceededError } from "@/src/lib/errors";

const TEST_REQUEST_ID = "db991862-1c66-4ed0-a034-279fee4efba3";

describe("rate-limit API response", () => {
  it("returns a safe retryable 429 envelope and Retry-After header", async () => {
    const response = createErrorResponse(
      TEST_REQUEST_ID,
      new RateLimitExceededError(17),
    );
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("17");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-request-id")).toBe(TEST_REQUEST_ID);
    expect(body).toEqual({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        details: {
          source: "GETRA_RATE_LIMIT",
        },
        message: "Too many requests. Please try again later",
        retryable: true,
      },
      request_id: TEST_REQUEST_ID,
      success: false,
    });
    expect(JSON.stringify(body)).not.toContain("stack");
  });
});
