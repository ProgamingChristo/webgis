import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createHealthHandler } from "@/app/api/health/route";
import { DatabaseUnavailableError } from "@/src/lib/errors";
import type { HealthChecker } from "@/src/services/health.service";

describe("GET /api/health", () => {
  it("returns the connected envelope with a request ID", async () => {
    const healthService: HealthChecker = {
      check: vi.fn().mockResolvedValue({
        database: "connected",
        service: "getra-api",
        status: "ok",
      }),
    };
    const handler = createHealthHandler(healthService);
    const requestId = "db991862-1c66-4ed0-a034-279fee4efba3";

    const response = await handler(
      new Request("http://localhost/api/health", {
        headers: { "x-request-id": requestId },
      }),
    );

    const json = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(json).toEqual({
      success: true,
      data: {
        database: "connected",
        service: "getra-api",
        status: "ok",
      },
      request_id: requestId,
    });
    expect(healthService.check).toHaveBeenCalledOnce();
  });

  it("returns a safe 503 envelope when the database is unavailable", async () => {
    const healthService: HealthChecker = {
      check: vi.fn().mockRejectedValue(new DatabaseUnavailableError()),
    };
    const handler = createHealthHandler(healthService);

    const response = await handler(new Request("http://localhost/api/health"));
    const json = await response.json();

    expect(response.status).toBe(503);
    expect(json).toEqual({
      success: false,
      error: {
        code: "DATABASE_UNAVAILABLE",
        message: "Database connection failed",
        retryable: true,
      },
      request_id: expect.any(String),
    });
    expect(json).toHaveProperty("request_id");
    expect(JSON.stringify(json)).not.toContain("stack");
  });
});
