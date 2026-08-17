import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  DEFAULT_MAPID_MAX_ATTEMPTS,
  DEFAULT_MAPID_RETRY_BASE_DELAY_MS,
  DEFAULT_MAPID_TIMEOUT_MS,
  parseMapidProviderConfig,
} from "@/src/integrations/mapid/mapid.config";
import { MapidError } from "@/src/integrations/mapid/mapid.errors";

describe("MAPID provider configuration", () => {
  it("parses server-only values, normalizes the base URL, and applies bounded defaults", () => {
    expect(
      parseMapidProviderConfig({
        MAPID_API_KEY: "TEST_CREDENTIAL",
        MAPID_BASE_URL: "https://mapid.test.invalid/",
        MAPID_TIMEOUT_MS: " ",
      }),
    ).toEqual({
      apiKey: "TEST_CREDENTIAL",
      baseUrl: "https://mapid.test.invalid",
      retry: {
        baseDelayMs: DEFAULT_MAPID_RETRY_BASE_DELAY_MS,
        maxAttempts: DEFAULT_MAPID_MAX_ATTEMPTS,
      },
      timeoutMs: DEFAULT_MAPID_TIMEOUT_MS,
    });
  });

  it("accepts an explicit timeout within the configured bounds", () => {
    expect(
      parseMapidProviderConfig({
        MAPID_API_KEY: "TEST_CREDENTIAL",
        MAPID_BASE_URL: "https://mapid.test.invalid/provider-root",
        MAPID_TIMEOUT_MS: "2500",
      }),
    ).toMatchObject({
      baseUrl: "https://mapid.test.invalid/provider-root",
      timeoutMs: 2_500,
    });
  });

  it.each([
    "http://mapid.test.invalid",
    "https://fixture-user:fixture-password@mapid.test.invalid",
    "https://mapid.test.invalid?credential=TEST_CREDENTIAL",
    "https://mapid.test.invalid#fixture-fragment",
  ])("rejects unsafe provider URL configuration: %s", (baseUrl) => {
    expect(() =>
      parseMapidProviderConfig({
        MAPID_API_KEY: "TEST_CREDENTIAL",
        MAPID_BASE_URL: baseUrl,
      }),
    ).toThrowError(
      expect.objectContaining({ code: "MAPID_CONFIGURATION_ERROR" }),
    );
  });

  it.each(["99", "120001", "1.5", "not-a-number"])(
    "rejects an invalid timeout without exposing configuration: %s",
    (timeout) => {
      expect(() =>
        parseMapidProviderConfig({
          MAPID_API_KEY: "TEST_CREDENTIAL",
          MAPID_BASE_URL: "https://mapid.test.invalid",
          MAPID_TIMEOUT_MS: timeout,
        }),
      ).toThrowError(
        expect.objectContaining({ code: "MAPID_CONFIGURATION_ERROR" }),
      );
    },
  );

  it("fails closed for missing configuration without echoing the credential", () => {
    const credential = "TEST_CREDENTIAL_MUST_NOT_LEAK";
    let thrown: unknown;

    try {
      parseMapidProviderConfig({ MAPID_API_KEY: credential });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(MapidError);
    expect(thrown).toMatchObject({
      code: "MAPID_CONFIGURATION_ERROR",
      message: "MAPID integration is not configured",
      retryable: false,
    });
    expect(String(thrown)).not.toContain(credential);
  });
});
