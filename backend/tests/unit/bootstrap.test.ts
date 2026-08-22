import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  bootstrapBackend,
  type BackendBootstrapResult,
} from "@/src/config/bootstrap";
import { DatabaseUnavailableError } from "@/src/lib/errors";
import type { Logger } from "@/src/lib/logger";

function createCapturingLogger(messages: string[]): Logger {
  return {
    error: (message) => messages.push(`error:${message}`),
    info: (message) => messages.push(`info:${message}`),
  };
}

describe("backend bootstrap", () => {
  it("logs database connected only after the real health dependency succeeds", async () => {
    const messages: string[] = [];
    const result = await bootstrapBackend({
      configureSupabase: () => undefined,
      loadEnvironment: () => undefined,
      logger: createCapturingLogger(messages),
      runHealthCheck: async () => ({ database: "connected" }),
    });

    expect(result).toEqual<BackendBootstrapResult>({ database: "connected" });
    expect(messages).toEqual([
      "info:Starting backend...",
      "info:Environment loaded",
      "info:Supabase configured",
      "info:Database connected",
      "info:Environment: test",
      "info:Backend ready",
    ]);
  });

  it("reports a sanitized database failure without claiming success", async () => {
    const messages: string[] = [];
    const result = await bootstrapBackend({
      configureSupabase: () => undefined,
      loadEnvironment: () => undefined,
      logger: createCapturingLogger(messages),
      runHealthCheck: async () => {
        throw new DatabaseUnavailableError();
      },
    });

    expect(result).toEqual<BackendBootstrapResult>({ database: "unavailable" });
    expect(messages).toContain("error:Database connection failed");
    expect(messages).not.toContain("info:Database connected");
  });
});
