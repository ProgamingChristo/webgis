import { describe, expect, it } from "vitest";

import { createErrorResponse, createSuccessResponse } from "@/src/lib/api-response";
import { ApplicationError } from "@/src/lib/errors";
import { getRequestId } from "@/src/lib/request-id";

describe("request IDs and API response envelopes", () => {
  it("reuses a valid request ID and emits it in a success response", async () => {
    const requestId = "db991862-1c66-4ed0-a034-279fee4efba3";
    const request = new Request("http://localhost/api/health", {
      headers: { "x-request-id": requestId },
    });

    expect(getRequestId(request)).toBe(requestId);

    const response = createSuccessResponse(requestId, { database: "connected" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("x-request-id")).toBe(requestId);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { database: "connected" },
      request_id: requestId,
    });
  });

  it("replaces unsafe request IDs and never serializes internal error details", async () => {
    const request = new Request("http://localhost/api/health", {
      headers: { "x-request-id": "unsafe-header-value" },
    });
    const requestId = getRequestId(request);
    const internalDetail = "sb_publishable_fake SQL detail";
    const response = createErrorResponse(
      requestId,
      new ApplicationError("DATABASE_UNAVAILABLE", internalDetail, true),
    );
    const body = await response.json();

    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(response.status).toBe(503);
    expect(body).toEqual({
      success: false,
      error: {
        code: "DATABASE_UNAVAILABLE",
        message: "Database connection failed",
        retryable: true,
      },
      request_id: expect.any(String),
    });
    expect(JSON.stringify(body)).not.toContain(internalDetail);
  });
});
