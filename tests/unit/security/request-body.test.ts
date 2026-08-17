import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createErrorResponse } from "@/src/lib/api-response";
import type { ApplicationError } from "@/src/lib/errors";
import { readBoundedJsonBody } from "@/src/lib/request-body";
import { readBoundedJsonBody as readSpatialBoundedJsonBody } from "@/src/lib/spatial/request";

const TEST_REQUEST_ID = "db991862-1c66-4ed0-a034-279fee4efba3";

async function captureRejected(operation: Promise<unknown>): Promise<ApplicationError> {
  try {
    await operation;
  } catch (error) {
    return error as ApplicationError;
  }
  throw new Error("TEST expected operation to reject");
}

function jsonRequest(
  body?: BodyInit,
  headers: HeadersInit = { "content-type": "application/json" },
): Request {
  return new Request("http://localhost/api/test-body", {
    body,
    headers,
    method: "POST",
  });
}

describe("bounded JSON request body reader", () => {
  it.each([
    undefined,
    "text/plain",
    "application/jsonp",
    "application/x-www-form-urlencoded",
  ])("requires application/json instead of %s", async (contentType) => {
    const headers = new Headers();
    if (contentType) headers.set("content-type", contentType);
    const error = await captureRejected(
      readBoundedJsonBody(jsonRequest("{}", headers), 100),
    );

    expect(error).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("accepts valid UTF-8 JSON with a charset parameter", async () => {
    const value = {
      fixture: "TEST REQUEST BODY",
      nested: { enabled: true },
    };
    const request = jsonRequest(JSON.stringify(value), {
      "content-type": "application/json; charset=utf-8",
    });

    await expect(readBoundedJsonBody(request, 1_024)).resolves.toEqual(value);
  });

  it.each([
    { label: "missing body", body: undefined },
    { label: "empty body", body: "" },
    { label: "malformed JSON", body: "{\"fixture\":" },
  ])("rejects a $label", async ({ body }) => {
    const error = await captureRejected(
      readBoundedJsonBody(jsonRequest(body), 1_024),
    );

    expect(error).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rejects a body above the declared content-length cap", async () => {
    const request = jsonRequest("{}", {
      "content-length": "101",
      "content-type": "application/json",
    });
    const error = await captureRejected(readBoundedJsonBody(request, 100));

    expect(error).toMatchObject({
      code: "REQUEST_TOO_LARGE",
      message: "Request body is too large",
    });
  });

  it("enforces the cap against streamed bytes when no length is declared", async () => {
    const body = JSON.stringify({ fixture: "x".repeat(128) });
    const request = jsonRequest(body);
    expect(request.headers.get("content-length")).toBeNull();

    const error = await captureRejected(readBoundedJsonBody(request, 32));

    expect(error).toMatchObject({ code: "REQUEST_TOO_LARGE" });
  });

  it("maps the same byte cap to the spatial-specific error contract", async () => {
    const request = jsonRequest(JSON.stringify({ fixture: "x".repeat(64) }));
    const error = await captureRejected(
      readSpatialBoundedJsonBody(request, 16),
    );

    expect(error).toMatchObject({
      code: "SPATIAL_REQUEST_TOO_LARGE",
      message: "Spatial request body is too large",
    });
  });

  it("rejects invalid UTF-8 before JSON parsing", async () => {
    const invalidUtf8 = new Uint8Array([0x7b, 0x22, 0xc3, 0x28, 0x22, 0x7d]);
    const error = await captureRejected(
      readBoundedJsonBody(jsonRequest(invalidUtf8), 100),
    );

    expect(error).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("never serializes malformed secret-bearing body content", async () => {
    const secretBody =
      '{"password":"TEST-SECRET-MUST-NOT-LEAK","broken":';
    const error = await captureRejected(
      readBoundedJsonBody(jsonRequest(secretBody), 1_024),
    );
    const response = createErrorResponse(TEST_REQUEST_ID, error);
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        retryable: false,
      },
      request_id: TEST_REQUEST_ID,
      success: false,
    });
    expect(serialized).not.toContain("TEST-SECRET-MUST-NOT-LEAK");
    expect(serialized).not.toContain("password");
    expect(serialized).not.toContain("broken");
    expect(serialized).not.toContain("stack");
  });
});
